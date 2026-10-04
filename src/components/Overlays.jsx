import React, { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TileFace } from './Tile.jsx';

/** Centre-of-board effects: charging glow while tiles fly in, flash + new tile on burst. */
export function FusionOverlay({ anim }) {
  const result = anim?.newTile || anim?.solvedEntry;
  const solvedCategory = !!anim?.solvedEntry;
  return (
    <div className="fx">
      <AnimatePresence>
        {anim?.phase === 'gather' && (
          <motion.div
            key="charge"
            className="charge"
            initial={{ scale: 0.2, opacity: 0 }}
            animate={{ scale: [0.2, 1, 1.25], opacity: [0, 0.9, 1] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.65 }}
          />
        )}
        {anim?.phase === 'burst' && result && (
          <motion.div key="burst" className="burst" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div
              className="flash"
              initial={{ scale: 0.2, opacity: 1 }}
              animate={{ scale: 5, opacity: 0 }}
              transition={{ duration: 0.85, ease: 'easeOut' }}
            />
            <motion.div
              className={`burst-card ${solvedCategory ? 'solved' : ''}`}
              initial={{ scale: 0.2, rotate: -25 }}
              animate={{ scale: [0.2, 1.4, 1.15], rotate: [-25, 8, 0] }}
              transition={{ duration: 0.8, times: [0, 0.6, 1] }}
            >
              <div className={`burst-face ${result.type === 'text' ? 'word' : ''}`}><TileFace tile={result} /></div>
              {solvedCategory && <div className="burst-label">{result.type === 'text' ? 'Category solved!' : `${result.label} solved!`}</div>}
              {!solvedCategory && result.type !== 'text' && result.label && <div className="burst-label">{result.label}</div>}
            </motion.div>
            <motion.div
              className="burst-user"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25 }}
            >
              {anim.user} +{anim.points}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const CONFETTI = ['🎉', '✨', '⭐', '🎊', '💥', '🌟'];

export function VictoryOverlay({ game }) {
  const bits = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 1.6,
        dur: 2.4 + Math.random() * 2,
        icon: CONFETTI[i % CONFETTI.length]
      })),
    [game.puzzleId, game.status]
  );
  return (
    <AnimatePresence>
      {game.status === 'victory' && (
        <motion.div className="victory" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          {bits.map((b) => (
            <motion.span
              key={b.id}
              className="confetti"
              style={{ left: `${b.left}%` }}
              initial={{ y: '-10cqh', rotate: 0 }}
              animate={{ y: '110cqh', rotate: 360 }}
              transition={{ delay: b.delay, duration: b.dur, repeat: Infinity, ease: 'linear' }}
            >
              {b.icon}
            </motion.span>
          ))}
          <motion.div
            className="victory-card"
            initial={{ scale: 0.3, rotate: -8 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 14 }}
          >
            <div className="victory-big">Puzzle cleared!</div>
            <div className="victory-sub">{game.title}</div>
            {game.mvp && <div className="victory-mvp">Top fuser: {game.mvp}</div>}
            <div className="victory-next">Next puzzle loading...</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
