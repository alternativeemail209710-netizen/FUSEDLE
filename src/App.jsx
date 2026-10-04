import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGame } from './useGame.js';
import { initAudio } from './sfx.js';
import { socket } from './socket.js';
import Header from './components/Header.jsx';
import Board from './components/Board.jsx';
import Feed from './components/Feed.jsx';
import Footer from './components/Footer.jsx';
import { VictoryOverlay } from './components/Overlays.jsx';

const params = new URLSearchParams(window.location.search);
const AUTOSTART = params.get('autostart') === '1';
const DEBUG = params.get('debug') === '1';
const PLAY = params.get('play') === '1'; // tap-to-play on this device (needs DEBUG_MODE=true on the server)

export default function App() {
  const [started, setStarted] = useState(AUTOSTART);
  const [sel, setSel] = useState([]);
  const g = useGame();

  const playable = PLAY && !!g.game?.playEnabled && g.game?.status === 'playing' && !g.anim;

  // drop selections for tiles that no longer exist
  useEffect(() => {
    if (g.game) setSel((s) => s.filter((n) => g.game.tiles.some((t) => t.num === n)));
  }, [g.game]);

  const start = () => {
    initAudio();
    setStarted(true);
    document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const toggle = (num) => setSel((s) => (s.includes(num) ? s.filter((n) => n !== num) : [...s, num]));
  const submit = () => {
    if (sel.length < 2) return;
    socket.emit('debug_guess', { user: 'You', text: sel.join(' ') });
    setSel([]);
  };

  return (
    <div className="stage">
      {!started && (
        <div className="start">
          <motion.div
            className="start-logo"
            animate={{ rotate: [-3, 3, -3] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
          >
            <span>FUSION</span>
            <span>ASSOCIATIONS</span>
            <span className="live-pill">LIVE</span>
          </motion.div>
          <button className="start-btn" onClick={start}>Start game</button>
          <p className="start-note">Tap once, then start TikTok Mobile Gaming screen share. The game runs itself.</p>
        </div>
      )}

      {started && g.game && (
        <div className="zones">
          <Header game={g.game} tiktok={g.tiktok} online={g.online} />
          <Board
            game={g.game}
            anim={g.anim}
            boardEl={g.boardEl}
            registerTile={g.registerTile}
            pulse={g.pulse}
            selected={sel}
            onTap={playable ? toggle : undefined}
          />
          <Feed feed={g.feed} leaderboard={g.game.leaderboard} />
          <Footer hint={g.game.hint} />

          <AnimatePresence>
            {playable && sel.length > 0 && (
              <motion.div className="playbar" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}>
                <span className="playbar-nums">{sel.join(' ')}</span>
                <button className="pb-clear" onClick={() => setSel([])}>Clear</button>
                <button className="pb-fuse" disabled={sel.length < 2} onClick={submit}>Fuse!</button>
              </motion.div>
            )}
          </AnimatePresence>

          <VictoryOverlay game={g.game} />
        </div>
      )}

      {started && !g.game && <div className="loading">Connecting...</div>}

      {DEBUG && started && <DebugBar />}
    </div>
  );
}

function DebugBar() {
  const [text, setText] = useState('');
  const send = () => {
    socket.emit('debug_guess', { user: 'debug', text });
    setText('');
  };
  return (
    <div className="debug">
      <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="2 5 8 12" />
      <button onClick={send}>Send</button>
    </div>
  );
}
