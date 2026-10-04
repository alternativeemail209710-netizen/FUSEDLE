import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const ICON = { correct: '✅', close: '🔥', wrong: '✖️' };
const MEDALS = ['🥇', '🥈', '🥉'];

export default function Feed({ feed, leaderboard }) {
  const recent = feed.slice(-7);
  return (
    <section className="zone zone-feed">
      <div className="leaders">
        {leaderboard.length === 0 && <span className="leader-empty">Be the first to fuse!</span>}
        {leaderboard.slice(0, 3).map((l, i) => (
          <motion.div layout key={l.nickname} className="leader">
            <span>{MEDALS[i]}</span>
            <span className="leader-name">{l.nickname}</span>
            <b>{l.score}</b>
          </motion.div>
        ))}
      </div>

      <div className="feed">
        <AnimatePresence initial={false}>
          {recent.map((g) => (
            <motion.div
              layout
              key={g.id}
              className={`guess ${g.result}`}
              initial={{ x: -40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
            >
              <span className="guess-user">{g.user}</span>
              <span className="guess-nums">{g.nums.join(' ')}</span>
              <span className="guess-res">
                {ICON[g.result]}
                {g.result === 'close' && ' so close'}
                {g.result === 'correct' && ` +${g.points}`}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
