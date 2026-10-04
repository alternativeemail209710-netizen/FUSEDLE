/**
 * FUSEDLE Live - Server
 * Express (static) + Socket.IO (realtime) + MEMORY's hardened TikTok LIVE
 * connector (tiktok-connector.js) + MEMORY's viewer-photo service (avatars.js).
 *
 * Run locally:  npm install && npm start
 * Deploy:       push this folder to GitHub, deploy on Render.com as a Web Service.
 */
'use strict';

const path = require('path');
const fs = require('fs');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
try { require('dotenv').config(); } catch (err) { /* fine on Render */ }

process.on('uncaughtException', (err) => console.error('[FATAL-CAUGHT] uncaughtException:', err && err.stack ? err.stack : err));
process.on('unhandledRejection', (reason) => console.error('[FATAL-CAUGHT] unhandledRejection:', reason));

const createTikTokConnector = require('./tiktok-connector');
const PUZZLES = require('./puzzles');

const DEFAULT_TIKTOK_USERNAME = String(process.env.TIKTOK_USERNAME || '').replace('@', '').trim();
const DEFAULT_SIGN_API_KEY = String(process.env.EULERSTREAM_SIGN_API_KEY || process.env.TIKTOK_SIGN_API_KEY || '').trim();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Health check: point UptimeRobot / cron-job.org here while you stream.
app.get('/healthz', (req, res) => res.json({ ok: true, uptimeSeconds: process.uptime() }));
const { registerAvatar } = require('./avatars')(app);
app.use(express.static(path.join(__dirname, 'public'), {
  etag: false, lastModified: false,
  setHeaders: (res) => res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate'),
}));

// ---------------------------------------------------------------------------
// Settings tables
// ---------------------------------------------------------------------------
const LEVELS = {
  1: { name: 'Warmup', groups: 3 },
  2: { name: 'Easy', groups: 4 },
  3: { name: 'Medium', groups: 5 },
  4: { name: 'Hard', groups: 6 },
  5: { name: 'Chaos', groups: 8 },
};
const TIMING = {
  autoNext: { min: 3, max: 300, def: 8 },
  mismatch: { min: 0.5, max: 5, def: 2 },
  peek: { min: 1, max: 10, def: 4 },
};
const clampSeconds = (v, cfg) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(cfg.max, Math.max(cfg.min, n)) : cfg.def;
};
const BOTS = ['Fay', 'Dax', 'Ava', 'Cleo', 'Milo', 'Zara'].map((n) => ({ uniqueId: 'bot-' + n.toLowerCase(), name: n, avatar: null }));
const HOST_PLAYER = { uniqueId: 'host', name: 'Host', avatar: null };
const comboMultiplier = (streak) => Math.min(4, Math.max(1, streak));

const shuffle = (arr) => {
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
};

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const state = {
  mode: 'test', level: 2, pack: 'mixed', cycle: 0, configured: false,
  autoNext: true, autoNextDelaySeconds: TIMING.autoNext.def, autoNextAt: 0,
  mismatchSeconds: TIMING.mismatch.def, peekSeconds: TIMING.peek.def, pointsPerGroup: 10,
  title: '', groups: [], tiles: [], solved: [], hint: '', peeking: false,
  startedAt: 0, solvedAt: 0,
  scores: {}, allTimeScores: {}, rawEventCount: 0, lastEvent: null,
  bots: false,
  tiktok: { connected: false, connecting: false, statusText: 'Not connected.', lastError: null, uniqueId: '' },
};
let autoNextTimer = null, peekTimer = null, botTimer = null, currentTikTokUser = '', lastConnectorError = '';
const avatarCache = {};

// ---------------------------------------------------------------------------
// All-time scores saved to a file (survives sleep/wake; wiped by new deploys
// on the free Render plan unless DATA_DIR points at a Persistent Disk)
// ---------------------------------------------------------------------------
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const ALLTIME_FILE = path.join(DATA_DIR, 'alltime.json');
let saveTimer = null;
function loadAllTime() {
  try { state.allTimeScores = JSON.parse(fs.readFileSync(ALLTIME_FILE, 'utf8')) || {}; } catch (e) { state.allTimeScores = {}; }
}
function saveAllTimeNow() {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(ALLTIME_FILE, JSON.stringify(state.allTimeScores)); }
  catch (e) { console.warn('[scores] could not save all-time file:', e.message); }
}
function saveAllTimeSoon() { clearTimeout(saveTimer); saveTimer = setTimeout(saveAllTimeNow, 1500); }
['SIGTERM', 'SIGINT'].forEach((sig) => process.on(sig, () => { saveAllTimeNow(); process.exit(0); }));

