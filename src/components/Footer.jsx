import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export default function Footer({ hint }) {
  return (
    <section className="zone zone-footer">
      <AnimatePresence mode="wait">
        {hint ? (
          <motion.div key={hint} className="hint" initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}>
            {hint}
          </motion.div>
        ) : null}
      </AnimatePresence>
      <p className="how">
        Combine tiles to fuse them! Type their numbers (e.g. <b>2 5 8 12</b>) in the chat.
      </p>
    </section>
  );
}
