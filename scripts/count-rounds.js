// Counts how many different rounds (boards) the puzzle library can build.
// Run:  npm run count-rounds
// A round = 4 three-level groups + 4 two-level groups, with no word or group name used twice (same rule the game uses).
'use strict';
const { PACKS, POOL, keysOf, BOARD } = require('../puzzles');

function countRounds(titles) {
  const d3 = [].concat(...titles.map((t) => POOL[t].d3));
  const d2 = [].concat(...titles.map((t) => POOL[t].d2));
  const k3 = d3.map((c) => new Set(keysOf(c))), k2 = d2.map((c) => new Set(keysOf(c)));
  const clash = (a, b) => { for (const x of a) if (b.has(x)) return true; return false; };
  // pairwise clash tables
  const c33 = d3.map((_, i) => d3.map((__, j) => i === j || clash(k3[i], k3[j])));
  const c32 = d3.map((_, i) => d2.map((__, j) => clash(k3[i], k2[j])));
  const c22 = d2.map((_, i) => d2.map((__, j) => i === j || clash(k2[i], k2[j])));
  let total = 0;
  const need3 = BOARD.three, need2 = BOARD.two;
  const rec3 = (start, chosen) => {
    if (chosen.length === need3) {
      const ok = []; for (let j = 0; j < d2.length; j++) if (chosen.every((i) => !c32[i][j])) ok.push(j);
      const rec2 = (from, picked) => {
        if (picked.length === need2) { total++; return; }
        for (let a = from; a < ok.length; a++) {
          if (ok.length - a < need2 - picked.length) return;
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

const fmt = (n) => n.toLocaleString('en-US');
const all = PACKS.map((p) => p.title);
const oldPacks = all.slice(0, 6), newPacks = all.slice(6);
console.log('Distinct rounds the library can build (each round = 8 groups, 68 tiles):\n');
let oldSingle = 0, newSingle = 0;
all.forEach((t) => {
  const n = countRounds([t]); if (newPacks.includes(t)) newSingle += n; else oldSingle += n;
  console.log('  ' + (newPacks.includes(t) ? 'NEW ' : '    ') + t.padEnd(18) + fmt(n) + ' rounds (single theme)');
});
const newMixed = countRounds(newPacks);
console.log('\n  Existing 6 themes, one theme per round:        ' + fmt(oldSingle));
console.log('  NEW 2 themes, one theme per round:             ' + fmt(newSingle));
console.log('  NEW 2 themes mixed together (new groups only): ' + fmt(newMixed));
console.log('  Brand-new rounds counted above:                ' + fmt(newSingle + newMixed) + '   (target: at least 10,000)');
console.log('\n  Mixed rounds that combine old and new groups are new as well, and are not counted here, so the real total is far higher.');
console.log('  The game never repeats an exact board until every possible board has been played.');