// ---------------------------------------------------------------------------
// Puzzle building
// ---------------------------------------------------------------------------
function pickGroups(level, pack) {
  const n = LEVELS[level].groups;
  if (level === 5) { // Chaos: groups from every puzzle, no repeated words
    const used = new Set(), out = [];
    for (const g of shuffle(PUZZLES.flatMap((p) => p.groups))) {
      const ws = g[1].split(',').map((w) => w.toLowerCase());
      if (ws.some((w) => used.has(w))) continue;
      ws.forEach((w) => used.add(w)); out.push(g);
      if (out.length === n) break;
    }
    return { title: 'Mixed Chaos', groups: out };
  }
  let p;
  if (pack === 'mixed') { p = PUZZLES[state.cycle % PUZZLES.length]; state.cycle++; }
  else p = PUZZLES.find((x) => x.title === pack) || PUZZLES[0];
  return { title: p.title, groups: shuffle(p.groups.slice()).slice(0, n) };
}

function newGame(level) {
  cancelAutoNext();
  clearTimeout(peekTimer); state.peeking = false;
  if (Number(level) in LEVELS) state.level = Number(level);
  const pick = pickGroups(state.level, state.pack);
  state.title = pick.title;
  state.groups = pick.groups.map(([name, w]) => ({ name, words: w.split(',') }));
  const all = [];
  state.groups.forEach((g, gi) => g.words.forEach((w) => all.push({ w, g: gi })));
  state.tiles = shuffle(all).map((t, i) => ({ n: i + 1, w: t.w, g: t.g }));
  state.solved = []; state.hint = ''; state.solvedAt = 0; state.startedAt = Date.now();
  state.scores = {};
  broadcast();
  io.emit('newGame', { title: state.title });
}

const openTiles = () => state.tiles.filter((t) => !state.solved.some((s) => s.g === t.g));

function publicState() {
  return {
    mode: state.mode, level: state.level, levelName: LEVELS[state.level].name, pack: state.pack,
    title: state.title, groupsTotal: state.groups.length, tilesTotal: state.tiles.length,
    tiles: openTiles().map((t) => (state.peeking ? { n: t.n, w: t.w, g: t.g } : { n: t.n, w: t.w })),
    solved: state.solved.map((s) => ({ g: s.g, name: state.groups[s.g].name, words: state.groups[s.g].words, by: s.by })),
    hint: state.hint, peeking: state.peeking,
    startedAt: state.startedAt, solvedAt: state.solvedAt, now: Date.now(),
    autoNext: state.autoNext, autoNextDelaySeconds: state.autoNextDelaySeconds, autoNextAt: state.autoNextAt,
    mismatchSeconds: state.mismatchSeconds, peekSeconds: state.peekSeconds, pointsPerGroup: state.pointsPerGroup,
    rawEventCount: state.rawEventCount, lastEvent: state.lastEvent, bots: state.bots,
    tiktok: state.tiktok, configured: state.configured,
  };
}

function rankList(table, limit, withStreak) {
  return Object.values(table).filter((p) => p.points > 0)
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map((p) => { const r = { uniqueId: p.uniqueId, name: p.name, avatar: p.avatar, points: p.points }; if (withStreak) r.streak = p.streak || 0; return r; });
}
function emitLeaderboards() {
  io.emit('leaderboard', { round: rankList(state.scores, 500, true), allTime: rankList(state.allTimeScores, 1000) });
}
function broadcast() { io.emit('state', publicState()); emitLeaderboards(); }

function ensurePlayer(table, p) {
  let row = table[p.uniqueId];
  if (!row) row = table[p.uniqueId] = { uniqueId: p.uniqueId, name: p.name, avatar: p.avatar || null, points: 0, streak: 0 };
  row.name = p.name;
  if (p.avatar) row.avatar = p.avatar;
  return row;
}

// ---------------------------------------------------------------------------
// Round flow
// ---------------------------------------------------------------------------
function cancelAutoNext() { clearTimeout(autoNextTimer); autoNextTimer = null; state.autoNextAt = 0; }
function scheduleAutoNext() {
  cancelAutoNext();
  if (!state.autoNext) return;
  state.autoNextAt = Date.now() + state.autoNextDelaySeconds * 1000;
  autoNextTimer = setTimeout(() => newGame(state.level), state.autoNextDelaySeconds * 1000);
}
function finishGame() {
  if (state.solvedAt) return;
  state.solvedAt = Date.now();
  state.hint = '';
  saveAllTimeNow();
  scheduleAutoNext();
  broadcast();
  io.emit('roundEnd', { title: state.title, round: rankList(state.scores, 500, true), allTime: rankList(state.allTimeScores, 1000) });
}

