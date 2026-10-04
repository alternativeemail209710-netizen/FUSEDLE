import React, { useEffect, useState } from 'react';
import { useGame } from './useGame.js';
import { initAudio, setVolume } from './sfx.js';
import { socket } from './socket.js';
import { useHost } from './host/useHost.js';
import Toolbar from './host/Toolbar.jsx';
import Header from './components/Header.jsx';
import Board from './components/Board.jsx';
import Feed from './components/Feed.jsx';
import Footer from './components/Footer.jsx';
import { VictoryOverlay } from './components/Overlays.jsx';

// Same rule the server uses: 2-12 numbers separated by spaces or commas
const VALID = /^\d{1,3}([\s,]+\d{1,3}){1,11}$/;
const toNums = (t) => (t.match(/\d{1,3}/g) || []).map(Number);

// The host toolbar only exists for a browser that unlocked it with the ADMIN_KEY (open /?host once).
const WANTS_HOST = new URLSearchParams(window.location.search).has('host') || window.location.pathname === '/control';
const BAR_KEY = 'fusionHostBar';

export default function App() {
  const [text, setText] = useState(''); // Offline mode: the guess being typed / tapped
  const [bar, setBar] = useState(() => localStorage.getItem(BAR_KEY) !== '0');
  const g = useGame();
  const host = useHost();

  const ui = g.game?.ui;
  const offline = g.game?.mode === 'offline';
  const canGuess = offline && g.game?.status === 'playing' && !g.anim;
  const selected = offline ? toNums(text) : [];
  const toolbarOn = host.unlocked && bar;

  const showBar = (v) => {
    localStorage.setItem(BAR_KEY, v ? '1' : '0');
    setBar(v);
  };

  // Browsers only allow sound after a touch/click: enable it on the first one, no start screen needed.
  useEffect(() => {
    const unlock = () => initAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    if (ui) {
      setVolume(ui.soundVolume);
      document.title = ui.gameName;
    }
  }, [ui?.soundVolume, ui?.gameName]); // eslint-disable-line react-hooks/exhaustive-deps

  // leaving Offline (or a new puzzle) clears any half-typed guess
  useEffect(() => setText(''), [g.game?.mode, g.game?.puzzleId]);

  const toggle = (num) => {
    const nums = toNums(text);
    setText((nums.includes(num) ? nums.filter((n) => n !== num) : [...nums, num]).join(' '));
  };
  const submit = () => {
    if (!VALID.test(text.trim())) return;
    socket.emit('player_guess', { text });
    setText('');
  };

  return (
    <div className={`app ${toolbarOn ? 'has-toolbar' : ''}`}>
      {toolbarOn && <Toolbar host={host} game={g.game} tiktok={g.tiktok} online={g.online} onHide={() => showBar(false)} />}
      {host.unlocked && !bar && (
        <button className="tb-handle" onClick={() => showBar(true)} title="Show host toolbar">⚙</button>
      )}

      <div className="stage-wrap">
        <div className={`stage ${ui && ui.safeZone === false ? 'nosafe' : ''}`}>
          {g.game && (
            <div className="zones">
              <Header game={g.game} tiktok={g.tiktok} online={g.online} />
              <Board
                game={g.game}
                anim={g.anim}
                boardEl={g.boardEl}
                registerTile={g.registerTile}
                pulse={g.pulse}
                selected={selected}
                onTap={canGuess ? toggle : undefined}
              />
              <Feed feed={g.feed} leaderboard={g.game.leaderboard} rows={ui.feedRows} showLeaders={ui.showLeaderboard} />
              <Footer
                mode={g.game.mode}
                text={text}
                setText={setText}
                canGuess={canGuess}
                valid={VALID.test(text.trim())}
                onSubmit={submit}
                onSkip={() => socket.emit('player_skip')}
              />
              <VictoryOverlay game={g.game} />
            </div>
          )}
          {!g.game && <div className="loading">Connecting...</div>}
        </div>
      </div>

      {WANTS_HOST && !host.key && <Login host={host} />}
    </div>
  );
}

function Login({ host }) {
  const [k, setK] = useState('');
  return (
    <div className="login-back">
      <form
        className="login"
        onSubmit={(e) => {
          e.preventDefault();
          if (k.trim()) host.login(k);
        }}
      >
        <b>Host login</b>
        <p>Enter your ADMIN_KEY to unlock the host toolbar on this browser.</p>
        <input type="password" autoFocus value={k} onChange={(e) => setK(e.target.value)} placeholder="ADMIN_KEY" />
        {host.error && <div className="err">{host.error}</div>}
        <button className="primary">Unlock</button>
      </form>
    </div>
  );
}
