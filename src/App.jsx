import React, { useEffect, useState } from 'react';
import { useGame } from './useGame.js';
import { initAudio } from './sfx.js';
import { socket } from './socket.js';
import Header from './components/Header.jsx';
import Board from './components/Board.jsx';
import Feed from './components/Feed.jsx';
import Footer from './components/Footer.jsx';
import { VictoryOverlay } from './components/Overlays.jsx';

// Same rule the server uses: 2-12 numbers separated by spaces or commas
const VALID = /^\d{1,3}([\s,]+\d{1,3}){1,11}$/;
const toNums = (t) => (t.match(/\d{1,3}/g) || []).map(Number);

export default function App() {
  const [text, setText] = useState(''); // Offline mode: the guess being typed / tapped
  const g = useGame();

  const offline = g.game?.mode === 'offline';
  const canGuess = offline && g.game?.status === 'playing' && !g.anim;
  const selected = offline ? toNums(text) : [];

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
    <div className="stage">
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
          <Feed feed={g.feed} leaderboard={g.game.leaderboard} />
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
  );
}
