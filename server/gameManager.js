import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUZZLES_FILE = path.join(__dirname, 'puzzles.json');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

export const MODES = ['test', 'live', 'offline'];
const GUESS_COOLDOWN_MS = 300;
const MAX_GROUP = 12; // chat parser accepts at most 12 numbers per guess

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/**
 * Chat parsing: "2 5 8 12" or "2,5,8,12" -> [2,5,8,12]. Anything else -> null (ignored).
 * Needs at least 2 numbers, so a lone "7" in chat never counts as a guess.
 */
export function parseGuess(text) {
  if (typeof text !== 'string') return null;
  const t = text.trim();
  if (!/^\d{1,3}([\s,]+\d{1,3}){1,11}$/.test(t)) return null;
  return t.split(/[\s,]+/).map(Number);
}

/** Checks a puzzle can really be played to an empty board. Returns a list of problems. */
export function validatePuzzle(p) {
  const errors = [];
  if (!p?.id || !Array.isArray(p.initialBoard) || !Array.isArray(p.recipes)) {
    return ['missing id / initialBoard / recipes'];
  }
  const producible = new Set();
  const solvedIds = new Set();
  for (const t of p.initialBoard) {
    if (producible.has(t.id)) errors.push(`duplicate tile id "${t.id}"`);
    producible.add(t.id);
  }
  for (const r of p.recipes) {
    if (!r.yields?.id) {
      errors.push(`recipe ${r.id}: missing yields.id`);
      continue;
    }
    if (r.kind === 'fuse') {
      if (producible.has(r.yields.id)) errors.push(`recipe ${r.id} yields duplicate id "${r.yields.id}"`);
      producible.add(r.yields.id);
    } else if (r.kind === 'category_solve') {
      if (solvedIds.has(r.yields.id)) errors.push(`recipe ${r.id}: duplicate solved id "${r.yields.id}"`);
      solvedIds.add(r.yields.id);
    }
  }
  const consumed = new Map();
  for (const r of p.recipes) {
    if (!['fuse', 'category_solve'].includes(r.kind)) errors.push(`recipe ${r.id}: bad kind`);
    if (!r.requires || r.requires.length < 2) errors.push(`recipe ${r.id}: needs 2+ requires`);
    if (r.requires?.length > MAX_GROUP) errors.push(`recipe ${r.id}: needs ${r.requires.length} tiles, chat guesses allow at most ${MAX_GROUP}`);
    for (const id of r.requires || []) {
      if (!producible.has(id)) errors.push(`recipe ${r.id} requires unknown tile "${id}"`);
      consumed.set(id, (consumed.get(id) || 0) + 1);
    }
  }
  for (const id of producible) {
    const n = consumed.get(id) || 0;
    if (n !== 1) errors.push(`tile "${id}" is consumed ${n} times (must be exactly 1)`);
  }
  return errors;
}

/**
 * Full health check of puzzles.json, read fresh from disk (does not touch the running game).
 * Per puzzle: structure, missing local images, and a headless play-through to an empty board.
 */