// ---------------------------------------------------------------------------
// Guessing
// ---------------------------------------------------------------------------
function normalizeText(text) {
  return String(text == null ? '' : text).replace(/[\uFF10-\uFF19]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0));
}
// "2 5 8 12", "2,5,8,12", "2-5-8-12" and "2 5 8 and 12" all read as four tiles.
// Anything with other words in it is ordinary chat and is ignored as "format".
function parseNumbers(text) {
  const t = normalizeText(text).toLowerCase().replace(/\band\b/g, ' ');
  if (!/^[\d\s,.\-+:&;\/]+$/.test(t.trim())) return null;
  const m = t.match(/\d+/g);
  return m ? m.map((x) => parseInt(x, 10)) : null;
}

function attemptFuse(nums, player) {
  if (state.solvedAt) return { kind: 'busy' };
  const row = ensurePlayer(state.scores, player);
  if (!nums || nums.length !== 4 || new Set(nums).size !== 4) { return { kind: 'format' }; }
  const byN = new Map(openTiles().map((t) => [t.n, t]));
  if (nums.some((n) => !byN.has(n))) return { kind: 'invalid' };
  const picked = nums.map((n) => byN.get(n));
  const counts = {};
  picked.forEach((t) => { counts[t.g] = (counts[t.g] || 0) + 1; });
  const best = Math.max(...Object.values(counts));
  if (best === 4) {
    const g = picked[0].g;
    row.streak = (row.streak || 0) + 1;
    const gained = state.pointsPerGroup * comboMultiplier(row.streak);
    row.points += gained;
    const all = ensurePlayer(state.allTimeScores, player);
    all.points += gained;
    saveAllTimeSoon();
    state.solved.push({ g, by: player.name });
    state.hint = '';
    const result = { kind: 'correct', streak: row.streak, gained, group: state.groups[g].name };
    if (state.solved.length === state.groups.length) finishGame();
    return result;
  }
  row.streak = 0;
  return { kind: best === 3 ? 'near' : 'wrong', nums };
}

function handleIncomingComment(player, text, opts) {
  try {
    text = text == null ? '' : String(text);
    if (player.avatar) avatarCache[player.uniqueId] = player.avatar;
    else player.avatar = avatarCache[player.uniqueId] || null;
    if (!opts || opts.countsAsRawEvent !== false) state.rawEventCount += 1;
    const nums = parseNumbers(text);
    const result = nums ? attemptFuse(nums, player) : { kind: 'format' };
    state.lastEvent = { user: player.name, text: text.slice(0, 80), read: nums ? nums.join(' ') : null, kind: result.kind };
    io.emit('guessResult', {
      uniqueId: player.uniqueId, name: player.name, avatar: player.avatar, text: text.slice(0, 60),
      kind: result.kind, nums: nums && nums.length === 4 ? nums : null,
      streak: result.streak || 0, gained: result.gained || 0, group: result.group || null,
    });
    broadcast();
  } catch (e) { console.error('[ERR] handleIncomingComment:', e); }
}

// ---------------------------------------------------------------------------
// Host tools (nobody earns points from these)
// ---------------------------------------------------------------------------
function peekBoard() {
  if (state.solvedAt) return;
  clearTimeout(peekTimer);
  state.peeking = true;
  peekTimer = setTimeout(() => { state.peeking = false; broadcast(); }, state.peekSeconds * 1000);
  io.emit('notice', { text: 'Peek: tiles tinted by group' });
  broadcast();
}
function hintNow() {
  if (state.solvedAt) return;
  const groupIds = [...new Set(openTiles().map((t) => t.g))];
  if (!groupIds.length) return;
  const g = shuffle(groupIds)[0];
  const t = shuffle(openTiles().filter((x) => x.g === g))[0];
  state.hint = 'Hint: "' + state.groups[g].name + '" includes tile ' + t.n;
  io.emit('notice', { text: 'Hint on screen' });
  broadcast();
}
function revealGroups(count) {
  if (state.solvedAt) return;
  const ids = shuffle([...new Set(openTiles().map((t) => t.g))]).slice(0, count);
  ids.forEach((g) => state.solved.push({ g, by: null }));
  state.hint = '';
  io.emit('notice', { text: 'Host revealed ' + ids.length + (ids.length === 1 ? ' group' : ' groups') });
  if (state.solved.length >= state.groups.length) finishGame(); else broadcast();
}

