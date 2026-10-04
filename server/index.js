import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import { GameManager, MODES, selfTest } from './gameManager.js';
import { connectTikTok } from './tiktok.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, '..', 'dist');
const PORT = process.env.PORT || 3001;

// Local dev convenience: read .env if present (Render injects real env vars)
const envFile = path.join(__dirname, '..', '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

/* ------------------------------ config ------------------------------ */
const startMode = (process.env.MODE || 'test').toLowerCase();
if (!MODES.includes(startMode)) console.warn(`[config] MODE="${process.env.MODE}" is not one of ${MODES.join('/')} - using "test"`);
let mode = MODES.includes(startMode) ? startMode : 'test';

const username = (process.env.TIKTOK_USERNAME || '').replace(/^@/, '').trim();

const ADMIN_KEY = process.env.ADMIN_KEY || crypto.randomBytes(6).toString('hex');
if (!process.env.ADMIN_KEY) console.warn(`[config] ADMIN_KEY not set - temporary control-panel key for this run: ${ADMIN_KEY}`);
const keyOk = (k) => {
  const a = Buffer.from(String(k || ''));
  const b = Buffer.from(ADMIN_KEY);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

/* ------------------------------ app + game ------------------------------ */
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

let tiktokStatus = 'off';
let tiktok = null;
const game = new GameManager({ emit: (event, payload) => io.emit(event, payload), mode });

const setStatus = (s) => {
  tiktokStatus = s;
  io.emit('tiktok_status', s);
};

/* ---- Live mode: TikTok chat ---- */
function startTikTok() {
  if (tiktok) return;
  if (!username) {
    console.warn('[tiktok] TIKTOK_USERNAME is not set - Live mode has no chat to read');
    setStatus('no-username');
    return;
  }
  tiktok = connectTikTok({
    username,
    onChat: (m) => mode === 'live' && game.handleChat(m),
    onStatus: setStatus
  });
}
function stopTikTok() {
  tiktok?.stop();
  tiktok = null;
  setStatus('off');
}

/* ---- Test mode: simulated viewers (correct, "so close" and wrong guesses) ---- */
const bot = {
  enabled: process.env.TEST_BOT !== 'false',
  intervalMs: Number(process.env.TEST_BOT_MS || 4500),
  timer: null
};
const BOT_NAMES = ['Ava', 'Ben', 'Cleo', 'Dax', 'Eli', 'Fay'];
function botTurn() {
  const who = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
  const roll = Math.random();
  const nums = roll < 0.6 ? game.suggestGuess() : roll < 0.78 ? game.suggestGuess({ close: true }) : game.randomGuess();
  if (nums) game.handleChat({ uniqueId: `bot_${who}`, nickname: who, comment: nums.join(' ') });
}
function syncBot() {
  clearInterval(bot.timer);
  bot.timer = mode === 'test' && bot.enabled ? setInterval(botTurn, bot.intervalMs) : null;
}

/** Start/stop everything that belongs to the current mode. */
function syncIntegrations() {
  mode === 'live' ? startTikTok() : stopTikTok();
  syncBot();
}
function applyMode(next) {
  mode = next;
  game.setMode(next); // resets scores, loads a fresh puzzle, pushes state to the screen
  syncIntegrations();
  console.log(`[mode] now "${mode}"`);
}

/* ------------------------------ HTTP ------------------------------ */
app.get('/healthz', (_req, res) => res.json({ ok: true, mode, tiktok: tiktokStatus, puzzle: game.puzzle.id }));

// legacy skip endpoint (kept for old bookmarks)
app.post('/admin/skip', (req, res) => {
  if (!keyOk(req.query.key)) return res.sendStatus(403);
  game.nextPuzzle();
  res.json({ ok: true });
});

// Control panel API (the page is /control)
const api = express.Router();
api.use(express.json());
api.use((req, res, next) => (keyOk(req.get('x-admin-key')) ? next() : res.status(403).json({ error: 'Wrong or missing admin key' })));

const status = () => ({
  mode,
  modes: MODES,
  tiktok: tiktokStatus,
  username: username || null,
  bot: { enabled: bot.enabled, intervalMs: bot.intervalMs },
  game: game.adminState()
});
const testOnly = (res) => mode !== 'test' && (res.status(409).json({ error: 'Only available in Test mode' }), true);

api.get('/status', (_req, res) => res.json(status()));
api.post('/mode', (req, res) => {
  if (!MODES.includes(req.body?.mode)) return res.status(400).json({ error: 'Unknown mode' });
  if (req.body.mode !== mode) applyMode(req.body.mode);
  res.json(status());
});
api.post('/puzzle/next', (_req, res) => (game.nextPuzzle(), res.json(status())));
api.post('/puzzle/restart', (_req, res) => (game.restartPuzzle(), res.json(status())));
api.post('/puzzle/load', (req, res) => (game.loadPuzzle(req.body?.id) ? res.json(status()) : res.status(404).json({ error: 'Unknown puzzle' })));
api.post('/puzzles/reload', (_req, res) => {
  try {
    const info = game.reloadPuzzles();
    res.json({ ...status(), reload: info });
  } catch (e) {
    res.status(400).json({ error: `Reload failed, old puzzles kept: ${e.message}` });
  }
});
api.get('/selftest', (_req, res) => res.json(selfTest()));
api.post('/bot', (req, res) => {
  if (typeof req.body?.enabled === 'boolean') bot.enabled = req.body.enabled;
  const ms = Number(req.body?.intervalMs);
  if (ms >= 1000 && ms <= 30000) bot.intervalMs = ms;
  syncBot();
  res.json(status());
});
api.post('/solve-step', (_req, res) => {
  if (testOnly(res)) return;
  game.solveStep();
  res.json(status());
});
api.post('/guess', (req, res) => {
  if (testOnly(res)) return;
  game.handleChat({ uniqueId: 'tester', nickname: 'Tester', comment: String(req.body?.text || '') });
  res.json(status());
});
app.use('/api/control', api);

// Built React app: / = the game screen, /control = the control panel
const sendBuilt = (res, file) => {
  const f = path.join(DIST, file);
  if (!fs.existsSync(f)) return res.status(503).send('Frontend build missing - the build step (vite build) did not run.');
  res.sendFile(f);
};
app.get('/control', (_req, res) => sendBuilt(res, 'control.html'));
app.use(express.static(DIST));
app.use((_req, res) => sendBuilt(res, 'index.html'));

/* ------------------------------ sockets ------------------------------ */
io.on('connection', (socket) => {
  socket.emit('state', game.getState());
  socket.emit('tiktok_status', tiktokStatus);

  // Offline mode only: your own guesses typed on the game screen. Ignored in Live and Test.
  socket.on('player_guess', ({ text } = {}) => {
    if (mode !== 'offline') return;
    game.handleChat({ uniqueId: 'local_player', nickname: 'You', comment: String(text || '') });
  });
  socket.on('player_skip', () => {
    if (mode === 'offline') game.nextPuzzle();
  });
});

syncIntegrations();
server.listen(PORT, () => console.log(`Fusion Associations Live on :${PORT} - mode "${mode}"`));
