'use strict';
// The connector reads the same environment variables as server.js. (Before, connect() referred to these two names
// without ever defining them here, so a connect call with an empty username/key crashed and left the connector stuck.)
const DEFAULT_TIKTOK_USERNAME = String(process.env.TIKTOK_USERNAME || '').replace('@', '').trim();
const DEFAULT_SIGN_API_KEY = String(process.env.EULERSTREAM_SIGN_API_KEY || process.env.TIKTOK_SIGN_API_KEY || '').trim();

function createTikTokConnector(onChat, onStatus, onRawEvent) {
  var TikTokLiveConnection = null;
  var WebcastEvent = null;
  var SignConfig = null;
  var activeConnection = null;
  var retryCount = 0;
  var MAX_INITIAL_RETRIES = 3;

  // ---- Connection-health tracking -----------------------------------------
  // The single biggest real-world failure mode of this kind of reverse-
  // engineered WebSocket connection is a "zombie" connection: the socket
  // never receives a clean close, so the library never fires 'disconnected'
  // or 'error', and the host console keeps showing "Connected!" forever even
  // though no viewer comment is getting through any more. The only reliable
  // way to catch this is to track when ANY data last arrived (not just chat -
  // the viewer-count/"roomUser" event alone pings in constantly on a healthy
  // connection) and force a fresh reconnect if it's gone quiet for too long.
  var desiredConnected = false; // true once the host asks to connect, until they explicitly disconnect
  var lastUsername = null;
  var lastSignApiKey = null;
  var lastActivityAt = 0;
  var reconnectTimer = null;
  var watchdogTimer = null;
  var reconnectAttempt = 0;
  var isConnecting = false; // guards against two connect() calls racing each other
  var attemptSeq = 0;        // bumped by every new connect() and by disconnect(); an old attempt that sees a newer number stops quietly
  var pendingConnection = null; // the connection that is being opened right now (chat that arrives a moment before connect() resolves still counts)
  var CONNECT_TIMEOUT_MS = 25000; // a connect() that never answers becomes a clear "timed out" failure instead of "Connecting..." forever

  var WATCHDOG_CHECK_MS = 20000;    // how often we check for a stalled connection
  var WATCHDOG_STALE_MS = 120000;   // no data AT ALL for this long while "connected" = assume it's dead
  var RECONNECT_BASE_DELAY_MS = 3000;
  var RECONNECT_MAX_DELAY_MS = 30000;
  var RATE_LIMIT_DEFAULT_COOLDOWN_MS = 60000; // used when a 429 doesn't tell us how long to wait

  // ---------------------------------------------------------------------
  // FAILSAFE LOGGING: root-caused a real incident where the console only
  // ever showed `[TikTok connector] first time seeing event: "error"` on
  // repeat, with the actual reason invisible - because the underlying
  // error was only ever handed to onStatus() (which goes to the browser),
  // never to console.error(). That made a real bug (see below) look like
  // an unexplainable mystery from the Render logs alone.
  //
  // This helper is now the ONLY place that reports a connector failure,
  // and it always prints everything the error object has - message, name,
  // any HTTP status/retry-after info the library attaches, and the stack -
  // so the real cause is on the screen (Render logs) the moment it happens,
  // not just in a toast that scrolled away.
  // ---------------------------------------------------------------------
  function describeError(err) {
    if (!err) return { message: "Unknown error (no error object was provided).", retryAfterMs: null };
    var parts = [];
    var name = err.name || (err.constructor && err.constructor.name) || "Error";
    var message = err.message || String(err);
    parts.push(name + ": " + message);

    // tiktok-live-connector's SignatureRateLimitError (and similar) attach
    // rate-limit metadata under a few different possible shapes depending
    // on version. We check all of them rather than assuming one.
    var retryAfterMs = null;
    var candidates = [
      err.retryAfter, err.retry_after,
      err.response && err.response.headers && err.response.headers["retry-after"],
      err.headers && err.headers["retry-after"]
    ];
    for (var i = 0; i < candidates.length; i++) {
      var v = candidates[i];
      if (v !== undefined && v !== null && !isNaN(Number(v))) {
        retryAfterMs = Number(v) * 1000;
        parts.push("retry-after: " + v + "s");
        break;
      }
    }
    if (err.code) parts.push("code: " + err.code);
    if (err.response && err.response.status) parts.push("http status: " + err.response.status);

    var isRateLimit =
      /rate ?limit/i.test(name) || /rate ?limit/i.test(message) ||
      (err.response && err.response.status === 429) ||
      /429/.test(message);

    return {
      message: parts.join(" | "),
      retryAfterMs: retryAfterMs,
      isRateLimit: isRateLimit,
      stack: err.stack || null
    };
  }

  function reportFailure(context, err) {
    var info = describeError(err);
    // Always goes to the Render/console logs, in full - this is the fix for
    // "the real reason never showed up anywhere".
    console.error("[TikTok connector] " + context + ": " + info.message);
    if (info.stack) console.error(info.stack);
    return info;
  }

  // Every status the game shows goes through here. The 3rd argument carries the plain-language reason + advice for the
  // connection window: { code, reason, hint, detail, attempt, retryInSeconds, roomId }.
  function emit(status, message, info) {
    try { onStatus(status, message, info || null); } catch (e) { console.error("[TikTok connector] status handler error - swallowed", e); }
  }

  // Turns a raw library error into something a host can act on.
  // fatal = retrying cannot help (wrong key / wrong username), so the connector stops instead of hammering EulerStream.
  function classifyError(err, username) {
    var name = (err && (err.name || (err.constructor && err.constructor.name))) || "";
    var msg = String((err && err.message) || err || "");
    var status = err && ((err.response && err.response.status) || err.status || err.statusCode);
    var text = name + " " + msg;
    var who = username ? "@" + username : "This account";
    var detail = (name ? name + ": " : "") + msg.slice(0, 300);
    if (err && err.code === "CONNECT_TIMEOUT") {
      return { code: "TIMEOUT", fatal: false, detail: detail,
        reason: "TikTok did not answer within " + Math.round(CONNECT_TIMEOUT_MS / 1000) + " seconds.",
        hint: "Usually a slow or blocked connection, or TikTok / EulerStream is busy. The game will try again by itself." };
    }
    if (/UserOffline|not (currently )?live|isn'?t (currently )?live|is offline|live (has )?ended|hosting a live|no (active )?(live|room)/i.test(text)) {
      return { code: "USER_OFFLINE", fatal: false, detail: detail,
        reason: who + " is not LIVE right now.",
        hint: "Start your TikTok LIVE first. The game keeps checking and connects by itself the moment you go live." };
    }
    if (/InvalidUniqueId|user ?not ?found|unable to find (the )?user|could not find (the )?user|no such user|invalid (unique ?id|user ?name)/i.test(text)) {
      return { code: "USER_NOT_FOUND", fatal: true, detail: detail,
        reason: "TikTok could not find a user named @" + (username || "?") + ".",
        hint: "Check the spelling of your TikTok username (without the @) and try again." };
    }
    if (/rate ?limit|too many requests|429/i.test(text) || status === 429) {
      return { code: "RATE_LIMIT", fatal: false, detail: detail,
        reason: "EulerStream says too many requests were made (rate limit).",
        hint: "Wait a minute. The game slows down and retries by itself. Avoid pressing Connect repeatedly; a free key has a small hourly allowance." };
    }
    if (status === 401 || status === 403 || /api ?key|apikey|unauthori[sz]ed|forbidden|invalid (key|token)|not authenticated|authentication/i.test(text)) {
      return { code: "BAD_KEY", fatal: true, detail: detail,
        reason: "EulerStream rejected the Sign API Key" + (status ? " (HTTP " + status + ")" : "") + ".",
        hint: "Copy the key again from eulerstream.com (no spaces) and paste it in the connection window, or fix EULERSTREAM_SIGN_API_KEY on the server." };
    }
    if (/ENOTFOUND|ECONNREFUSED|ECONNRESET|EAI_AGAIN|ETIMEDOUT|ENETUNREACH|EHOSTUNREACH|network|fetch failed|socket hang up|getaddrinfo/i.test(text)) {
      return { code: "NETWORK", fatal: false, detail: detail,
        reason: "The server could not reach TikTok / EulerStream (network problem).",
        hint: "Check that the server has internet access. The game will try again by itself." };
    }
    if (/NoWSUpgrade|websocket upgrade|upgrade (failed|error)|websocket/i.test(text)) {
      return { code: "WS_REFUSED", fatal: false, detail: detail,
        reason: "TikTok refused the live chat connection.",
        hint: "Make sure you are LIVE and the Sign API Key is valid. If it keeps happening, wait a few minutes and try again." };
    }
    return { code: "UNKNOWN", fatal: false, detail: detail,
      reason: "Could not connect: " + (msg.slice(0, 160) || "unknown error") + ".",
      hint: "Check the username and Sign API Key, make sure you are LIVE, then try again. The full error is in the server log." };
  }

  function withTimeout(promise, ms) {
    var timer;
    var timeout = new Promise(function (_, reject) {
      timer = setTimeout(function () { var e = new Error("Timed out waiting for TikTok to answer."); e.code = "CONNECT_TIMEOUT"; reject(e); }, ms);
    });
    return Promise.race([promise, timeout]).then(function (v) { clearTimeout(timer); return v; }, function (e) { clearTimeout(timer); throw e; });
  }

  async function loadLibrary() {
    if (TikTokLiveConnection) return;
    var lib = await import("tiktok-live-connector");
    var mod = lib && lib.default ? Object.assign({}, lib, lib.default) : lib;
    TikTokLiveConnection = mod.TikTokLiveConnection || mod.WebcastPushConnection;
    WebcastEvent = mod.WebcastEvent;
    SignConfig = mod.SignConfig || null;
    if (!TikTokLiveConnection) {
      throw new Error("Could not find a connection class in the tiktok-live-connector package.");
    }
  }

  // Pulls plain text out of whatever shape a "comment"-like field turns out
  // to be. Most of the time it's a plain string, but some payload variants
  // (rich text with mentions/stickers) represent it as an array of text
  // "runs" (e.g. [{type:"text", text:"A5 7"}]) or a single nested object
  // instead. Handling those here means a correctly-typed guess never gets
  // silently dropped just because it arrived in an unexpected wrapper.
  function coerceCommentText(value) {
    if (value === null || typeof value === "undefined") return null;
    if (typeof value === "string") return value;
    if (Array.isArray(value)) {
      var joined = value
        .map(function (part) {
          if (typeof part === "string") return part;
          if (part && typeof part.text === "string") return part.text;
          if (part && typeof part.content === "string") return part.content;
          return "";
        })
        .join("");
      return joined || null;
    }
    if (typeof value === "object") {
      if (typeof value.text === "string") return value.text;
      if (typeof value.content === "string") return value.content;
    }
    return null;
  }

  // TikTok emotes (the small pictures viewers can put in a comment) arrive as a list with a picture link and the
  // position in the comment where each one belongs. Several library versions name the fields differently, so a
  // few shapes are tried. Anything that is not a normal web link is ignored.
  function extractEmotes(data) {
    var out = [];
    var list = data && (data.emotes || data.emoteList || data.emotesList);
    if (!Array.isArray(list)) return out;
    list.forEach(function (e) {
      if (!e || out.length >= 12) return;
      var url = null;
      function take(u) { if (!url && typeof u === "string" && /^https?:\/\//i.test(u)) url = u; }
      take(e.emoteImageUrl); take(e.imageUrl); take(e.url);
      var imgs = [e.image, e.emote && e.emote.image];
      imgs.forEach(function (im) {
        if (!im) return;
        take(im.imageUrl); take(im.url);
        var ul = im.urlList || im.urlListList || im.urls;
        if (Array.isArray(ul)) ul.forEach(take);
      });
      if (!url) return;
      var pos = e.placeInComment;
      if (typeof pos !== "number") pos = Number(pos);
      out.push({ pos: Number.isFinite(pos) ? pos : 0, url: url });
    });
    return out;
  }

  function extractChatFields(data) {
    if (!data) return null;
    var text = coerceCommentText(data.comment) ||
      coerceCommentText(data.text) ||
      coerceCommentText(data.message) ||
      coerceCommentText(data.content);
    // NOTE: this used to `return null` right here if no text field was
    // found, which silently discarded the WHOLE event - uniqueId, nickname,
    // everything - and meant it never showed up anywhere, not even as an
    // "unparsed" entry. Now we keep going and still return what we found,
    // with text left null; the caller treats a null text as an unparsed
    // guess but still counts and displays the event.

    // The exact shape of "who sent this" has changed across tiktok-live-
    // connector releases (nested under `.user`, flattened onto the message
    // itself, or both at once depending on version) so every known spot is
    // tried, in order, before giving up and lumping the viewer in as
    // "unknown" (their guess still counts, it just won't show a name).
    var uniqueId = "unknown";
    if (data.user && data.user.uniqueId) uniqueId = data.user.uniqueId;
    else if (data.user && data.user.id) uniqueId = data.user.id;
    else if (data.uniqueId) uniqueId = data.uniqueId;
    else if (data.userId) uniqueId = data.userId;

    var nickname = uniqueId;
    if (data.user && data.user.nickname) nickname = data.user.nickname;
    else if (data.user && data.user.nickName) nickname = data.user.nickName;
    else if (data.user && data.user.displayName) nickname = data.user.displayName;
    else if (data.nickname) nickname = data.nickname;
    else if (data.nickName) nickname = data.nickName;

    // TikTok's live-connector library has shipped several different shapes
    // for the viewer's profile picture across versions, so we try each of
    // the known spots and fall back to null (the client then draws a
    // generated circular initials avatar instead).
    var candidates = [];
    function pushUrl(u) {
      if (typeof u === "string" && /^https?:\/\//i.test(u) && candidates.indexOf(u) < 0) candidates.push(u);
    }
    function pushAll(obj, depth) {
      if (!obj || depth > 3) return;
      if (typeof obj === "string") { pushUrl(obj); return; }
      if (Array.isArray(obj)) { obj.forEach(function (o) { pushAll(o, depth + 1); }); return; }
      if (typeof obj === "object") {
        ["urlList", "urlListList", "urls", "url", "uri"].forEach(function (k) { if (obj[k]) pushAll(obj[k], depth + 1); });
      }
    }
    if (data.user) {
      ["profilePicture", "avatarThumbnail", "avatarThumb", "avatarMedium", "avatarLarger", "avatarLarge", "avatarUrl", "profilePictureUrl"]
        .forEach(function (k) { pushAll(data.user[k], 0); });
    }
    pushAll(data.avatarUrl, 0);
    pushAll(data.profilePictureUrl, 0);
    // Last resort: walk the whole user object for any link stored under a
    // key that looks like a photo (avatar / profile / picture / portrait).
    if (!candidates.length && data.user && typeof data.user === "object") {
      var seen = [];
      (function walk(o, depth, keyPath) {
        if (!o || depth > 5 || seen.indexOf(o) >= 0) return;
        if (typeof o === "object") seen.push(o);
        Object.keys(o).forEach(function (k) {
          var v = o[k];
          var kp = keyPath + "." + k;
          if (typeof v === "string") { if (/avatar|profile|picture|portrait/i.test(kp)) pushUrl(v); }
          else if (v && typeof v === "object") walk(v, depth + 1, kp);
        });
      })(data.user, 0, "user");
    }
    // Browsers other than Safari cannot show HEIC pictures, so links that are
    // not HEIC are tried first.
    candidates.sort(function (x, y) {
      var hx = /\.(heic|heif)(\?|$)/i.test(x) ? 1 : 0, hy = /\.(heic|heif)(\?|$)/i.test(y) ? 1 : 0;
      return hx - hy;
    });
    var avatarUrl = candidates.length ? candidates[0] : null;

    return { text: text === null ? null : String(text), emotes: extractEmotes(data), uniqueId: String(uniqueId), nickname: String(nickname), avatarUrl: avatarUrl ? String(avatarUrl) : null, avatarUrls: candidates };
  }

  // ---------------------------------------------------------------------
  // FAILSAFE: message de-duplication by a real ID, not object identity.
  //
  // The previous version used a WeakSet keyed on the raw event OBJECT to
  // avoid double-processing the same comment when it happened to fire
  // under two different event-name aliases. That only works if the
  // decoder always hands out a brand-new object per message - if any
  // version of the library ever reuses/mutates a buffer object across
  // consecutive messages (a common performance pattern in binary/protobuf
  // decoders), object-identity dedup would silently treat a second,
  // genuinely different comment as "already seen" and drop it. That is a
  // plausible explanation for "a correctly-formatted guess just never
  // showed up at all" - it wouldn't even a leave a console trace.
  //
  // This replaces it with dedup by the message's own ID (whichever field
  // the payload actually has), which is correct either way: it still
  // collapses true duplicate deliveries (a known behavior of at-least-once
  // WebSocket delivery, and of binding the same handler to multiple event
  // aliases), but it can never mistake two different comments for the same
  // one. IDs are remembered for a short TTL and the table is capped, so
  // this can never grow unbounded across a long stream.
  // ---------------------------------------------------------------------
  var seenMessageIds = new Map(); // id -> timestamp seen
  var DEDUP_TTL_MS = 15000;
  var DEDUP_MAX_ENTRIES = 2000;

  function extractMessageId(data) {
    if (!data) return null;
    var candidates = [
      data.msgId, data.messageId, data.id,
      data.common && data.common.msgId,
      data.common && data.common.msg_id
    ];
    for (var i = 0; i < candidates.length; i++) {
      var v = candidates[i];
      if (v !== undefined && v !== null && v !== "") return String(v);
    }
    return null; // no id available - caller falls back to processing it (never silently drops without one)
  }

  function isDuplicateMessage(id) {
    if (!id) return false; // nothing to key on - don't guess, just process it
    var now = Date.now();
    if (seenMessageIds.has(id)) {
      seenMessageIds.set(id, now); // refresh so a burst of true dupes stays deduped
      return true;
    }
    seenMessageIds.set(id, now);
    // Trim occasionally rather than every call - cheap amortized cleanup.
    if (seenMessageIds.size > DEDUP_MAX_ENTRIES) {
      for (var key of seenMessageIds.keys()) {
        if (now - seenMessageIds.get(key) > DEDUP_TTL_MS) seenMessageIds.delete(key);
      }
    }
    return false;
  }

  // FAILSAFE: full per-message payload dumps (JSON.stringify + two
  // console.log calls per comment) are useful while diagnosing a parsing
  // problem, but under a real, bursty live audience they add real CPU cost
  // on every single message - exactly when the event loop is busiest and
  // least able to spare it. Left on unconditionally, that's a plausible
  // contributor to "some correctly-formatted guesses just never registered"
  // under load. They're now opt-in via CHAT_DEBUG_LOG=true (set it in
  // Render's Environment tab, or a local .env, whenever you need to see
  // the raw payloads again) and OFF by default. The lightweight, always-on
  // path (rawEventCount/lastReceived/diagnostics panel) is untouched and
  // costs only a property assignment - that's the normal way to see what's
  // coming in.
  var CHAT_DEBUG_LOG = /^(1|true|yes)$/i.test(String(process.env.CHAT_DEBUG_LOG || ""));

  function markActivity() {
    lastActivityAt = Date.now();
  }

  // Newer tiktok-live-connector versions decode several protobuf fields
  // (userId, msgId, roomId, etc.) as native BigInt. JSON.stringify() throws
  // a hard TypeError ("Do not know how to serialize a BigInt") the instant
  // it meets one of those fields - it does not skip it or stringify it as
  // a number. A BigInt-aware replacer avoids that crash.
  function safeStringifyForLog(data) {
    try {
      return JSON.stringify(data, function (key, value) {
        return typeof value === "bigint" ? value.toString() : value;
      }).slice(0, 500);
    } catch (e) {
      return "[could not stringify chat payload for logging: " + (e && e.message ? e.message : e) + "]";
    }
  }

  // We previously bet everything on a single event name (WebcastEvent.CHAT,
  // falling back to the literal "chat"). If a future/older library build
  // fires chat messages under a different name than we expect, that single
  // listener silently never fires. So we bind the exact same handler to
  // every plausible alias: whatever WebcastEvent.CHAT resolves to, the
  // literal "chat", any other WebcastEvent key with "CHAT" in its name, and
  // a couple of literal names seen in other library forks.
  function collectChatAliases() {
    var aliases = ["chat"];
    if (WebcastEvent) {
      Object.keys(WebcastEvent).forEach(function (key) {
        if (!/chat/i.test(key)) return;
        var val = WebcastEvent[key];
        if (val && aliases.indexOf(val) === -1) aliases.push(val);
      });
    }
    ["WebcastChatMessage", "chatMessage", "member:chat"].forEach(function (name) {
      if (aliases.indexOf(name) === -1) aliases.push(name);
    });
    return aliases;
  }

  function wireEvents(connection) {
    // Diagnostic: logs the very first time we see each distinct event name
    // this connection ever emits. Confirmed working: Render logs showed
    // "chat" firing with real WebcastChatMessage payloads.
    try {
      var originalEmit = connection.emit.bind(connection);
      var seenEventNames = {};
      connection.emit = function (eventName) {
        if (!seenEventNames[eventName]) {
          seenEventNames[eventName] = true;
          console.log("[TikTok connector] first time seeing event: \"" + eventName + "\"");
        }
        return originalEmit.apply(null, arguments);
      };
    } catch (e) {
      console.error("[TikTok connector] could not install event-name logger - swallowed", e);
    }

    var chatAliases = collectChatAliases();
    chatAliases.forEach(function (chatEventName) {
      connection.on(chatEventName, function (data) {
        if (connection !== activeConnection && connection !== pendingConnection) return; // an old, already-closed connection
        // See "FAILSAFE: message de-duplication by a real ID" above for why
        // this replaced the old WeakSet-by-object-identity check.
        var msgId = extractMessageId(data);
        if (isDuplicateMessage(msgId)) return;
      // THE REAL BUG, FOUND FROM YOUR LOGS: chat events were confirmed
      // arriving (you saw "[TikTok raw chat event]" lines), but the
      // diagnostics counter never moved. That only happens if
      // extractChatFields() was returning null for every one of them - and
      // the old code only called onChat()/incremented the counter
      // `if (extracted)`, so a real, arriving-but-unparseable event was
      // completely invisible from the UI. There was no way to tell "nothing
      // is arriving" apart from "things are arriving but failing to parse."
      //
      // Fix, in two parts:
      //   1. extractChatFields() below now NEVER returns null - if it can't
      //      find comment text, it still returns the uniqueId/nickname it
      //      found (or "unknown") with text left null, and parseGuess()
      //      already handles null text fine (reports "unparsed").
      //   2. onChat() is now called UNCONDITIONALLY for every real event,
      //      so rawEventCount/lastReceived in the Settings panel will light
      //      up for every single chat event that reaches this handler -
      //      giving you a true, unambiguous signal from now on.
      markActivity();

      var extracted = null;
      try {
        extracted = extractChatFields(data);
      } catch (err) {
        console.error("[chat extraction error - swallowed, server kept running]", err);
      }

      try {
        onChat(extracted || { text: null, uniqueId: "unknown", nickname: "unknown", avatarUrl: null });
      } catch (err) {
        console.error("[onChat handler error - swallowed, server kept running]", err);
      }

      try {
        onRawEvent(data);
      } catch (err) {
        console.error("[onRawEvent error - swallowed, server kept running]", err);
      }

      // Full payload dumps are opt-in (CHAT_DEBUG_LOG=true) - see the note
      // above CHAT_DEBUG_LOG's definition. They stay available for the next
      // time something needs diagnosing, without costing anything on every
      // single comment during a normal live show.
      if (CHAT_DEBUG_LOG) {
        try {
          console.log(
            "[chat field probe] topLevelKeys=" + JSON.stringify(Object.keys(data || {})) +
            " typeof(data.comment)=" + typeof (data && data.comment) +
            " data.comment=" + JSON.stringify(data && data.comment) +
            " typeof(data.user)=" + typeof (data && data.user) +
            " userKeys=" + JSON.stringify(data && data.user ? Object.keys(data.user) : null) +
            " data.user.uniqueId=" + JSON.stringify(data && data.user && data.user.uniqueId)
          );
        } catch (err) {
          console.error("[chat field probe error - swallowed]", err && err.message ? err.message : err);
        }

        try {
          console.log("[TikTok raw chat event]", safeStringifyForLog(data));
        } catch (err) {
          console.error("[chat debug log error - swallowed, server kept running]", err);
        }
      }
      });
    });

    // These don't need to be parsed - they only exist here so the watchdog
    // below can tell a genuinely healthy-but-quiet chat (no one has typed a
    // guess in a while, but viewer-count/like/join pings keep arriving)
    // apart from a truly dead connection (nothing at all arrives, ever,
    // because the underlying WebSocket died without a clean close event -
    // a well-known failure mode of unofficial/reverse-engineered TikTok
    // WebSocket libraries). Wrapped individually so an unknown/renamed event
    // in a future library version can never throw or block the others.
    ["roomUser", "member", "like", "social", "gift", "rawData", "decodedData", "websocketData"].forEach(function (name) {
      try { connection.on(name, markActivity); } catch (e) {}
    });

    connection.on("disconnected", function (info) {
      if (connection !== activeConnection) return; // a connection we already replaced or closed on purpose
      activeConnection = null;
      stopWatchdog();
      var reasonSuffix = info && info.reason ? " (" + info.reason + ")" : "";
      console.log("[TikTok connector] disconnected event" + reasonSuffix);
      emit("disconnected", "Disconnected from TikTok LIVE." + reasonSuffix, { code: "DISCONNECTED", reason: "The connection to TikTok LIVE was closed" + reasonSuffix + ".", hint: "The game is reconnecting by itself." });
      scheduleReconnect("the connection was closed");
    });
    connection.on("streamEnd", function () {
      if (connection !== activeConnection) return;
      activeConnection = null;
      stopWatchdog();
      emit("disconnected", "The TikTok LIVE stream ended. Watching for it to start again...", { code: "STREAM_ENDED", reason: "Your TikTok LIVE has ended.", hint: "Start a new LIVE and the game reconnects by itself." });
      scheduleReconnect("the stream ended");
    });
    connection.on("error", function (err) {
      if (connection !== activeConnection) return; // errors while still connecting are handled by connect() itself
      var info = reportFailure("runtime error event", err);
      var cls = classifyError(err, lastUsername);
      emit("error", "Runtime error: " + info.message, cls);
      scheduleReconnect(info.isRateLimit ? "EulerStream rate-limited the request" : "a runtime error", { isRateLimit: info.isRateLimit, retryAfterMs: info.retryAfterMs, cls: cls });
    });
  }

  // ---- Watchdog: catches a "zombie" connection --------------------------
  // If the status says "Connected!" but literally nothing has arrived from
  // TikTok - not a chat message, not a viewer-count update, nothing - for
  // more than WATCHDOG_STALE_MS, the underlying socket is almost certainly
  // dead without ever having fired a 'disconnected' or 'error' event. This
  // is exactly the situation described as "status shows connected but
  // guesses stop working": the fix is to notice it ourselves and force a
  // fresh reconnect instead of waiting forever for an event that will never
  // come.
  function stopWatchdog() {
    if (watchdogTimer) { clearInterval(watchdogTimer); watchdogTimer = null; }
  }

  function startWatchdog() {
    stopWatchdog();
    watchdogTimer = setInterval(function () {
      if (!desiredConnected || !activeConnection) return;
      var quietForMs = Date.now() - lastActivityAt;
      if (quietForMs > WATCHDOG_STALE_MS) {
        console.error("[TikTok watchdog] no data at all for " + Math.round(quietForMs / 1000) + "s while marked connected - forcing a reconnect");
        emit("retrying", "Connection went quiet - reconnecting...", { code: "QUIET", reason: "No data has arrived from TikTok for a while.", hint: "Reconnecting by itself." });
        try { activeConnection.disconnect(); } catch (e) {}
        activeConnection = null;
        stopWatchdog();
        scheduleReconnect("no data was arriving");
      }
    }, WATCHDOG_CHECK_MS);
  }

  // ---- Reconnect scheduling ------------------------------------------------
  // Handles both "the connection dropped mid-stream" (watchdog/disconnected/
  // error above) and "the streamer isn't live yet / the first connect
  // attempt failed" (retry() below) with the same backing timer, so the game
  // can recover on its own - the whole point of "fully automated" - without
  // the host needing to notice and click Connect again.
  function cancelReconnectTimer() {
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  }

  function scheduleReconnect(reasonPhrase, errorInfo) {
    if (!desiredConnected) return; // the host explicitly disconnected - stay off
    cancelReconnectTimer();
    reconnectAttempt++;
    var delayMs = Math.min(RECONNECT_BASE_DELAY_MS * reconnectAttempt, RECONNECT_MAX_DELAY_MS);
    var cls = errorInfo && errorInfo.cls ? errorInfo.cls : null;

    // A rate-limit means "slow down" - honour the wait the provider asked for, otherwise use a long cooldown.
    if (errorInfo && errorInfo.isRateLimit) {
      delayMs = errorInfo.retryAfterMs && errorInfo.retryAfterMs > 0
        ? errorInfo.retryAfterMs + 1000
        : Math.max(RATE_LIMIT_DEFAULT_COOLDOWN_MS, delayMs);
    } else if (cls && cls.code === "USER_OFFLINE") {
      delayMs = Math.max(delayMs, 10000); // "not live yet": no need to ask more often than every ~10 s
    }

    var secs = Math.round(delayMs / 1000);
    var info = Object.assign({}, cls || { code: "RETRY", reason: "Lost connection (" + reasonPhrase + ").", hint: "Reconnecting by itself." }, { attempt: reconnectAttempt, retryInSeconds: secs });
    emit("retrying", "Not connected (" + reasonPhrase + "). Trying again in " + secs + "s (attempt " + reconnectAttempt + ")...", info);
    reconnectTimer = setTimeout(function () {
      reconnectTimer = null;
      if (!desiredConnected) return;
      connect(lastUsername, lastSignApiKey, true);
    }, delayMs);
  }

  async function connect(username, signApiKey, isAutoReconnect, fromRetry) {
    // Guard against overlapping connect() calls (double click, or a click landing on a scheduled reconnect).
    if (isConnecting) {
      console.warn("[TikTok connector] connect() called while a connection attempt was already in progress - ignoring the extra call.");
      return;
    }
    username = String(username || lastUsername || DEFAULT_TIKTOK_USERNAME || "").replace(/^@/, "").trim();
    signApiKey = String(signApiKey || lastSignApiKey || DEFAULT_SIGN_API_KEY || "").trim();
    lastUsername = username;
    lastSignApiKey = signApiKey;
    cancelReconnectTimer();
    stopWatchdog();
    if (!isAutoReconnect && !fromRetry) { retryCount = 0; reconnectAttempt = 0; }
    var mySeq = ++attemptSeq;
    if (activeConnection) {
      var old = activeConnection; activeConnection = null;
      try { old.disconnect(); } catch (e) {}
    }

    // Problems that no amount of retrying can fix are reported straight away, in plain words.
    if (!username) {
      desiredConnected = false;
      emit("error", "Missing TikTok username.", { code: "NO_USER", reason: "No TikTok username was entered.", hint: "Type your TikTok username (the one after the @) and press Connect." });
      return;
    }
    if (!/^[A-Za-z0-9._]{2,24}$/.test(username)) {
      desiredConnected = false;
      emit("error", "That does not look like a TikTok username.", { code: "BAD_USER", reason: "\"" + username.slice(0, 40) + "\" is not a valid TikTok username.", hint: "Use only letters, numbers, dots and underscores, without the @ and without spaces." });
      return;
    }
    if (!signApiKey) {
      desiredConnected = false;
      emit("error", "Missing Sign API Key.", { code: "NO_KEY", reason: "No EulerStream Sign API Key was provided.", hint: "Get a free key at eulerstream.com and paste it in the connection window, or set EULERSTREAM_SIGN_API_KEY on the server." });
      return;
    }

    desiredConnected = true;
    isConnecting = true;
    var connection = null, failure = null;
    try {
      emit("connecting", isAutoReconnect ? "Reconnecting to @" + username + " ..." : "Loading TikTok connector library...", { code: "CONNECTING", reason: "", hint: "", attempt: reconnectAttempt || retryCount || 0 });
      await loadLibrary();
      if (mySeq !== attemptSeq) return;
      if (SignConfig) SignConfig.apiKey = signApiKey; // covers versions that only read the global config
      emit("connecting", "Connecting to @" + username + " ...", { code: "CONNECTING", reason: "", hint: "", attempt: reconnectAttempt || retryCount || 0 });
      connection = new TikTokLiveConnection(username, { signApiKey: signApiKey });
      pendingConnection = connection;
      wireEvents(connection);
      var result = await withTimeout(connection.connect(), CONNECT_TIMEOUT_MS);
      if (mySeq !== attemptSeq || !desiredConnected) {   // the host pressed Disconnect (or Connect again) while we were waiting
        try { connection.disconnect(); } catch (e) {}
        return;
      }
      activeConnection = connection;
      retryCount = 0;
      reconnectAttempt = 0;
      markActivity();
      startWatchdog();
      var roomId = result && result.roomId ? String(result.roomId) : "";
      emit("connected", "Connected! Room ID: " + roomId, { code: "CONNECTED", reason: "", hint: "", roomId: roomId });
    } catch (err) {
      try { if (connection && connection !== activeConnection) connection.disconnect(); } catch (e) {}
      if (mySeq === attemptSeq) {
        var info = reportFailure("connect() failed for @" + username, err);
        failure = { info: info, cls: classifyError(err, username) };
      }
    } finally {
      if (pendingConnection === connection) pendingConnection = null;
      if (mySeq === attemptSeq) isConnecting = false;
    }

    if (!failure || mySeq !== attemptSeq) return;
    var cls = failure.cls;
    emit("error", "Connection failed: " + cls.reason, cls);
    if (cls.fatal) { desiredConnected = false; retryCount = 0; reconnectAttempt = 0; return; }   // wrong key / username: do not hammer the server
    if (isAutoReconnect || fromRetry || failure.info.isRateLimit || cls.code === "USER_OFFLINE") {
      scheduleReconnect("it could not connect", { isRateLimit: failure.info.isRateLimit, retryAfterMs: failure.info.retryAfterMs, cls: cls });
    } else {
      await retry(username, signApiKey, cls);
    }
  }

  // Three quick tries after the first failure, then slow background retries.
  async function retry(username, signApiKey, cls) {
    if (retryCount >= MAX_INITIAL_RETRIES) {
      retryCount = 0;
      // Keep trying slowly in the background so the show starts by itself once everything is right.
      scheduleReconnect("quick tries did not work", { cls: cls });
      return;
    }
    var seq = attemptSeq;
    retryCount++;
    var delayMs = 1500 * retryCount;
    emit("retrying", "Retry " + retryCount + " of " + MAX_INITIAL_RETRIES + " in " + (delayMs / 1000) + "s...", Object.assign({}, cls, { attempt: retryCount, retryInSeconds: delayMs / 1000 }));
    await new Promise(function (resolve) { setTimeout(resolve, delayMs); });
    if (seq !== attemptSeq || !desiredConnected) return;   // the host disconnected or reconnected meanwhile
    await connect(username, signApiKey, false, true);
  }

  function disconnect() {
    desiredConnected = false;
    isConnecting = false;
    attemptSeq++;
    retryCount = 0;
    reconnectAttempt = 0;
    cancelReconnectTimer();
    stopWatchdog();
    var conn = activeConnection, pend = pendingConnection;
    activeConnection = null; pendingConnection = null;
    [conn, pend].forEach(function (c) { try { if (c) c.disconnect(); } catch (err) { console.error("[disconnect error - swallowed]", err); } });
    emit("disconnected", "Disconnected.", { code: "DISCONNECTED", reason: "", hint: "" });
  }

  return { connect: connect, disconnect: disconnect };
}

module.exports = createTikTokConnector;
