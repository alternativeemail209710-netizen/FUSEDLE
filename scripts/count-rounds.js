// Counts how many different rounds (boards) the puzzle library can build.
// Run:  npm run count-rounds
// A round = 4 three-level groups + 4 two-level groups, with no word or group name used twice (the same rule the game uses).
// Two rounds are "different" when their set of 8 groups differs (the same rule the game uses to avoid repeats).
//   - Single-theme counts are EXACT (every combination is enumerated).
//   - Mixed-theme counts are ESTIMATED by random sampling (exact enumeration would take far too long). The estimate is
//     (all possible picks) x (share of random picks that have no word clash), measured on 400,000 samples.
'use strict';
const { PACKS, POOL, keysOf, BOARD } = require('../puzzles');

const fmt = (n) => Math.round(n).toLocaleString('en-US');
const comb = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return r; };

function prep(titles) {
  const d3 = [].concat(...titles.map((t) => POOL[t].d3));
  const d2 = [].concat(...titles.map((t) => POOL[t].d2));
  return { d3, d2, k3: d3.map((c) => new Set(keysOf(c))), k2: d2.map((c) => new Set(keysOf(c))) };
}
const clash = (a, b) => { for (const x of a) if (b.has(x)) return true; return false; };

// Exact count for ONE theme.
function countExact(title) {
  const { d3, d2, k3, k2 } = prep([title]);
  const c33 = d3.map((_, i) => d3.map((__, j) => i === j || clash(k3[i], k3[j])));
  const c32 = d3.map((_, i) => d2.map((__, j) => clash(k3[i], k2[j])));
  const c22 = d2.map((_, i) => d2.map((__, j) => i === j || clash(k2[i], k2[j])));
  let total = 0;
  const rec3 = (start, chosen) => {
    if (chosen.length === BOARD.three) {
      const ok = []; for (let j = 0; j < d2.length; j++) if (chosen.every((i) => !c32[i][j])) ok.push(j);
      const rec2 = (from, picked) => {
        if (picked.length === BOARD.two) { total++; return; }
        for (let a = from; a < ok.length; a++) {
          if (ok.length - a < BOARD.two - picked.length) return;
          if (picked.every((p) => !c22[p][ok[a]])) { picked.push(ok[a]); rec2(a + 1, picked); picked.pop(); }
        }
      };
      rec2(0, []); return;
    }
    for (let i = start; i < d3.length; i++) if (chosen.every((c) => !c33[c][i])) { chosen.push(i); rec3(i + 1, chosen); chosen.pop(); }
  };
  rec3(0, []);
  return total;
}

// Sampling estimate for a MIX of several themes.
function estimateMixed(titles, samples) {
  const { d3, d2, k3, k2 } = prep(titles);
  if (d3.length < BOARD.three || d2.length < BOARD.two) return 0;
  let seed = 123456789; const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) / 4294967296); };
  const pick = (n, k) => { const s = new Set(); while (s.size < k) s.add(Math.floor(rnd() * n)); return [...s]; };
  let good = 0;
  for (let t = 0; t < samples; t++) {
    const a = pick(d3.length, BOARD.three), b = pick(d2.length, BOARD.two);
    const used = new Set(); let ok = true;
    for (const i of a) { for (const x of k3[i]) { if (used.has(x)) { ok = false; break; } used.add(x); } if (!ok) break; }
    if (ok) for (const j of b) { for (const x of k2[j]) { if (used.has(x)) { ok = false; break; } used.add(x); } if (!ok) break; }
    if (ok) good++;
  }
  return comb(d3.length, BOARD.three) * comb(d2.length, BOARD.two) * (good / samples);
}

const all = PACKS.map((p) => p.title);
const ORIGINAL = 8;                       // the first 8 themes shipped with the game (defined in puzzles.js)
const oldPacks = all.slice(0, ORIGINAL), newPacks = all.slice(ORIGINAL);

