'use strict';
module.exports = function attachAvatars(app) {
const AVATAR_HOST_RE = /(^|\.)(tiktokcdn[\w-]*\.com|byteimg\.com|ibyteimg\.com|ibytedtos\.com|tiktokv\.(com|us|eu)|muscdn\.com|byteoversea\.com|bytecdn\.[a-z]+)$/i;
const AVATAR_MAX_BYTES = 600 * 1024;
const AVATAR_MAX_ENTRIES = 800;
const AVATAR_REFRESH_MS = 6 * 60 * 60 * 1000;
const AVATAR_RETRY_MS = 60 * 1000;
const avatarStore = new Map();    // uniqueId -> { buf, type, pathKey, at }
const avatarPending = new Map();  // uniqueId -> Promise
const avatarVer = new Map();      // uniqueId -> number (changes when a new photo is fetched)
const avatarRaw = new Map();      // uniqueId -> last raw link (used only as a fallback redirect)
const avatarFailedAt = new Map(); // uniqueId -> time of last failed download

function isAllowedAvatarUrl(u) {
  try {
    const x = new URL(u);
    return x.protocol === 'https:' && AVATAR_HOST_RE.test(x.hostname);
  } catch (e) { return false; }
}
function avatarVariants(u) {
  const m = String(u).match(/^([^?#]*?)\.(heic|heif|avif|webp|jpe?g|png)(\?[^#]*)?$/i);
  if (m && /^(heic|heif|avif)$/i.test(m[2])) {
    const q = m[3] || '';
    return [m[1] + '.jpeg' + q, m[1] + '.webp' + q, m[1] + '.png' + q];
  }
  return [u];
}
async function downloadAvatar(urls) {
  const tried = new Set();
  for (const raw of urls) {
    if (!isAllowedAvatarUrl(raw)) continue;
    for (const v of avatarVariants(raw)) {
      if (tried.has(v)) continue;
      tried.add(v);
      try {
        const res = await fetch(v, {
          redirect: 'follow',
          signal: AbortSignal.timeout(6000),
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
            'Accept': 'image/jpeg,image/webp,image/png,image/*;q=0.8',
          },
        });
        if (!res.ok) continue;
        if (res.url && !isAllowedAvatarUrl(res.url)) continue;
        const type = String(res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
        if (!/^image\/(jpeg|png|webp|gif|avif)$/.test(type)) continue;
        const buf = Buffer.from(await res.arrayBuffer());
        if (!buf.length || buf.length > AVATAR_MAX_BYTES) continue;
        return { buf, type };
      } catch (e) { /* try the next variant */ }
    }
  }
  return null;
}
function avatarPathFor(uniqueId) {
  return '/avatar/' + encodeURIComponent(uniqueId) + '?t=' + (avatarVer.get(uniqueId) || 0);
}
// Called for every real viewer comment. Starts (or skips) the download and
// returns the address the page should use for this viewer's photo.
function registerAvatar(uniqueId, urls) {
  try {
    if (!uniqueId || uniqueId === 'unknown' || !urls || !urls.length) return null;
    const usable = urls.filter(isAllowedAvatarUrl);
    if (!usable.length) return urls[0] || null; // unknown host: let the browser try the link directly
    avatarRaw.set(uniqueId, usable[0]);
    const pathKey = usable[0].split('?')[0].replace(/\.(heic|heif|avif|webp|jpe?g|png)$/i, '');
    const have = avatarStore.get(uniqueId);
    const fresh = have && have.pathKey === pathKey && (Date.now() - have.at) < AVATAR_REFRESH_MS;
    const failedRecently = avatarFailedAt.has(uniqueId) && (Date.now() - avatarFailedAt.get(uniqueId)) < AVATAR_RETRY_MS;
    if (!fresh && !avatarPending.has(uniqueId) && !failedRecently) {
      if (!have || have.pathKey !== pathKey) avatarVer.set(uniqueId, Date.now());
      const job = downloadAvatar(usable).then((got) => {
        if (got) {
          if (avatarStore.size >= AVATAR_MAX_ENTRIES) avatarStore.delete(avatarStore.keys().next().value);
          avatarStore.set(uniqueId, { buf: got.buf, type: got.type, pathKey: pathKey, at: Date.now() });
          avatarFailedAt.delete(uniqueId);
        } else {
          avatarFailedAt.set(uniqueId, Date.now());
          console.warn('[photo] could not download a usable photo for ' + uniqueId);
        }
      }).catch(() => { avatarFailedAt.set(uniqueId, Date.now()); }).finally(() => { avatarPending.delete(uniqueId); });
      avatarPending.set(uniqueId, job);
    }
    return avatarPathFor(uniqueId);
  } catch (e) {
    console.error('[registerAvatar error - swallowed]', e);
    return urls && urls[0] ? urls[0] : null;
  }
}
app.get('/avatar/:id', async (req, res) => {
  try {
    const id = String(req.params.id || '');
    let entry = avatarStore.get(id);
    if (!entry && avatarPending.has(id)) {
      await Promise.race([avatarPending.get(id), new Promise((r) => setTimeout(r, 7000))]);
      entry = avatarStore.get(id);
    }
    if (entry) {
      res.setHeader('Content-Type', entry.type);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.end(entry.buf);
    }
    const raw = avatarRaw.get(id);
    if (raw) return res.redirect(302, raw);
    res.status(404).end();
  } catch (e) {
    res.status(404).end();
  }
});
  return { registerAvatar: registerAvatar };
};
