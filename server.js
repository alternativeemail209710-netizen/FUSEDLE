/**
 * FUSEDLE Live - Server  (one fixed build: 8 groups per round, 24 tiles on screen at a time)
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
const { PACKS, validate: validatePuzzles, compose: composeBoard, boardSig, BOARD } = require('./puzzles');
{ const problems = validatePuzzles(); if (problems.length) { console.error('[puzzles] PROBLEMS:\n  ' + problems.join('\n  ')); process.exit(1); } }

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
// ONE fixed build, no difficulty levels: every round has 8 independent groups (see BOARD in puzzles.js).
// Only SHOWN tiles (4 columns x 6 rows = 24) are on screen at any moment. When tiles are fused, the freed spaces are
// refilled from the waiting tiles until every tile of the round has appeared and every group is discovered.
const COLS = 4, ROWS = 6, SHOWN = COLS * ROWS;
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
const comboMultiplier = (streak) => (state.comboEnabled ? Math.min(state.comboMax, Math.max(1, streak)) : 1);

const shuffle = (arr) => {
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
};

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const state = {
  mode: 'test', pack: 'mixed', cycle: 0, configured: false,
  autoNext: true, autoNextDelaySeconds: TIMING.autoNext.def, autoNextAt: 0,
  mismatchSeconds: TIMING.mismatch.def, peekSeconds: TIMING.peek.def, pointsPerGroup: 1,
  // Game rules the host can change in Settings > Game rules (see applyRules)
  comboEnabled: true, comboMax: 4, showNear: true, finalBonus: 0, guessCooldown: 0, groupsPerRound: BOARD.two + BOARD.three, twoLevel: BOARD.two,
  title: '', nodes: [], tiles: [], queues: {}, seq: [], nextN: 1, completed: [], rootsTotal: 0, fusionsDone: 0, lastFusion: null, hint: '', peeking: false,
  startedAt: 0, solvedAt: 0,
  scores: {}, allTimeScores: {}, rawEventCount: 0, lastEvent: null,
  bots: false,
  // phase: idle | connecting | retrying | connected | failed | disconnected.  code/reason/hint/detail explain a failure in plain words
  // (see classifyError in tiktok-connector.js); the connection window in the browser shows them.
  tiktok: { connected: false, connecting: false, statusText: 'Not connected.', lastError: null, uniqueId: '',
    phase: 'idle', username: '', code: '', reason: '', hint: '', detail: '', attempt: 0, retryInSeconds: 0, roomId: '', updatedAt: 0 },
};
let autoNextTimer = null, peekTimer = null, botTimer = null, currentTikTokUser = '';
const avatarCache = {};
const lastGuessAt = {};   // uniqueId -> time of the last counted guess (for the guess cooldown)

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
const recentGroups = [];   // names of groups used in the last few rounds, so rounds do not repeat

// Boards that were already played are remembered (and saved next to the scores), so the exact same round never comes back
// until every possible board has been played. On the free Render plan the file resets on a new deploy, like the all-time scores.
const PLAYED_FILE = path.join(DATA_DIR, 'played-boards.json');
let playedBoards = [];
try { playedBoards = JSON.parse(fs.readFileSync(PLAYED_FILE, 'utf8')); if (!Array.isArray(playedBoards)) playedBoards = []; } catch (e) { playedBoards = []; }
const playedSet = new Set(playedBoards);
function rememberBoard(sig) {
  if (playedSet.has(sig)) return;
  playedSet.add(sig); playedBoards.push(sig);
  while (playedBoards.length > 100000) playedSet.delete(playedBoards.shift());
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(PLAYED_FILE, JSON.stringify(playedBoards)); } catch (e) { /* read-only disk: still works, just not saved */ }
}

function pickTrees(pack) {
  const groups = Math.min(8, Math.max(1, state.groupsPerRound)), two = Math.min(groups, Math.max(0, state.twoLevel));
  const b = composeBoard(pack, new Set(recentGroups), playedSet, { two, three: groups - two });
  rememberBoard(boardSig(b.roots));
  b.roots.forEach((r) => { recentGroups.push(r.name); });
  while (recentGroups.length > 24) recentGroups.shift();
  return b;
}