// ---------------------------------------------------------------------------
// Test mode bots
// ---------------------------------------------------------------------------
function botGuessText() {
  const open = openTiles();
  const byGroup = {};
  open.forEach((t) => { (byGroup[t.g] = byGroup[t.g] || []).push(t.n); });
  const ids = Object.keys(byGroup);
  if (!ids.length) return null;
  const roll = Math.random();
  const good = byGroup[ids[Math.floor(Math.random() * ids.length)]];
  if (roll < 0.35) return good.join(' ');
  if (roll < 0.6 && open.length > 4) { // near miss: 3 right + 1 wrong
    const wrong = shuffle(open.filter((t) => !good.includes(t.n)))[0];
    return shuffle(good.slice(0, 3).concat(wrong.n)).join(' ');
  }
  return shuffle(open.map((t) => t.n)).slice(0, 4).join(' ');
}
function botTick() {
  if (state.mode !== 'test' || state.solvedAt) return;
  const text = botGuessText();
  if (text) handleIncomingComment({ ...BOTS[Math.floor(Math.random() * BOTS.length)] }, text);
}
function setBots(enabled) {
  clearInterval(botTimer); botTimer = null;
  state.bots = !!enabled;
  if (state.bots) botTimer = setInterval(botTick, 2400);
  broadcast();
}
function setMode(mode) {
  if (!['offline', 'test', 'live'].includes(mode)) return;
  state.mode = mode;
  if (mode !== 'test') setBots(false);
  broadcast();
}

// ---------------------------------------------------------------------------
// TikTok LIVE
// ---------------------------------------------------------------------------
function setTikTokStatus(status, message) {
  const t = state.tiktok;
  t.statusText = message || '';
  if (status === 'connected') { lastConnectorError = ''; t.connected = true; t.connecting = false; t.lastError = null; t.uniqueId = currentTikTokUser; }
  else if (status === 'connecting' || status === 'retrying') {
    if (status === 'retrying' && lastConnectorError) t.statusText += '  [Last problem: ' + lastConnectorError + ']';
    t.connected = false; t.connecting = true; t.lastError = null;
  } else if (status === 'error') { lastConnectorError = String(message || '').slice(0, 220); t.connected = false; t.connecting = false; t.lastError = message || 'Connection error.'; }
  else { if (status === 'disconnected' && /^Disconnected\.$/.test(message || '')) lastConnectorError = ''; t.connected = false; t.connecting = false; t.lastError = null; }
  broadcast();
}
const tiktokConnector = createTikTokConnector(
  function onChat(fields) {
    if (state.mode !== 'live') { state.rawEventCount += 1; return; } // Test/Offline stay private
    const photo = registerAvatar(fields.uniqueId, fields.avatarUrls && fields.avatarUrls.length ? fields.avatarUrls : (fields.avatarUrl ? [fields.avatarUrl] : []));
    handleIncomingComment({ uniqueId: fields.uniqueId, name: fields.nickname, avatar: photo }, fields.text);
  },
  setTikTokStatus,
  function onRawEvent() {}
);

// ---------------------------------------------------------------------------
// Socket.IO
// ---------------------------------------------------------------------------
function safe(fn, isHostAction) {
  return function (payload) {
    try { if (isHostAction) state.configured = true; fn(payload || {}); }
    catch (err) { console.error('[handler error - swallowed, server kept running]', err); }
  };
}