export function selfTest() {
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(PUZZLES_FILE, 'utf8'));
    if (!Array.isArray(raw)) throw new Error('top level must be an array');
  } catch (e) {
    return { ok: false, fatal: `puzzles.json cannot be read: ${e.message}`, results: [] };
  }

  const results = raw.map((p) => {
    const errors = validatePuzzle(p);
    const warnings = [];
    let steps = 0;
    if (!p?.title) warnings.push('no title');

    if (!errors.length) {
      // images: local files must exist in public/, remote URLs cannot be checked here
      const defs = [...p.initialBoard, ...p.recipes.map((r) => r.yields)];
      for (const d of defs) {
        if (d.type !== 'image') continue;
        if (/^https?:\/\//i.test(d.content)) warnings.push(`remote image not checked: ${d.content}`);
        else if (!fs.existsSync(path.join(PUBLIC_DIR, String(d.content)))) errors.push(`image file missing: public${d.content}`);
      }
      if (p.initialBoard.length > 20) warnings.push(`${p.initialBoard.length} starting tiles - they will look small on screen`);

      // headless play-through
      const have = new Set(p.initialBoard.map((t) => t.id));
      const open = p.recipes.map((r) => ({ ...r, done: false }));
      let progressed = true;
      while (progressed) {
        progressed = false;
        for (const r of open) {
          if (r.done || !r.requires.every((id) => have.has(id))) continue;
          r.requires.forEach((id) => have.delete(id));
          if (r.kind === 'fuse') have.add(r.yields.id);
          r.done = true;
          steps++;
          progressed = true;
        }
      }
      if (!(open.every((r) => r.done) && have.size === 0)) {
        errors.push('cannot be played to an empty board (circular or unreachable recipes)');
      }
    }
    return {
      id: p?.id || '(no id)',
      title: p?.title || '',
      tiles: p?.initialBoard?.length || 0,
      groups: p?.recipes?.length || 0,
      steps,
      ok: errors.length === 0,
      errors,
      warnings
    };
  });
  return { ok: results.length > 0 && results.every((r) => r.ok), results };
}

export class GameManager {
  constructor({ emit, mode = 'test' }) {
    this.emit = emit;
    this.mode = MODES.includes(mode) ? mode : 'test';
    this.victoryMs = Number(process.env.VICTORY_MS || 11000);
    this.loadPuzzles();

    this.order = [];
    this.puzzle = null;
    this.leaderboard = new Map(); // per mode session
    this.lastGuessAt = new Map();
    this.guessSeq = 0;
    this.victoryTimer = null;

    this.nextPuzzle();
  }

  /* ------------------------------ puzzles ------------------------------ */
  loadPuzzles() {
    const raw = JSON.parse(fs.readFileSync(PUZZLES_FILE, 'utf8'));
    const skipped = [];
    const good = raw.filter((p) => {
      const errs = validatePuzzle(p);
      if (errs.length) {
        skipped.push({ id: p?.id, errors: errs });
        console.warn(`[puzzles] skipping "${p?.id}":`, errs.join('; '));
      }
      return errs.length === 0;
    });
    if (!good.length) throw new Error('No valid puzzles in server/puzzles.json');
    this.puzzles = good; // assigned only after validation, so a bad reload keeps the old set
    this.skipped = skipped;
  }

  /** Re-read puzzles.json without restarting the server; restarts the current puzzle. */
  reloadPuzzles() {
    this.loadPuzzles();
    this.order = [];
    const keep = this.puzzles.find((p) => p.id === this.puzzle?.id);
    keep ? this.startPuzzle(keep) : this.nextPuzzle();
    return { count: this.puzzles.length, skipped: this.skipped };
  }

  refillOrder() {
    const idx = this.puzzles.map((_, i) => i);
    if (this.mode === 'test') {
      this.order = idx; // test mode walks through every puzzle in file order
      return;
    }
    const o = shuffle(idx);
    if (o.length > 1 && this.puzzles[o[0]].id === this.puzzle?.id) o.push(o.shift());
    this.order = o;
  }

  nextPuzzle() {
    if (!this.order.length) this.refillOrder();
    this.startPuzzle(this.puzzles[this.order.shift()]);
  }

  loadPuzzle(id) {
    const i = this.puzzles.findIndex((p) => p.id === id);
    if (i < 0) return false;
    this.order = this.mode === 'test' ? this.puzzles.map((_, k) => k).slice(i + 1) : this.order.filter((k) => k !== i);
    this.startPuzzle(this.puzzles[i]);
    return true;
  }

  restartPuzzle() {
    this.startPuzzle(this.puzzle);
  }

