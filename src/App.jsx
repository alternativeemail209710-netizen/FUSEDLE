import React, { useState } from 'react';
import { motion } from 'framer-motion';
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

export default function App() {
  const [started, setStarted] = useState(AUTOSTART);
  const g = useGame();

  const start = () => {
    initAudio();
    setStarted(true);
    document.documentElement.requestFullscreen?.().catch(() => {});
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
          <Board game={g.game} anim={g.anim} boardEl={g.boardEl} registerTile={g.registerTile} />
          <Feed feed={g.feed} leaderboard={g.game.leaderboard} />
          <Footer hint={g.game.hint} />
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
