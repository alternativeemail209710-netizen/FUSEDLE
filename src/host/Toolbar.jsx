import React, { useEffect, useState } from 'react';
import { ModePanel, PuzzlePanel, SettingsPanel, AnswerPanel, SelfTestPanel, TestPanel } from './Panels.jsx';

const PILL = { live: 'LIVE', test: 'TEST', offline: 'SOLO' };

const BUTTONS = [
  ['mode', '🎛️', 'Mode'],
  ['puzzle', '🧩', 'Puzzles'],
  ['settings', '⚙️', 'Settings'],
  ['answers', '🔑', 'Answers'],
  ['selftest', '✅', 'Self-test'],
  ['test', '🧪', 'Test tools']
];

const TITLES = {
  mode: 'Mode',
  puzzle: 'Puzzles',
  settings: 'Settings',
  answers: 'Answer key',
  selftest: 'Self-test',
  test: 'Test tools'
};

/** One single row: game name + mode + status + every host button. Scrolls sideways on narrow screens. */
export default function Toolbar({ host, game, tiktok, online, onHide }) {
  const [open, setOpen] = useState(null);
  const mode = game?.mode;

  // keep the panels' data fresh while one is open (answer key changes as the game is played)
  useEffect(() => {
    if (!open) return;
    host.refresh();
    const t = setInterval(host.refresh, 2000);
    return () => clearInterval(t);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const chat =
    mode === 'live' ? (tiktok === 'connected' ? ['ok', 'Chat connected'] : [tiktok === 'no-username' ? 'bad' : 'warn', `Chat: ${tiktok}`]) : null;
  const panelProps = { host, admin: host.admin, game, close: () => setOpen(null) };

  return (
    <>
      <header className="toolbar">
        <span className="tb-name">{game?.ui?.gameName || 'Fusion Associations'}</span>
        {mode && <span className={`tb-pill ${mode}`}>{PILL[mode]}</span>}
        {chat && <span className={`tb-status ${chat[0]}`}>{chat[1]}</span>}
        {!online && <span className="tb-status bad">Offline</span>}
        <span className="tb-spacer" />
        {BUTTONS.map(([id, icon, label]) => (
          <button key={id} className={`tb-btn ${open === id ? 'on' : ''}`} onClick={() => setOpen(open === id ? null : id)} title={label}>
            <span aria-hidden>{icon}</span>
            <span className="tb-label">{label}</span>
          </button>
        ))}
        <button className="tb-btn" onClick={onHide} title="Hide the toolbar (for streaming)">
          <span aria-hidden>👁️</span>
          <span className="tb-label">Stream view</span>
        </button>
      </header>

      {open && (
        <>
          <div className="drawer-back" onClick={() => setOpen(null)} />
          <aside className="drawer">
            <div className="drawer-head">
              <b>{TITLES[open]}</b>
              <button className="x" onClick={() => setOpen(null)} aria-label="Close">✕</button>
            </div>
            <div className="drawer-body">
              {host.error && <p className="err">{host.error}</p>}
              {!host.admin && <p>Loading...</p>}
              {host.admin && open === 'mode' && <ModePanel {...panelProps} />}
              {host.admin && open === 'puzzle' && <PuzzlePanel {...panelProps} />}
              {host.admin && open === 'settings' && <SettingsPanel {...panelProps} />}
              {host.admin && open === 'answers' && <AnswerPanel {...panelProps} />}
              {host.admin && open === 'selftest' && <SelfTestPanel {...panelProps} />}
              {host.admin && open === 'test' && <TestPanel {...panelProps} />}
            </div>
          </aside>
        </>
      )}
    </>
  );
}