// Turn the chosen fusion trees into nodes (groups) + the waiting tiles.
//   node: { id, name, parent, ord, height, done, nested }
//   tile: { n, w, parent, ord, node, alive, sub, height, slot }
//     parent = the group this tile belongs to; node = group it represents (fused tiles only); slot = position 0..23 on screen
// Nothing is numbered or shown yet: tiles get their number and position when they appear (see refill()).
// Inside one group the words appear lowest level first, so the board can never get stuck (see refill()).
function buildBoard(roots) {
  state.nodes = []; state.completed = []; state.fusionsDone = 0; state.lastFusion = null;
  state.tiles = []; state.queues = {}; state.seq = []; state.nextN = 1;
  const base = [];
  const addNode = (def, parentId, ord, treeId) => {
    const id = state.nodes.length;
    const tree = treeId === null ? id : treeId;
    const node = { id, name: def.name, parent: parentId, ord, height: 0, done: false, nested: null };
    state.nodes.push(node);
    let deepest = 0;
    def.kids.forEach((k, i) => {
      if (typeof k === 'string') base.push({ w: k, parent: id, ord: i, tree });
      else deepest = Math.max(deepest, addNode(k, id, i, tree));
    });
    node.height = deepest + 1;
    return node.height;
  };
  roots.forEach((r) => addNode(r, null, 0, null));
  shuffle(base).sort((a, b) => state.nodes[a.parent].height - state.nodes[b.parent].height);   // stable: lowest level first
  base.forEach((t) => {
    (state.queues[t.tree] = state.queues[t.tree] || []).push({ n: 0, w: t.w, parent: t.parent, ord: t.ord, node: null, alive: true, sub: '', height: 0, slot: -1 });
    state.seq.push(t.tree);
  });
  shuffle(state.seq);   // the order in which groups send their next word onto the board
  state.rootsTotal = roots.length;
  refill();
}

function newGame() {
  cancelAutoNext();
  clearTimeout(peekTimer); state.peeking = false;
  const pick = pickTrees(state.pack);
  state.title = pick.title;
  buildBoard(pick.roots);
  state.hint = ''; state.solvedAt = 0; state.startedAt = Date.now();
  state.scores = {};
  broadcast();
  io.emit('newGame', { title: state.title });
}

const openTiles = () => state.tiles.filter((t) => t.alive);
const tilesOf = (nodeId) => state.tiles.filter((t) => t.alive && t.parent === nodeId);
// A group can be fused only when ALL 4 of its children are tiles on the board right now.
const fusableNodes = () => state.nodes.filter((nd) => !nd.done && tilesOf(nd.id).length === 4);

// Does the board (plus an optional extra tile) contain at least one group whose 4 children are all on screen?
function hasFusable(extra) {
  const count = {};
  openTiles().forEach((t) => { count[t.parent] = (count[t.parent] || 0) + 1; });
  if (extra) count[extra.parent] = (count[extra.parent] || 0) + 1;
  return state.nodes.some((nd) => !nd.done && count[nd.id] === 4);
}

// Fill the empty spaces (lowest position first) from the waiting tiles, each new tile with the next free number.
// SAFETY: a group only sends its words lowest level first, so every group on screen holds at most 3 words of its
// current fusion. The very last empty space is therefore only ever filled in a way that leaves at least one group
// that can be fused, so a full board can never get stuck.
function refill() {
  while (state.seq.length) {
    const taken = new Set(openTiles().map((t) => t.slot));
    if (taken.size >= SHOWN) break;
    let slot = 0; while (taken.has(slot)) slot++;
    let at = 0;
    if (taken.size === SHOWN - 1 && !hasFusable(null)) {
      const good = [];
      state.seq.forEach((treeId, i) => { if (!good.some((g) => g.treeId === treeId) && hasFusable(state.queues[treeId][0])) good.push({ treeId, i }); });
      if (good.length) at = good[Math.floor(Math.random() * good.length)].i;
    }
    const treeId = state.seq.splice(at, 1)[0];
    const tile = state.queues[treeId].shift();
    tile.n = state.nextN++; tile.slot = slot;
    state.tiles.push(tile);
  }
}

// The heart of the game: destroy the 4 tiles, create ONE new tile with a NEW number.
function doFuse(node, picked, by) {
  picked.sort((a, b) => a.ord - b.ord);
  const freed = picked.map((t) => t.slot).sort((a, b) => a - b);
  picked.forEach((t) => { t.alive = false; });
  node.done = true;
  node.nested = { name: node.name, kids: picked.map((t) => (t.node !== null ? state.nodes[t.node].nested : t.w)) };
  const isRoot = node.parent === null;
  const tile = {
    n: state.nextN++, w: node.name, parent: node.parent, ord: node.ord, node: node.id,
    alive: !isRoot,                       // a finished chain becomes a banner instead of a tile
    sub: picked.map((t) => t.w).join(' \u00B7 '), height: node.height,
    slot: isRoot ? -1 : freed[0],         // the fused tile takes the first freed space, the other spaces get new tiles
  };
  state.tiles.push(tile);
  state.fusionsDone += 1;
  state.lastFusion = { newN: tile.n, at: Date.now() };
  if (isRoot) state.completed.push({ id: node.id, name: node.name, words: picked.map((t) => t.w), by: by || null });
  state.hint = '';
  refill();
  return { tile, isRoot, from: picked.map((t) => t.n) };
}

