import React from 'react';
import { motion } from 'framer-motion';

/** Face of a tile: text, emoji or image. Sizes use container query units so they follow the tile size. */
export function TileFace({ tile }) {
  if (tile.type === 'image') {
    return <img className="face-img" src={tile.content} alt={tile.label || ''} draggable={false} />;
  }
  if (tile.type === 'emoji') return <span className="face-emoji">{tile.content}</span>;
  // font size steps by word length so every word fits on one 4-column tile
  const len = String(tile.content).length;
  const step = len <= 5 ? 'xl' : len <= 7 ? 'lg' : len <= 9 ? 'md' : len <= 11 ? 'sm' : len <= 13 ? 'xs' : 'xxs';
  const cls = `face-text t-${step}`;
  return <span className={cls}>{tile.content}</span>;
}

export default function Tile({ tile, anim, registerTile, selected, onTap }) {
  const fly = anim?.offsets?.[tile.uid];
  let animate = { x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 };
  let transition = { type: 'spring', stiffness: 300, damping: 22 };

  if (fly && anim.phase === 'gather') {
    animate = { x: fly.x, y: fly.y, scale: 0.55, rotate: (tile.num % 2 ? 1 : -1) * 18, opacity: 1 };
    transition = { duration: 0.65, ease: [0.5, 0, 0.2, 1] };
  } else if (fly && anim.phase === 'burst') {
    animate = { x: fly.x, y: fly.y, scale: 0.05, rotate: 0, opacity: 0 };
    transition = { duration: 0.2 };
  }

  const hue = (tile.num * 47) % 360;
  const hasLabel = !!tile.label && tile.type !== 'text';
  const ll = (tile.label || '').length;
  const cls = ['tile', tile.type, hasLabel && 'has-label', hasLabel && (ll > 11 ? 'lbl-sm' : ll > 7 ? 'lbl-md' : 'lbl-lg'), tile.fused && 'fused', selected && 'selected', onTap && 'tappable']
    .filter(Boolean)
    .join(' ');

  return (
    <motion.div
      layout="position"
      ref={(el) => registerTile(tile.uid, el)}
      className="tile-slot"
      initial={{ scale: 0.2, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.01 } }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
    >
      <motion.div
        className={cls}
        style={{ '--h': hue }}
        onClick={onTap ? () => onTap(tile.num) : undefined}
        initial={tile.fused ? { scale: 1.7, opacity: 0, rotate: -8 } : false}
        animate={animate}
        transition={transition}
      >
        <TileFace tile={tile} />
        {tile.label && tile.type !== 'text' && <span className="tile-label">{tile.label}</span>}
        <span className="badge">{tile.num}</span>
      </motion.div>
    </motion.div>
  );
}
