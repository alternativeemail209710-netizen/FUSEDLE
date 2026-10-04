// Tiny WebAudio synth - no audio files needed. Starts after the Start button (browser gesture rule).
let ctx;
export function initAudio() {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    ctx.resume();
  } catch { /* audio unavailable */ }
}
function tone(freq, at, dur, type = 'triangle', vol = 0.16) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  const t = ctx.currentTime + at;
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}
export const sfx = {
  gather() { [300, 380, 460].forEach((f, i) => tone(f, i * 0.12, 0.2)); },
  burst() { [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.07, 0.3, 'square', 0.09)); },
  solved() { [659, 784, 988, 1318].forEach((f, i) => tone(f, i * 0.09, 0.35, 'sine', 0.2)); },
  victory() { [523, 659, 784, 659, 784, 1046, 1318].forEach((f, i) => tone(f, i * 0.13, 0.4, 'square', 0.1)); }
};
