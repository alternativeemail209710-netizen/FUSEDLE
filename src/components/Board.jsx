import React, { useLayoutEffect, useState } from 'react';
import { AnimatePresence, LayoutGroup } from 'framer-motion';
import Tile from './Tile.jsx';
import { FusionOverlay } from './Overlays.jsx';

const GAP = 12;

/** Largest square tile size so that n tiles fit inside w x h (tries every column count). */
function fitSize(n, w, h) {
  if (!n || !w || !h) return 0;
  let best = 0;
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const s = Math.min((w - GAP * (cols - 1)) / cols, (h - GAP * (rows - 1)) / rows);
    if (s > best) best = s;
  }
  return Math.floor(Math.min(best, 190));
}

export default function Board({ game, anim, boardEl, registerTile }) {
  const [box, setBox] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = boardEl.current;
    if (!el) return;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [boardEl]);

  // Reserve room for the +1 tile while a fusion is mid-flight so the grid doesn't thrash.
  const size = fitSize(game.tiles.length, box.w, box.h);

  return (
    <section className="zone zone-board">
      <div className="board" ref={boardEl}>
        <LayoutGroup>
          <AnimatePresence>
            {game.tiles.map((t) => (
              <Tile key={t.uid} tile={t} size={size} anim={anim} registerTile={registerTile} />
            ))}
          </AnimatePresence>
        </LayoutGroup>
        <FusionOverlay anim={anim} />
      </div>
    </section>
  );
}