  startPuzzle(puzzle) {
    clearTimeout(this.victoryTimer);
    this.puzzle = puzzle;
    this.recipes = puzzle.recipes.map((r) => ({ ...r, requires: [...r.requires].sort(), done: false }));
    this.uidSeq = 0;
    this.numSeq = 0; // UI numbers only go up inside one puzzle: new fused tile = next number (e.g. 17)
    this.tiles = shuffle(puzzle.initialBoard).map((t) => this.makeTile(t, false));
    this.solved = [];
    this.status = 'playing';
    this.puzzleScores = new Map();
    this.emit('state', this.getState());
    console.log(`[game] (${this.mode}) puzzle "${puzzle.id}" started with ${this.tiles.length} tiles`);
  }

  /** Switching mode wipes scores (test scores must never leak into a live session) and starts fresh. */
  setMode(mode) {
    if (!MODES.includes(mode)) return false;
    this.mode = mode;
    this.leaderboard.clear();
    this.lastGuessAt.clear();
    this.order = [];
    this.nextPuzzle();
    return true;
  }

  makeTile(def, fused) {
    return {
      uid: `u${++this.uidSeq}`,
      num: ++this.numSeq,
      defId: def.id,
      type: def.type,
      content: def.content,
      label: def.label || null,
      fused
    };
  }

  /* ------------------------------ guesses -> game ------------------------------ */
  /** Raw text (chat comment or typed guess). Callers decide which sources are allowed in which mode. */
  handleChat({ uniqueId, nickname, comment }) {
    if (this.status !== 'playing') return;
    const nums = parseGuess(comment);
    if (!nums) return;
    const key = uniqueId || nickname || 'viewer';
    const now = Date.now();
    if (now - (this.lastGuessAt.get(key) || 0) < GUESS_COOLDOWN_MS) return;
    this.lastGuessAt.set(key, now);
    this.submitGuess({ key, user: nickname || uniqueId || 'viewer', nums });
  }

  submitGuess({ key, user, nums }) {
    const outcome = this.evaluate(nums);
    if (outcome.result === 'correct') {
      this.applyRecipe(outcome.recipe, outcome.picked, { key, user }, nums);
    } else {
      this.emit('guess', { id: ++this.guessSeq, user, nums, result: outcome.result });
    }
    return outcome.result;
  }

  /** UI numbers -> tiles -> internal defIds -> compare with every unsolved recipe's `requires`. */
  evaluate(nums) {
    if (new Set(nums).size !== nums.length) return { result: 'wrong' };
    const byNum = new Map(this.tiles.map((t) => [t.num, t]));
    if (nums.some((n) => !byNum.has(n))) return { result: 'wrong' };
    const picked = nums.map((n) => byNum.get(n));
    const ids = picked.map((t) => t.defId).sort();

    const open = this.recipes.filter((r) => !r.done);
    const exact = open.find((r) => r.requires.length === ids.length && r.requires.every((id, i) => id === ids[i]));
    if (exact) return { result: 'correct', recipe: exact, picked };

    // "so close": right number of tiles, exactly one wrong
    const close = open.some(
      (r) => r.requires.length === ids.length && ids.filter((id) => r.requires.includes(id)).length === ids.length - 1
    );
    return { result: close ? 'close' : 'wrong' };
  }

  applyRecipe(recipe, picked, who, nums) {
    const consumedUids = picked.map((t) => t.uid);
    const consumedNums = picked.map((t) => t.num);
    this.tiles = this.tiles.filter((t) => !consumedUids.includes(t.uid));
    recipe.done = true;

    let newTile = null;
    let solvedEntry = null;
    let points = picked.length * 10;

    if (recipe.kind === 'category_solve') {
      solvedEntry = { ...recipe.yields, defId: recipe.yields.id, by: who.user };
      this.solved.push(solvedEntry);
      points += 25;
    } else {
      newTile = this.makeTile(recipe.yields, true);
      this.tiles.push(newTile);
    }

    const row = this.leaderboard.get(who.key) || { key: who.key, nickname: who.user, score: 0, fusions: 0 };
    row.nickname = who.user;
    row.score += points;
    row.fusions += 1;
    this.leaderboard.set(who.key, row);
    this.puzzleScores.set(who.key, (this.puzzleScores.get(who.key) || 0) + points);

    const won = this.tiles.length === 0;
    if (won) this.status = 'victory';

    this.emit('guess', { id: ++this.guessSeq, user: who.user, nums, result: 'correct', points });
    this.emit('fusion_success', {
      user: who.user,
      points,
      kind: recipe.kind,
      consumedUids,
      consumedNums,
      newTile,
      solvedEntry,
      state: this.getState()
    });
    console.log(`[game] ${who.user} fused ${consumedNums.join(' ')} -> ${recipe.yields.label || recipe.yields.id}`);

    if (won) {
      this.victoryTimer = setTimeout(() => this.nextPuzzle(), this.victoryMs);
    }
  }

