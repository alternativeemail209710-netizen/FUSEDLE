import { useCallback, useEffect, useRef, useState } from 'react';
import { socket } from './socket.js';
import { sfx } from './sfx.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const GATHER_MS = 700;
export const BURST_MS = 1000;

/**
 * Owns all live state. Server events that change the board go through a promise queue so
 * a fusion animation always finishes (gather -> burst -> settle) before the next change shows.
 */
export function useGame() {
  const [game, setGame] = useState(null);
  const [anim, setAnim] = useState(null); // {phase:'gather'|'burst', offsets, newTile, solvedEntry, user, points}
  const [feed, setFeed] = useState([]);
  const [tiktok, setTiktok] = useState('idle');
  const [online, setOnline] = useState(socket.connected);
  const [pulse, setPulse] = useState(null);
  const lastPulse = useRef(0);

  const boardEl = useRef(null);
  const tileEls = useRef(new Map());
  const queue = useRef(Promise.resolve());
  const enqueue = (fn) => {
    queue.current = queue.current.then(fn).catch((e) => console.error(e));
  };

  const registerTile = useCallback((uid, el) => {
    if (el) tileEls.current.set(uid, el);
    else tileEls.current.delete(uid);
  }, []);

  useEffect(() => {
    const onState = (s) => enqueue(async () => setGame(s));

    const onFusion = (p) =>
      enqueue(async () => {
        // Where is each consumed tile relative to the board centre?
        const offsets = {};
        const b = boardEl.current?.getBoundingClientRect();
        if (b) {
          const cx = b.left + b.width / 2;
          const cy = b.top + b.height / 2;
          p.consumedUids.forEach((uid) => {
            const el = tileEls.current.get(uid);
            if (!el) return;
            const r = el.getBoundingClientRect();
            offsets[uid] = { x: cx - (r.left + r.width / 2), y: cy - (r.top + r.height / 2) };
          });
        }
        const base = { offsets, newTile: p.newTile, solvedEntry: p.solvedEntry, user: p.user, points: p.points };
        setAnim({ phase: 'gather', ...base });
        sfx.gather();
        await sleep(GATHER_MS);

        setAnim({ phase: 'burst', ...base });
        p.kind === 'category_solve' ? sfx.solved() : sfx.burst();
        await sleep(BURST_MS);

        setGame(p.state);
        setAnim(null);
        if (p.state.status === 'victory') sfx.victory();
      });

    const onGuess = (g) => {
      setFeed((f) => [...f.slice(-24), g]);
      if (g.result === 'close' && Date.now() - lastPulse.current > 1500) {
        lastPulse.current = Date.now();
        setPulse({ id: g.id });
      }
    };

    socket.on('state', onState);
    socket.on('fusion_success', onFusion);
    socket.on('guess', onGuess);
    socket.on('tiktok_status', setTiktok);
    socket.on('connect', () => setOnline(true));
    socket.on('disconnect', () => setOnline(false));
    return () => {
      socket.off('state', onState);
      socket.off('fusion_success', onFusion);
      socket.off('guess', onGuess);
      socket.off('tiktok_status', setTiktok);
    };
  }, []);

  return { game, anim, feed, tiktok, online, pulse, boardEl, registerTile };
}