function publicState() {
  return {
    mode: state.mode, pack: state.pack,
    title: state.title,
    fusionsDone: state.fusionsDone, fusionsTotal: state.nodes.length,
    chainsDone: state.completed.length, chainsTotal: state.rootsTotal,
    maxLevels: Math.max(0, ...state.nodes.filter((n) => n.parent === null).map((n) => n.height)),
    tiles: openTiles().map((t) => {
      const o = { n: t.n, w: t.w, s: t.slot };
      if (t.node !== null) { o.f = t.height; o.sub = t.sub; }   // f = fusion level of a fused tile
      if (state.peeking) o.g = t.parent;                        // peek: tile's group id
      return o;
    }),
    solved: state.completed.map((c) => ({ g: c.id, name: c.name, words: c.words, by: c.by })),   // only the 4 latest words, no nested tree
    cols: COLS, rows: ROWS, shown: SHOWN, waiting: state.seq.length,
    lastFusion: state.lastFusion,
    hint: state.hint, peeking: state.peeking,
    startedAt: state.startedAt, solvedAt: state.solvedAt, now: Date.now(),
    autoNext: state.autoNext, autoNextDelaySeconds: state.autoNextDelaySeconds, autoNextAt: state.autoNextAt,
    mismatchSeconds: state.mismatchSeconds, peekSeconds: state.peekSeconds, pointsPerGroup: state.pointsPerGroup,
    comboEnabled: state.comboEnabled, comboMax: state.comboMax, showNear: state.showNear, finalBonus: state.finalBonus,
    guessCooldown: state.guessCooldown, groupsPerRound: state.groupsPerRound, twoLevel: state.twoLevel,
    rawEventCount: state.rawEventCount, lastEvent: state.lastEvent, bots: state.bots,
    tiktok: state.tiktok, configured: state.configured,
  };
}

function rankList(table, limit, withStreak) {
  return Object.values(table).filter((p) => p.points > 0)
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map((p) => { const r = { uniqueId: p.uniqueId, name: p.name, avatar: p.avatar, points: p.points }; if (withStreak) r.streak = state.comboEnabled ? (p.streak || 0) : 0; return r; });
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
  autoNextTimer = setTimeout(() => newGame(), state.autoNextDelaySeconds * 1000);
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
  picked.forEach((t) => { counts[t.parent] = (counts[t.parent] || 0) + 1; });
  const best = Math.max(...Object.values(counts));
  if (best === 4) {
    const node = state.nodes[picked[0].parent];
    row.streak = (row.streak || 0) + 1;
    // Every fusion is worth the same, whatever its level: base points x combo (streak) multiplier.
    const gained = state.pointsPerGroup * comboMultiplier(row.streak) + (node.parent === null ? state.finalBonus : 0);
    row.points += gained;
    const all = ensurePlayer(state.allTimeScores, player);
    all.points += gained;
    saveAllTimeSoon();
    const f = doFuse(node, picked, { name: player.name, uniqueId: player.uniqueId, avatar: player.avatar || null });
    const result = { kind: 'correct', streak: state.comboEnabled ? row.streak : 0, gained, group: node.name, newN: f.tile.n, height: node.height, final: f.isRoot, nums };
    if (state.completed.length >= state.rootsTotal) finishGame();
    return result;
  }
  row.streak = 0;
  return { kind: best === 3 && state.showNear ? 'near' : 'wrong', nums };
}

// ---------------------------------------------------------------------------
// Live chat box: every comment (TikTok, Test bots, Host console, chat box) is kept in a short log and shown under the tiles.
// ---------------------------------------------------------------------------
const CHAT_MAX = 80;
const chatLog = [];
let chatSeq = 0;
function pushChat(player, text, kind, nums) {
  const entry = {
    id: ++chatSeq, uniqueId: player.uniqueId, name: String(player.name || 'Viewer').slice(0, 30), avatar: player.avatar || null,
    text: String(text == null ? '' : text).replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, 140),
    kind: kind || 'chat', guess: !!(nums && nums.length), ts: Date.now(),
  };
  if (!entry.text) return;
  chatLog.push(entry);
  while (chatLog.length > CHAT_MAX) chatLog.shift();
  io.emit('chat', entry);
}

