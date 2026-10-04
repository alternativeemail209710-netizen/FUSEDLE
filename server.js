const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { TikTokLiveConnection } = require('tiktok-live-connector');
const P = require('./puzzles');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static('public'));

const POINTS = 40, GROUPS = 6;
let pi = 0, tiles = [], groups = [], solved = [], done = false;
let hint = '', feed = [], scores = {}, msg = '', connected = false, conn = null;
let botTimer = null, mode = 'test', nextTimer = null;

const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

function load(i) {
  pi = ((i % P.length) + P.length) % P.length;
  groups = P[pi].groups.map(([name, w]) => ({ name, words: w.split(',') }));
  const all = [];
  groups.forEach((g, gi) => g.words.forEach(w => all.push({ w, g: gi })));
  tiles = shuffle(all).map((t, k) => ({ n: k + 1, w: t.w, g: t.g }));
  solved = []; done = false; hint = ''; feed = [];
}
const open = () => tiles.filter(t => !solved.includes(t.g));

function state() {
  return {
    puzzle: pi + 1, total: P.length, title: P[pi].title, groupsTotal: GROUPS,
    tiles: open().map(({ n, w }) => ({ n, w })),
    solved: solved.map(g => ({ g, name: groups[g].name, words: groups[g].words })),
    done, hint, feed: feed.slice(-4), msg, connected, mode, bots: !!botTimer,
    top: Object.entries(scores).sort((a, b) => b[1] - a[1]).slice(0, 10)
  };
}
const emit = () => io.emit('state', state());
const say = t => { msg = t; emit(); };

function finishIfDone() {
  if (solved.length < GROUPS) return;
  done = true;
  clearTimeout(nextTimer);
  nextTimer = setTimeout(() => { load(pi + 1); emit(); }, 7000);
}

function guess(user, text) {
  if (done) return;
  text = String(text || '').trim();
  if (!/^[\d\s,.+\-]+$/.test(text)) return;           // numbers only, ignore normal chat
  const nums = [...new Set(text.match(/\d+/g).map(Number))];
  if (nums.length !== 4) return;                        // every guess is exactly 4 tiles
  const avail = open();
  const picked = nums.map(n => avail.find(t => t.n === n));
  if (picked.some(t => !t)) return;                     // number not on the board
  const counts = {};
  picked.forEach(t => counts[t.g] = (counts[t.g] || 0) + 1);
  const best = Math.max(...Object.values(counts));
  let r = 'x', p = 0;
  if (best === 4) { r = 'ok'; p = POINTS; scores[user] = (scores[user] || 0) + p; solved.push(picked[0].g); finishIfDone(); }
  else if (best === 3) r = 'near';
  feed.push({ u: user, n: nums.join(' '), r, p });
}

function hintNow() {
  const g = shuffle(open().map(t => t.g).filter((v, i, a) => a.indexOf(v) === i))[0];
  if (g === undefined) return;
  const t = shuffle(open().filter(t => t.g === g))[0];
  hint = `Hint: "${groups[g].name}" includes tile ${t.n}`;
}
function revealNow() {
  const o = open(); if (!o.length) return;
  solved.push(shuffle(o)[0].g); hint = ''; finishIfDone();
}

function botTick() {
  if (done) return;
  const names = ['Fay', 'Dax', 'Ava', 'Cleo'];
  const user = names[Math.floor(Math.random() * 4)];
  const o = open();
  let pick;
  if (Math.random() < 0.4) pick = shuffle(o.filter(t => t.g === o[Math.floor(Math.random() * o.length)].g)).slice(0, 4);
  else pick = shuffle(o.slice()).slice(0, 4);
  if (pick.length === 4) guess(user, pick.map(t => t.n).join(' '));
  emit();
}

async function connectTikTok(username) {
  username = String(username || '').replace('@', '').trim();
  if (!username) return say('Enter your TikTok username first.');
  if (!process.env.TIKTOK_SIGN_API_KEY) return say('Missing TIKTOK_SIGN_API_KEY. Add it in Render > Environment.');
  try { conn && conn.disconnect(); } catch (e) {}
  conn = new TikTokLiveConnection(username, { signApiKey: process.env.TIKTOK_SIGN_API_KEY });
  conn.on('chat', d => {
    const text = d.comment ?? d.content ?? d.text ?? '';
    const user = d.user?.nickname ?? d.nickname ?? d.user?.uniqueId ?? d.uniqueId ?? 'viewer';
    guess(user, text); emit();
  });
  conn.on('disconnected', () => { connected = false; say('TikTok disconnected.'); });
  say('Connecting...');
  try { await conn.connect(); connected = true; mode = 'live'; say('Connected to @' + username); }
  catch (e) { connected = false; say('Could not connect: ' + (e.message || e) + '. Go LIVE first, then tap Connect.'); }
}

io.on('connection', s => {
  s.emit('state', state());
  s.on('host', async (a = {}) => {
    switch (a.act) {
      case 'guess': guess(a.name || 'Host', a.text); break;
      case 'hint': hintNow(); break;
      case 'reveal': revealNow(); break;
      case 'skip': clearTimeout(nextTimer); load(pi + 1); break;
      case 'reset': scores = {}; break;
      case 'mode': mode = a.mode === 'live' ? 'live' : 'test'; break;
      case 'bots':
        clearInterval(botTimer); botTimer = null;
        if (a.on) botTimer = setInterval(botTick, 2200);
        break;
      case 'connect': await connectTikTok(a.user); return;
    }
    emit();
  });
});

load(Number(process.env.START_PUZZLE || 0));
server.listen(process.env.PORT || 3000, () => console.log('Fusion Associations running'));