io.on('connection', (socket) => {
  socket.emit('state', publicState());
  socket.emit('leaderboard', { round: rankList(state.scores, 500, true), allTime: rankList(state.allTimeScores, 1000) });
  socket.emit('liveConfig', {
    hasDefaultSignApiKey: !!DEFAULT_SIGN_API_KEY, defaultUsername: DEFAULT_TIKTOK_USERNAME || '',
    packs: [{ id: 'mixed', label: 'Mixed (rotate all)' }].concat(PUZZLES.map((p) => ({ id: p.title, label: p.title }))),
  });

  socket.on('host:applyDefaults', safe((p) => {
    if (state.configured) return;
    state.configured = true;
    const t = state.tiktok;
    if (!(t.connected || t.connecting) && ['offline', 'test', 'live'].includes(p.mode)) setMode(p.mode);
    if (typeof p.autoNext === 'boolean') state.autoNext = p.autoNext;
    if (p.autoNextDelaySeconds !== undefined) state.autoNextDelaySeconds = clampSeconds(p.autoNextDelaySeconds, TIMING.autoNext);
    if (p.mismatchSeconds !== undefined) state.mismatchSeconds = clampSeconds(p.mismatchSeconds, TIMING.mismatch);
    if (p.peekSeconds !== undefined) state.peekSeconds = clampSeconds(p.peekSeconds, TIMING.peek);
    if (p.pointsPerGroup !== undefined) state.pointsPerGroup = Math.round(clampSeconds(p.pointsPerGroup, { min: 1, max: 100, def: 10 }));
    if (typeof p.pack === 'string' && (p.pack === 'mixed' || PUZZLES.some((x) => x.title === p.pack))) state.pack = p.pack;
    if (Number(p.level) in LEVELS) newGame(p.level);
    if (typeof p.bots === 'boolean') setBots(p.bots && state.mode === 'test');
    broadcast();
  }));

  socket.on('host:newGame', safe((p) => newGame(p.level), true));
  socket.on('host:setMode', safe((p) => setMode(p.mode), true));
  socket.on('host:setPack', safe((p) => {
    const id = String(p.pack || '');
    if (id === 'mixed' || PUZZLES.some((x) => x.title === id)) { state.pack = id; newGame(state.level); }
  }, true));
  socket.on('host:setAutoNext', safe((p) => {
    state.autoNext = !!p.enabled;
    if (p.delaySeconds !== undefined) state.autoNextDelaySeconds = clampSeconds(p.delaySeconds, TIMING.autoNext);
    if (!state.autoNext) cancelAutoNext(); else if (state.solvedAt && !autoNextTimer) scheduleAutoNext();
    broadcast();
  }, true));
  socket.on('host:setTiming', safe((p) => {
    if (p.autoNextDelaySeconds !== undefined) state.autoNextDelaySeconds = clampSeconds(p.autoNextDelaySeconds, TIMING.autoNext);
    if (p.mismatchSeconds !== undefined) state.mismatchSeconds = clampSeconds(p.mismatchSeconds, TIMING.mismatch);
    if (p.peekSeconds !== undefined) state.peekSeconds = clampSeconds(p.peekSeconds, TIMING.peek);
    if (p.pointsPerGroup !== undefined) state.pointsPerGroup = Math.round(clampSeconds(p.pointsPerGroup, { min: 1, max: 100, def: 10 }));
    broadcast();
  }, true));
  socket.on('host:setBots', safe((p) => setBots(!!p.enabled && state.mode === 'test'), true));
  socket.on('host:resetRoundScores', safe(() => { state.scores = {}; broadcast(); }, true));
  socket.on('host:resetAllTimeScores', safe(() => { state.allTimeScores = {}; saveAllTimeNow(); broadcast(); }, true));
  socket.on('host:peek', safe(() => peekBoard(), true));
  socket.on('host:hint', safe(() => hintNow(), true));
  socket.on('host:revealGroup', safe((p) => revealGroups(Math.max(1, Math.min(10, parseInt(p.count, 10) || 1))), true));
  socket.on('host:revealBoard', safe(() => revealGroups(99), true));

  // Manual guesses from the Host console, the Offline guess bar and the Test box.
  socket.on('host:manualInput', safe((p) => {
    const name = String(p.user || 'Host').slice(0, 30);
    const player = name === 'Host' ? { ...HOST_PLAYER } : { uniqueId: 'named-' + name.toLowerCase(), name, avatar: null };
    handleIncomingComment(player, p.text);
  }));
  socket.on('test:simulate', safe(() => {
    const text = botGuessText();
    if (text) handleIncomingComment({ ...BOTS[Math.floor(Math.random() * BOTS.length)] }, text);
  }));

  socket.on('tiktok:connect', safe((p) => {
    const username = String(p.uniqueId || '').replace('@', '').trim() || DEFAULT_TIKTOK_USERNAME;
    const apiKey = String(p.apiKey || '').trim() || DEFAULT_SIGN_API_KEY;
    currentTikTokUser = username;
    if (state.mode !== 'live') setMode('live');
    tiktokConnector.connect(username, apiKey);
  }, true));
  socket.on('tiktok:disconnect', safe(() => tiktokConnector.disconnect(), true));
});

loadAllTime();
newGame(2);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('FUSEDLE Live running on port ' + PORT);
  // With BOTH variables set, connect to TikTok LIVE by itself on every start.
  if (DEFAULT_TIKTOK_USERNAME && DEFAULT_SIGN_API_KEY) {
    console.log('[startup] TIKTOK_USERNAME and EULERSTREAM_SIGN_API_KEY are set - connecting automatically...');
    currentTikTokUser = DEFAULT_TIKTOK_USERNAME;
    state.mode = 'live';
    tiktokConnector.connect(DEFAULT_TIKTOK_USERNAME, DEFAULT_SIGN_API_KEY);
  }
});