function handleIncomingComment(player, text, opts) {
  try {
    text = text == null ? '' : String(text);
    if (player.avatar) avatarCache[player.uniqueId] = player.avatar;
    else player.avatar = avatarCache[player.uniqueId] || null;
    if (!opts || opts.countsAsRawEvent !== false) state.rawEventCount += 1;
    const nums = parseNumbers(text);
    // Guess cooldown (Settings > Game rules): a viewer who guesses again too soon is quietly ignored. The host is never limited.
    if (nums && state.guessCooldown > 0 && player.uniqueId !== HOST_PLAYER.uniqueId) {
      const now = Date.now(), last = lastGuessAt[player.uniqueId] || 0;
      if (now - last < state.guessCooldown * 1000) {
        state.lastEvent = { user: player.name, text: text.slice(0, 80), read: nums.join(' '), kind: 'cooldown' };
        pushChat(player, text, 'cooldown', nums);
        broadcast();
        return;
      }
      lastGuessAt[player.uniqueId] = now;
      if (Object.keys(lastGuessAt).length > 5000) Object.keys(lastGuessAt).forEach((k) => { if (now - lastGuessAt[k] > 60000) delete lastGuessAt[k]; });
    }
    const result = nums ? attemptFuse(nums, player) : { kind: 'format' };
    state.lastEvent = { user: player.name, text: text.slice(0, 80), read: nums ? nums.join(' ') : null, kind: result.kind };
    pushChat(player, text, result.kind, nums);
    io.emit('guessResult', {
      uniqueId: player.uniqueId, name: player.name, avatar: player.avatar, text: text.slice(0, 60),
      kind: result.kind, nums: nums && nums.length === 4 ? nums : null,
      streak: result.streak || 0, gained: result.gained || 0, group: result.group || null,
      newN: result.newN || null, height: result.height || 0, final: !!result.final,
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
  const nodes = fusableNodes();
  if (!nodes.length) return;
  const node = shuffle(nodes.slice())[0];
  const t = shuffle(tilesOf(node.id).slice())[0];
  state.hint = 'Hint: \u201C' + node.name + '\u201D includes tile ' + t.n;
  io.emit('notice', { text: 'Hint on screen' });
  broadcast();
}
// Reveal = the host fuses groups for the viewers (no points). Each step is one fusion,
// and a fusion can unlock the next level, so "reveal board" walks the whole chain.
function revealGroups(count) {
  if (state.solvedAt) return;
  let done = 0;
  for (let i = 0; i < count; i++) {
    const nodes = fusableNodes();
    if (!nodes.length) break;
    const node = shuffle(nodes.slice())[0];
    doFuse(node, tilesOf(node.id), null);
    done += 1;
  }
  state.hint = '';
  io.emit('notice', { text: 'Host revealed ' + done + (done === 1 ? ' fusion' : ' fusions') });
  if (state.completed.length >= state.rootsTotal) finishGame(); else broadcast();
}

// ---------------------------------------------------------------------------
// Test mode bots
// ---------------------------------------------------------------------------
function botGuessText() {
  const open = openTiles();
  const nodes = fusableNodes();
  if (!nodes.length) return null;
  const good = tilesOf(nodes[Math.floor(Math.random() * nodes.length)].id).map((t) => t.n);
  const roll = Math.random();
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
// Game rules the host can change (Settings > Game rules). Scoring rules work at once; the round shape
// (groups per round / how many are 2-level) is used the next time a game is built.
function applyRules(p) {
  const int = (v, min, max, def) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def; };
  if (typeof p.comboEnabled === 'boolean') state.comboEnabled = p.comboEnabled;
  if (p.comboMax !== undefined) state.comboMax = int(p.comboMax, 1, 10, 4);
  if (typeof p.showNear === 'boolean') state.showNear = p.showNear;
  if (p.finalBonus !== undefined) state.finalBonus = int(p.finalBonus, 0, 100, 0);
  if (p.guessCooldown !== undefined) state.guessCooldown = clampSeconds(p.guessCooldown, { min: 0, max: 30, def: 0 });
  if (p.groupsPerRound !== undefined) state.groupsPerRound = int(p.groupsPerRound, 1, 8, 8);
  if (p.twoLevel !== undefined) state.twoLevel = int(p.twoLevel, 0, 8, 4);
  state.twoLevel = Math.min(state.twoLevel, state.groupsPerRound);
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
function setTikTokStatus(status, message, info) {
  const t = state.tiktok;
  info = info || {};
  t.statusText = message || '';
  t.phase = status === 'error' ? 'failed' : (['connecting', 'retrying', 'connected', 'disconnected'].includes(status) ? status : 'idle');
  t.username = currentTikTokUser || t.username || '';
  t.code = info.code || ''; t.reason = info.reason || ''; t.hint = info.hint || ''; t.detail = info.detail || '';
  t.attempt = Number(info.attempt) || 0; t.retryInSeconds = Number(info.retryInSeconds) || 0;
  t.roomId = status === 'connected' ? String(info.roomId || '') : '';
  t.updatedAt = Date.now();
  if (status === 'connected') { t.connected = true; t.connecting = false; t.lastError = null; t.uniqueId = currentTikTokUser; }
  else if (status === 'connecting' || status === 'retrying') { t.connected = false; t.connecting = true; t.lastError = null; }
  else if (status === 'error') { t.connected = false; t.connecting = false; t.lastError = t.reason || message || 'Connection error.'; }
  else { t.connected = false; t.connecting = false; t.lastError = null; }
  console.log('[TikTok status] ' + status + (info.code ? ' (' + info.code + ')' : '') + ': ' + (message || ''));
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
    packs: [{ id: 'mixed', label: 'Mixed (rotate all)' }].concat(PACKS.map((p) => ({ id: p.title, label: p.title }))),
  });

  socket.emit('chatHistory', chatLog.slice(-CHAT_MAX));
  let lastChatAt = 0;
  // Messages typed into the chat box on the page. They are read exactly like a TikTok comment (so "2 5 8 12" also works as a guess).
  socket.on('chat:send', safe((p) => {
    const now = Date.now();
    if (now - lastChatAt < 600) return;            // simple flood guard: one message per 0.6 s per screen
    lastChatAt = now;
    const text = String(p.text == null ? '' : p.text).trim().slice(0, 140);
    if (!text) return;
    const name = String(p.user || 'Host').replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, 24) || 'Host';
    const player = name === 'Host' ? { ...HOST_PLAYER } : { uniqueId: 'named-' + name.toLowerCase(), name, avatar: null };
    handleIncomingComment(player, text);
  }));
  socket.on('host:clearChat', safe(() => { chatLog.length = 0; io.emit('chatHistory', []); }, true));

  socket.on('host:applyDefaults', safe((p) => {
    if (state.configured) return;
    state.configured = true;
    const t = state.tiktok;
    if (!(t.connected || t.connecting) && ['offline', 'test', 'live'].includes(p.mode)) setMode(p.mode);
    if (typeof p.autoNext === 'boolean') state.autoNext = p.autoNext;
    if (p.autoNextDelaySeconds !== undefined) state.autoNextDelaySeconds = clampSeconds(p.autoNextDelaySeconds, TIMING.autoNext);
    if (p.mismatchSeconds !== undefined) state.mismatchSeconds = clampSeconds(p.mismatchSeconds, TIMING.mismatch);
    if (p.peekSeconds !== undefined) state.peekSeconds = clampSeconds(p.peekSeconds, TIMING.peek);
    if (p.pointsPerGroup !== undefined) state.pointsPerGroup = Math.round(clampSeconds(p.pointsPerGroup, { min: 1, max: 100, def: 1 }));
    applyRules(p);
    if (typeof p.pack === 'string' && p.pack !== state.pack && (p.pack === 'mixed' || PACKS.some((x) => x.title === p.pack))) { state.pack = p.pack; newGame(); }
    if (typeof p.bots === 'boolean') setBots(p.bots && state.mode === 'test');
    broadcast();
  }));

  socket.on('host:newGame', safe(() => newGame(), true));
  socket.on('host:setMode', safe((p) => setMode(p.mode), true));
  socket.on('host:setPack', safe((p) => {
    const id = String(p.pack || '');
    if (id === 'mixed' || PACKS.some((x) => x.title === id)) { state.pack = id; newGame(); }
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
    if (p.pointsPerGroup !== undefined) state.pointsPerGroup = Math.round(clampSeconds(p.pointsPerGroup, { min: 1, max: 100, def: 1 }));
    broadcast();
  }, true));
  socket.on('host:setRules', safe((p) => { applyRules(p); broadcast(); }, true));
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
    state.tiktok.username = username;
    if (state.mode !== 'live') setMode('live');
    tiktokConnector.connect(username, apiKey).catch((err) => {   // safety net: the window must never be left on "Connecting..."
      console.error('[TikTok] connect() threw:', err);
      setTikTokStatus('error', 'Connection failed: ' + (err && err.message ? err.message : err), { code: 'UNKNOWN', reason: 'Unexpected error: ' + (err && err.message ? err.message : err), hint: 'Try again. The full error is in the server log.' });
    });
  }, true));
  socket.on('tiktok:disconnect', safe(() => tiktokConnector.disconnect(), true));
});

loadAllTime();
newGame();

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
