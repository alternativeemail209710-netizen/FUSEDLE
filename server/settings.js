import fs from 'fs';
import path from 'path';

/**
 * Every host-adjustable setting lives here: default, limits, label and help text.
 * The server validates against this list and the host panel is generated from it,
 * so adding a setting = adding one line here (+ using it in the game code).
 */
export const SCHEMA = [
  // ---- Display ----
  { key: 'gameName', group: 'Display', label: 'Game name', type: 'text', max: 28, default: 'Fusion Associations', help: 'Shown in the screen header and the host toolbar.' },
  { key: 'safeZone', group: 'Display', label: 'Keep right side clear for TikTok icons', type: 'bool', default: true, help: 'Leaves the right 15% of text areas empty so TikTok buttons never cover them.' },
  { key: 'showLeaderboard', group: 'Display', label: 'Show leaderboard', type: 'bool', default: true },
  { key: 'feedRows', group: 'Display', label: 'Guess feed rows', type: 'number', min: 3, max: 8, step: 1, default: 5, help: 'How many recent guesses are listed (also limited by screen space).' },
  { key: 'soundVolume', group: 'Display', label: 'Sound volume', type: 'number', min: 0, max: 100, step: 5, unit: '%', default: 70, help: '0 = muted. Applies to the screen that is shown on stream.' },
  // ---- Gameplay ----
  { key: 'puzzleOrder', group: 'Gameplay', label: 'Puzzle order (Live & Offline)', type: 'select', options: [['shuffle', 'Shuffle'], ['sequential', 'In file order']], default: 'shuffle', help: 'Test mode always goes in file order so every puzzle gets checked.' },
  { key: 'victorySec', group: 'Gameplay', label: 'Victory screen time', type: 'number', min: 3, max: 60, step: 1, unit: 's', default: 11, help: 'How long "Puzzle cleared!" shows before the next puzzle.' },
  { key: 'autoSkipMin', group: 'Gameplay', label: 'Auto-skip stalled puzzle (Live only)', type: 'number', min: 0, max: 60, step: 1, unit: 'min', default: 0, help: 'Moves on if nobody solves a group for this long. 0 = never.' },
  { key: 'closeFeedback', group: 'Gameplay', label: 'Show "so close" feedback', type: 'bool', default: true, help: 'Amber glow when a guess has exactly one wrong tile.' },
  { key: 'pointsPerTile', group: 'Gameplay', label: 'Points per tile', type: 'number', min: 1, max: 100, step: 1, default: 10 },
  { key: 'categoryBonus', group: 'Gameplay', label: 'Bonus for the final category', type: 'number', min: 0, max: 500, step: 5, default: 25 },
  // ---- Chat ----
  { key: 'guessCooldownMs', group: 'TikTok chat', label: 'Guess cooldown per viewer', type: 'number', min: 0, max: 5000, step: 100, unit: 'ms', default: 300, help: 'Minimum gap between two guesses from the same viewer.' },
  { key: 'tiktokUsername', group: 'TikTok chat', label: 'TikTok username (no @)', type: 'text', max: 40, default: '', help: 'Changing it reconnects the chat right away if you are Live.' },
  { key: 'tiktokSessionId', group: 'TikTok chat', label: 'TikTok session ID (optional)', type: 'secret', max: 200, default: '', help: 'Can help if TikTok rate-limits the connection. Never shown again after saving.' },
  // ---- Offline ----
  { key: 'playerName', group: 'Offline mode', label: 'Your name on the leaderboard', type: 'text', max: 20, default: 'You' },
  // ---- Test ----
  { key: 'botEnabled', group: 'Test mode', label: 'Simulated viewers', type: 'bool', default: true },
  { key: 'botIntervalMs', group: 'Test mode', label: 'Simulated guess every', type: 'number', min: 1000, max: 30000, step: 500, unit: 'ms', default: 4500 },
  { key: 'botAccuracy', group: 'Test mode', label: 'Simulated accuracy', type: 'number', min: 0, max: 100, step: 5, unit: '%', default: 60, help: 'Share of simulated guesses that are correct. The rest are "so close" or wrong.' }
];