  /* ------------------------------ helpers for the test bot / control panel ------------------------------ */
  availableRecipes() {
    const have = new Set(this.tiles.map((t) => t.defId));
    return this.recipes.filter((r) => !r.done && r.requires.every((id) => have.has(id)));
  }

  numsFor(recipe) {
    return recipe.requires.map((id) => this.tiles.find((t) => t.defId === id).num);
  }

  /** Numbers of a solvable group. close:true swaps one tile for a wrong one (triggers the "so close" glow). */
  suggestGuess({ close = false } = {}) {
    const avail = this.availableRecipes();
    if (!avail.length) return null;
    const r = avail[Math.floor(Math.random() * avail.length)];
    const nums = this.numsFor(r);
    if (!close) return nums;
    const outsiders = this.tiles.filter((t) => !r.requires.includes(t.defId));
    if (!outsiders.length) return null;
    nums[Math.floor(Math.random() * nums.length)] = outsiders[Math.floor(Math.random() * outsiders.length)].num;
    return nums;
  }

  randomGuess() {
    if (this.tiles.length < 2) return null;
    const k = Math.min(this.tiles.length, 2 + Math.floor(Math.random() * 3));
    return shuffle(this.tiles).slice(0, k).map((t) => t.num);
  }

  /** Test mode: solve one available group right now (to preview animations). */
  solveStep(user = 'Auto-solver') {
    if (this.status !== 'playing') return false;
    const r = this.availableRecipes()[0];
    if (!r) return false;
    this.submitGuess({ key: 'auto_solver', user, nums: this.numsFor(r) });
    return true;
  }

  /** Answer key for the control panel only (never sent to the stream page). */
  adminState() {
    const have = new Map(this.tiles.map((t) => [t.defId, t]));
    return {
      puzzleId: this.puzzle.id,
      title: this.puzzle.title,
      status: this.status,
      puzzles: this.puzzles.map((p) => ({ id: p.id, title: p.title })),
      skipped: this.skipped,
      answerKey: this.recipes.map((r) => {
        const available = r.requires.every((id) => have.has(id));
        return {
          id: r.id,
          result: r.yields.label || r.yields.id,
          kind: r.kind,
          done: r.done,
          available,
          nums: !r.done && available ? r.requires.map((id) => have.get(id).num).sort((a, b) => a - b) : null,
          requires: r.requires
        };
      })
    };
  }

  /* ------------------------------ state sent to the stream page ------------------------------ */
  getState() {
    const top = [...this.leaderboard.values()].sort((a, b) => b.score - a.score).slice(0, 5);
    const best = [...this.puzzleScores.entries()].sort((a, b) => b[1] - a[1])[0];
    return {
      mode: this.mode,
      puzzleId: this.puzzle.id,
      title: this.puzzle.title,
      puzzleNo: this.puzzles.indexOf(this.puzzle) + 1,
      totalPuzzles: this.puzzles.length,
      status: this.status,
      tiles: this.tiles,
      solved: this.solved,
      leaderboard: top.map(({ nickname, score, fusions }) => ({ nickname, score, fusions })),
      mvp: this.status === 'victory' && best ? this.leaderboard.get(best[0])?.nickname : null,
      progress: { done: this.recipes.filter((r) => r.done).length, total: this.recipes.length }
    };
  }
}
