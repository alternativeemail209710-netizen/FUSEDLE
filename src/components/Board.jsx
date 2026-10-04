import React, { useEffect, useState } from 'react';
import { AnimatePresence, LayoutGroup } from 'framer-motion';
import Tile from './Tile.jsx';
import { FusionOverlay } from './Overlays.jsx';

/** Fixed 4 columns x 6 rows (24 tiles). Tiles keep their size; when some leave, the rest slide up. */
export default function Board({ game, anim, boardEl, registerTile, pulse, selected = [], onTap }) {
  const [fx, setFx] = useState(false);

  // a "so close" guess makes the whole board glow amber for a moment
  useEffect(() => {
    if (!pulse) return;
    setFx(true);
    const t = setTimeout(() => setFx(false), 700);
    return () => clearTimeout(t);
  }, [pulse]);

  return (
    <section className="zone zone-board">
      <div className={`board ${fx ? 'close' : ''}`} ref={boardEl}>
        <LayoutGroup>
          <AnimatePresence>
            {game.tiles.map((t) => (
              <Tile
                key={t.uid}
                tile={t}
                anim={anim}
                registerTile={registerTile}
                selected={selected.includes(t.num)}
                onTap={onTap}
              />
            ))}
          </AnimatePresence>
        </LayoutGroup>
        <FusionOverlay anim={anim} />
      </div>
    </section>
  );
}