const BY_KEY = Object.fromEntries(SCHEMA.map((f) => [f.key, f]));

/** Returns a clean value for the field, or undefined if the input is unusable. */
function clean(f, v) {
  switch (f.type) {
    case 'bool':
      return typeof v === 'boolean' ? v : undefined;
    case 'number': {
      const n = Number(v);
      if (v === '' || v === null || !Number.isFinite(n)) return undefined;
      return Math.min(f.max, Math.max(f.min, f.step >= 1 ? Math.round(n) : n));
    }
    case 'select':
      return f.options.some(([val]) => val === v) ? v : undefined;
    case 'text':
    case 'secret': {
      if (typeof v !== 'string') return undefined;
      let s = v.trim().slice(0, f.max);
      if (f.key === 'tiktokUsername') s = s.replace(/^@/, '');
      return s;
    }
    default:
      return undefined;
  }
}

export function createSettings({ dataDir, env = process.env }) {
  const file = path.join(dataDir, 'settings.json');

  // defaults, then environment variables (so a Render env var still works as the starting value)
  const base = Object.fromEntries(SCHEMA.map((f) => [f.key, f.default]));
  const fromEnv = {
    gameName: env.GAME_NAME,
    tiktokUsername: env.TIKTOK_USERNAME,
    tiktokSessionId: env.TIKTOK_SESSION_ID,
    victorySec: env.VICTORY_MS ? Number(env.VICTORY_MS) / 1000 : undefined,
    botEnabled: env.TEST_BOT ? env.TEST_BOT !== 'false' : undefined,
    botIntervalMs: env.TEST_BOT_MS ? Number(env.TEST_BOT_MS) : undefined
  };
  for (const [k, v] of Object.entries(fromEnv)) {
    const c = v === undefined ? undefined : clean(BY_KEY[k], v);
    if (c !== undefined) base[k] = c;
  }

  const values = { ...base };

  // then whatever the host saved earlier
  try {
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const f of SCHEMA) {
      const c = clean(f, saved[f.key]);
      if (c !== undefined) values[f.key] = c;
    }
  } catch { /* no saved settings yet */ }

  let warned = false;
  const save = () => {
    try {
      fs.mkdirSync(dataDir, { recursive: true });
      fs.writeFileSync(file, JSON.stringify(values, null, 2));
    } catch (e) {
      if (!warned) console.warn(`[settings] could not save to ${file}: ${e.message} (changes still apply until restart)`);
      warned = true;
    }
  };

  return {
    schema: SCHEMA,
    values,
    /** Apply a partial update. Returns the keys that actually changed. */
    update(partial = {}) {
      const changed = [];
      for (const [k, v] of Object.entries(partial)) {
        const f = BY_KEY[k];
        if (!f) continue;
        const c = clean(f, v);
        if (c === undefined || c === values[k]) continue;
        values[k] = c;
        changed.push(k);
      }
      if (changed.length) save();
      return changed;
    },
    reset() {
      const changed = SCHEMA.filter((f) => values[f.key] !== base[f.key]).map((f) => f.key);
      Object.assign(values, base);
      try { fs.rmSync(file, { force: true }); } catch { /* nothing saved */ }
      return changed;
    },
    /** Values for the host panel: secrets are never sent back, only whether one is set. */
    adminView() {
      const out = { ...values };
      const secretSet = {};
      for (const f of SCHEMA) {
        if (f.type === 'secret') {
          secretSet[f.key] = !!values[f.key];
          out[f.key] = '';
        }
      }
      return { values: out, secretSet };
    },
    /** The small slice the game screen needs. */
    ui() {
      const { gameName, safeZone, showLeaderboard, feedRows, soundVolume } = values;
      return { gameName, safeZone, showLeaderboard, feedRows, soundVolume };
    }
  };
}
