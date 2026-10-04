import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TileFace } from './Tile.jsx';

export default function Header({ game, tiktok, online }) {
  const mode = game.mode;
  // chat connection only matters in Live mode; other modes just need the socket
  const ok = online && (mode !== 'live' || tiktok === 'connected');
  const pill = { live: 'LIVE', test: 'TEST', offline: 'SOLO' }[mode];
  return (
    <section className="zone zone-top">
      <div className="title-row">
        <h1 className="title">
          {game.ui.gameName} <span className={`live-pill ${mode}`}>{pill}</span>
        </h1>
        {mode !== 'offline' && <span className={`dot ${ok ? 'ok' : 'bad'}`} title={`chat: ${tiktok}`} />}
      </div>
      <div className="theme">
        Puzzle {game.puzzleNo}/{game.totalPuzzles} - {game.title}
      </div>
      <div className="progress" aria-label="progress">
        <motion.div
          className="progress-fill"
          animate={{ width: `${(game.progress.done / game.progress.total) * 100}%` }}
          transition={{ type: 'spring', stiffness: 160, damping: 20 }}
        />
        <span className="progress-text">{game.progress.done}/{game.progress.total} groups</span>
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
              {s.type !== 'text' && <span className="solved-icon"><TileFace tile={s} /></span>}
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
