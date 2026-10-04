import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const HINT_AFTER_MS = Number(process.env.HINT_AFTER_MS || 90000);
const VICTORY_MS = Number(process.env.VICTORY_MS || 11000);
const GUESS_COOLDOWN_MS = 300;

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
  for (const t of p.initialBoard) {
    if (producible.has(t.id)) errors.push(`duplicate tile id "${t.id}"`);
    producible.add(t.id);
  }
  for (const r of p.recipes) {
    if (r.kind === 'fuse') {
      if (producible.has(r.yields.id)) errors.push(`recipe ${r.id} yields duplicate id "${r.yields.id}"`);
      producible.add(r.yields.id);
    }
  }
  const consumed = new Map();
  for (const r of p.recipes) {
    if (!['fuse', 'category_solve'].includes(r.kind)) errors.push(`recipe ${r.id}: bad kind`);
    if (!r.requires || r.requires.length < 2) errors.push(`recipe ${r.id}: needs 2+ requires`);
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

export class GameManager {
  constructor({ emit }) {
    this.emit = emit;
    const raw = JSON.parse(fs.readFileSync(path.join(__dirname, 'puzzles.json'), 'utf8'));
    this.puzzles = raw.filter((p) => {
      const errs = validatePuzzle(p);
      if (errs.length) console.warn(`[puzzles] skipping "${p?.id}":`, errs.join('; '));
      return errs.length === 0;
    });
    if (!this.puzzles.length) throw new Error('No valid puzzles in server/puzzles.json');

    this.order = [];
    this.leaderboard = new Map(); // session-wide
    this.lastGuessAt = new Map();
    this.guessSeq = 0;
    this.victoryTimer = null;

    this.nextPuzzle();
    setInterval(() => this.hintTick(), 5000);
  }

  /* ------------------------------ puzzle lifecycle ------------------------------ */
  nextPuzzle() {
    clearTimeout(this.victoryTimer);
    if (!this.order.length) this.order = shuffle(this.puzzles.map((_, i) => i));
    const puzzle = this.puzzles[this.order.shift()];
    this.puzzle = puzzle;
    this.recipes = puzzle.recipes.map((r) => ({ ...r, requires: [...r.requires].sort(), done: false }));
    this.uidSeq = 0;
    this.numSeq = 0; // UI numbers only go up inside one puzzle: new fused tile = next number (e.g. 17)
    this.tiles = shuffle(puzzle.initialBoard).map((t) => this.makeTile(t, false));
    this.solved = [];
    this.status = 'playing';
    this.hintLevel = 0;
    this.lastProgress = Date.now();
    this.puzzleScores = new Map();
    this.emit('state', this.getState());
    console.log(`[game] puzzle "${puzzle.id}" started with ${this.tiles.length} tiles`);
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

  /* ------------------------------ chat -> game ------------------------------ */
  handleChat({ uniqueId, nickname, comment }) {
    if (this.status !== 'playing') return;
    const nums = parseGuess(comment);
    if (!nums) return;
    const key = uniqueId || nickname || 'viewer';
    const now = Date.now();
    if (now - (this.lastGuessAt.get(key) || 0) < GUESS_COOLDOWN_MS) return;
    this.lastGuessAt.set(key, now);
    const user = nickname || uniqueId || 'viewer';

    const outcome = this.evaluate(nums);
    if (outcome.result === 'correct') {
      this.applyRecipe(outcome.recipe, outcome.picked, { key, user }, nums);
    } else {
      this.emit('guess', { id: ++this.guessSeq, user, nums, result: outcome.result });
    }
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

    this.lastProgress = Date.now();
    this.hintLevel = 0;

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
      this.victoryTimer = setTimeout(() => this.nextPuzzle(), VICTORY_MS);
    }
  }

  /* ------------------------------ hints (keeps stalled streams moving) ------------------------------ */
  availableRecipes() {
    const have = new Set(this.tiles.map((t) => t.defId));
    return this.recipes.filter((r) => !r.done && r.requires.every((id) => have.has(id)));
  }

  hintTick() {
    if (this.status !== 'playing') return;
    if (Date.now() - this.lastProgress < HINT_AFTER_MS * (this.hintLevel + 1)) return;
    this.hintLevel += 1;
    this.emit('state', this.getState());
  }

  hintInfo() {
    if (this.hintLevel < 1) return null;
    const avail = this.availableRecipes();
    if (!avail.length) return null;
    const r = avail[0];
    const label = r.yields.label || r.yields.id;
    let text = `Hint: find the ${r.requires.length} tiles that make "${label}"`;
    let num = null;
    if (this.hintLevel >= 2) {
      const t = this.tiles.find((x) => x.defId === r.requires[(this.hintLevel - 2) % r.requires.length]);
      if (t) {
        num = t.num;
        text += ` - tile #${t.num} is one of them`;
      }
    }
    return { text, num };
  }

  /** Used by the demo bot: numbers of a currently solvable recipe. */
  suggestGuess() {
    const avail = this.availableRecipes();
    if (!avail.length) return null;
    const r = avail[Math.floor(Math.random() * avail.length)];
    return r.requires.map((id) => this.tiles.find((t) => t.defId === id).num);
  }

  /* ------------------------------ state ------------------------------ */
  getState() {
    const top = [...this.leaderboard.values()].sort((a, b) => b.score - a.score).slice(0, 5);
    const hint = this.hintInfo();
    const best = [...this.puzzleScores.entries()].sort((a, b) => b[1] - a[1])[0];
    return {
      puzzleId: this.puzzle.id,
      title: this.puzzle.title,
      puzzleNo: this.puzzles.indexOf(this.puzzle) + 1,
      totalPuzzles: this.puzzles.length,
      status: this.status,
      tiles: this.tiles,
      solved: this.solved,
      leaderboard: top.map(({ nickname, score, fusions }) => ({ nickname, score, fusions })),
      mvp: this.status === 'victory' && best ? this.leaderboard.get(best[0])?.nickname : null,
      hint: hint?.text || null,
      hintNum: hint?.num ?? null,
      progress: { done: this.recipes.filter((r) => r.done).length, total: this.recipes.length },
      playEnabled: process.env.DEBUG_MODE === 'true'
    };
  }
}