console.log('FUSEDLE round library (each round = ' + (BOARD.two + BOARD.three) + ' groups, ' + BOARD.tiles + ' tiles)\n');
console.log('Themes: ' + all.length + ' (' + oldPacks.length + ' original + ' + newPacks.length + ' new)\n');
console.log('Exact count of rounds per single theme:\n');
let oldSingle = 0, newSingle = 0, groupsNew = 0, minNew = Infinity;
all.forEach((t) => {
  const n = countExact(t); const isNew = newPacks.includes(t);
  if (isNew) { newSingle += n; groupsNew += PACKS.find((p) => p.title === t).three.length + PACKS.find((p) => p.title === t).two.length; minNew = Math.min(minNew, n); } else oldSingle += n;
  console.log('  ' + (isNew ? 'NEW ' : '    ') + t.padEnd(26) + fmt(n).padStart(10) + ' rounds');
});
const mixNew = estimateMixed(newPacks, 400000);
const mixAll = estimateMixed(all, 400000);
console.log('\nSummary');
console.log('  New themes, one theme per round (exact):         ' + fmt(newSingle));
console.log('  Smallest single new theme (exact):               ' + fmt(minNew) + '  (every new theme alone is above 50,000: ' + (minNew >= 50000 ? 'YES' : 'NO') + ')');
console.log('  New themes mixed together (estimate):            ' + fmt(mixNew));
console.log('  Whole library, all ' + all.length + ' themes mixed (estimate):    ' + fmt(mixAll));
console.log('  Original 8 themes, one theme per round (exact):  ' + fmt(oldSingle));
console.log('\n  Brand-new rounds counted from the new themes alone: at least ' + fmt(newSingle) + ' (target: 50,000)');
console.log('  The game never repeats an exact board until every possible board has been played.');

// ---- ALL 7 LEVELS: how many different rounds each difficulty level can build ----
// Level 1 = 8 innermost groups, Level 2 = 8 one-fusion-level groups, Level 3 = 4 + 4 (counted above),
// Levels 4 to 7 = one deep chain from each of the 8 themes (exact count = chains per theme multiplied together).
(function allLevels() {
  const { LADDERS } = require('../puzzles');
  let seed = 987654321; const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) / 4294967296); };
  const SAMPLES = 400000;
  // pick 8 pieces from a list of pieces; clash = a shared word / group name (or a plural twin)
  function estimate(pieces) {
    const keys = pieces.map((c) => new Set(keysOf(c)));
    let good = 0;
    for (let t = 0; t < SAMPLES; t++) {
      const pick = new Set(); while (pick.size < 8) pick.add(Math.floor(rnd() * pieces.length));
      const used = new Set(); let ok = true;
      for (const i of pick) { for (const x of keys[i]) { if (used.has(x)) { ok = false; break; } used.add(x); } if (!ok) break; }
      if (ok) good++;
    }
    return comb(pieces.length, 8) * (good / SAMPLES);
  }
  const all1 = [].concat(...PACKS.map((p) => POOL[p.title].d1)), all2 = [].concat(...PACKS.map((p) => POOL[p.title].d2));
  console.log('\nROUNDS PER DIFFICULTY LEVEL (all themes mixed)');
  console.log('  Level 1 Easy             ~ ' + fmt(estimate(all1)) + '   (from ' + all1.length + ' groups, 8 per round)');
  console.log('  Level 2 Moderate         ~ ' + fmt(estimate(all2)) + '   (from ' + all2.length + ' groups, 8 per round)');
  const d3 = [].concat(...PACKS.map((p) => POOL[p.title].d3)), d2b = all2;
  console.log('  Level 3 Hard             ~ ' + fmt(estimateMixed(PACKS.map((p) => p.title), 400000)) + '   (4 three-level + 4 two-level groups)');
  const themes = {}; LADDERS.forEach((l) => { themes[l.theme] = (themes[l.theme] || 0) + 1; });
  const deepTotal = Object.values(themes).reduce((a, b) => a * b, 1);
  ['Level 4 Very Hard      ', 'Level 5 Extreme        ', 'Level 6 Extremely Hard ', 'Level 7 Insane         '].forEach((n) => console.log('  ' + n + '   = ' + fmt(deepTotal) + '   (exact: ' + Object.values(themes).join(' x ') + ' chains over ' + Object.keys(themes).length + ' themes)'));
})();
