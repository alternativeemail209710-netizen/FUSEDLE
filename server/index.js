import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import { GameManager } from './gameManager.js';
import { connectTikTok } from './tiktok.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, '..', 'dist');
const PORT = process.env.PORT || 3001;

// Local dev convenience: read .env if present (Render injects real env vars)
const envFile = path.join(__dirname, '..', '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

let tiktokStatus = 'idle';
const game = new GameManager({ emit: (event, payload) => io.emit(event, payload) });

app.get('/healthz', (_req, res) => res.json({ ok: true, tiktok: tiktokStatus, puzzle: game.puzzle.id }));

app.post('/admin/skip', (req, res) => {
  if (!process.env.ADMIN_KEY || req.query.key !== process.env.ADMIN_KEY) return res.sendStatus(403);
  game.nextPuzzle();
  res.json({ ok: true });
});

// Built React app
app.use(express.static(DIST));
app.use((_req, res) => {
  const index = path.join(DIST, 'index.html');
  if (!fs.existsSync(index)) return res.status(503).send('Frontend build missing - the build step (vite build) did not run.');
  res.sendFile(index);
});

io.on('connection', (socket) => {
  socket.emit('state', game.getState());
  socket.emit('tiktok_status', tiktokStatus);
  if (process.env.DEBUG_MODE === 'true') {
    socket.on('debug_guess', ({ user, text }) =>
      game.handleChat({ uniqueId: `dbg_${user || 'tester'}`, nickname: user || 'tester', comment: String(text || '') })
    );
  }
});

// ---- TikTok chat -> game ----
const username = (process.env.TIKTOK_USERNAME || '').replace(/^@/, '').trim();
const setStatus = (s) => {
  tiktokStatus = s;
  io.emit('tiktok_status', s);
};
if (username) {
  connectTikTok({ username, onChat: (m) => game.handleChat(m), onStatus: setStatus });
} else {
  console.warn('[tiktok] TIKTOK_USERNAME not set - running without live chat (use DEMO_BOT=true to preview)');
  setStatus('no-username');
}

// ---- Demo bot: fake viewers so you can preview everything without a stream ----
if (process.env.DEMO_BOT === 'true') {
  const names = ['Ava', 'Ben', 'Cleo', 'Dax', 'Eli', 'Fay'];
  setInterval(() => {
    const who = names[Math.floor(Math.random() * names.length)];
    const nums = Math.random() < 0.7 ? game.suggestGuess() : [1, 2, 3].sort(() => Math.random() - 0.5);
    if (nums) game.handleChat({ uniqueId: `bot_${who}`, nickname: who, comment: nums.join(' ') });
  }, 4500);
}

server.listen(PORT, () => console.log(`Fusion Associations Live on :${PORT}`));
