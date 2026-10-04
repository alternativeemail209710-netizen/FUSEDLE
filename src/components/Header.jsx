import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TileFace } from './Tile.jsx';

export default function Header({ game, tiktok, online }) {
  const ok = online && (tiktok === 'connected' || tiktok === 'no-username');
  return (
    <section className="zone zone-top">
      <div className="title-row">
        <h1 className="title">
          Fusion Associations <span className="live-pill">LIVE</span>
        </h1>
        <span className={`dot ${ok ? 'ok' : 'bad'}`} title={`chat: ${tiktok}`} />
      </div>
      <div className="theme">
        Puzzle {game.puzzleNo}/{game.totalPuzzles} - {game.title}
      </div>

      <div className="solved">
        <AnimatePresence>
          {game.solved.map((s) => (
            <motion.div
              key={s.defId}
              layout
              className="solved-chip"
              initial={{ scale: 0, rotate: -12, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 380, damping: 18 }}
            >
              <span className="solved-icon"><TileFace tile={s} /></span>
              <span className="solved-name">{s.label}</span>
              <span className="solved-by">{s.by}</span>
            </motion.div>
          ))}
        </AnimatePresence>
        {game.solved.length === 0 && <div className="solved-empty">Solved categories land here</div>}
      </div>
    </section>
  );
}
