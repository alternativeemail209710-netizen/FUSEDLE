import React, { useCallback, useEffect, useState } from 'react';

const MODE_INFO = {
  test: ['Test', 'No TikTok. Simulated viewers play so you can check games and animations.'],
  live: ['Live', 'Connects to TikTok chat. Viewers play. Nothing else can submit guesses.'],
  offline: ['Offline', 'No TikTok. You play on the game screen with your own guess box.']
};

export default function Control() {
  const [key, setKey] = useState(() => localStorage.getItem('adminKey') || '');
  const [st, setSt] = useState(null);
  const [msg, setMsg] = useState('');
  const [report, setReport] = useState(null);
  const [guess, setGuess] = useState('');

  const call = useCallback(
    async (path, body, method = body ? 'POST' : 'GET') => {
      try {
        const r = await fetch(`/api/control${path}`, {
          method,
          headers: { 'x-admin-key': key, 'Content-Type': 'application/json' },
          body: body ? JSON.stringify(body) : undefined
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
          setMsg(data.error || `Error ${r.status}`);
          if (r.status === 403) setSt(null);
          return null;
        }
        setMsg('');
        return data;
      } catch {
        setMsg('Cannot reach the server');
        return null;
      }
    },
    [key]
  );

  const refresh = useCallback(async () => {
    const d = await call('/status');
    if (d) setSt(d);
  }, [call]);

  const act = async (path, body) => {
    const d = await call(path, body || {});
    if (d?.mode) setSt(d);
    return d;
  };

  useEffect(() => {
    if (!key) return;
    refresh();
    const t = setInterval(refresh, 2500);
    return () => clearInterval(t);
  }, [key, refresh]);

  const login = (e) => {
    e.preventDefault();
    const v = new FormData(e.target).get('k').trim();
    localStorage.setItem('adminKey', v);
    setKey(v);
  };

  if (!st) {
    return (
      <main className="cp">
        <h1>Fusion Control Panel</h1>
        <form onSubmit={login} className="row">
          <input name="k" type="password" placeholder="ADMIN_KEY" defaultValue={key} autoFocus />
          <button className="primary">Open</button>
        </form>
        {msg && <p className="err">{msg}</p>}
      </main>
    );
  }

  const g = st.game;
  const switchMode = (m) => {
    if (m === st.mode) return;
    const warn =
      m === 'live'
        ? `Go LIVE? Scores reset and the game connects to TikTok${st.username ? ` @${st.username}` : ' (TIKTOK_USERNAME is not set!)'}.`
        : `Switch to ${MODE_INFO[m][0]} mode? Scores reset and a new puzzle starts.`;
    if (window.confirm(warn)) act('/mode', { mode: m });
  };
  const runSelfTest = async () => setReport(await call('/selftest'));
  const sendGuess = async (e) => {
    e.preventDefault();
    await act('/guess', { text: guess });
    setGuess('');
  };
  const reload = async () => {
    const d = await act('/puzzles/reload');
    if (d?.reload) setMsg(`Reloaded ${d.reload.count} puzzle(s)${d.reload.skipped.length ? `, skipped ${d.reload.skipped.length} broken` : ''}`);
  };
  const test = st.mode === 'test';

  return (
    <main className="cp">
      <header>
        <h1>Fusion Control Panel</h1>
        <a href="/" target="_blank" rel="noreferrer">Open game screen</a>
      </header>
      {msg && <p className="err">{msg}</p>}

      <section>
        <h2>Mode</h2>
        <div className="modes">
          {Object.entries(MODE_INFO).map(([m, [name, desc]]) => (
            <button key={m} className={`mode ${m} ${st.mode === m ? 'on' : ''}`} onClick={() => switchMode(m)}>
              <b>{name}</b>
              <span>{desc}</span>
            </button>
          ))}
        </div>
        {st.mode === 'live' && (
          <p className="note">
            TikTok chat: <b>{st.tiktok}</b>{st.username ? ` (@${st.username})` : ' - set TIKTOK_USERNAME on the server'}
          </p>
        )}
      </section>

      <section>
        <h2>Puzzle: {g.title} <small>({g.status})</small></h2>
        <div className="row wrap">
          <select value={g.puzzleId} onChange={(e) => act('/puzzle/load', { id: e.target.value })}>
            {g.puzzles.map((p) => <option key={p.id} value={p.id}>{p.title || p.id}</option>)}
          </select>
          <button onClick={() => act('/puzzle/restart')}>Restart</button>
          <button onClick={() => act('/puzzle/next')}>Next puzzle</button>
          <button onClick={reload}>Reload puzzles.json</button>
        </div>
        {g.skipped.length > 0 && (
          <p className="err">Skipped at load: {g.skipped.map((s) => `${s.id} (${s.errors[0]})`).join('; ')}</p>
        )}
      </section>

      <section>
        <h2>Test tools {!test && <small>(switch to Test mode)</small>}</h2>
        <div className="row wrap">
          <label>
            <input type="checkbox" checked={st.bot.enabled} onChange={(e) => act('/bot', { enabled: e.target.checked })} /> Simulated viewers
          </label>
          <label>
            every{' '}
            <select value={st.bot.intervalMs} onChange={(e) => act('/bot', { intervalMs: Number(e.target.value) })}>
              {[1500, 3000, 4500, 8000, 15000].map((ms) => <option key={ms} value={ms}>{ms / 1000}s</option>)}
            </select>
          </label>
          <button disabled={!test} onClick={() => act('/solve-step')}>Solve next group</button>
        </div>
        <form className="row" onSubmit={sendGuess}>
          <input disabled={!test} value={guess} onChange={(e) => setGuess(e.target.value)} placeholder="Send a guess as Tester: 2 5 8 12" />
          <button disabled={!test || !guess}>Send</button>
        </form>
      </section>

      <section>
        <h2>Answer key <small>(private - not shown on the game screen)</small></h2>
        <table>
          <tbody>
            {g.answerKey.map((r) => (
              <tr key={r.id} className={r.done ? 'done' : ''}>
                <td>{r.done ? '✅' : r.available ? '🟢' : '🔒'}</td>
                <td>{r.result}{r.kind === 'category_solve' ? ' ★' : ''}</td>
                <td>{r.nums ? r.nums.join(' ') : r.done ? 'solved' : 'needs earlier fusions'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Self-test <small>(run after editing puzzles.json)</small></h2>
        <button className="primary" onClick={runSelfTest}>Check all puzzles</button>
        {report?.fatal && <p className="err">{report.fatal}</p>}
        {report && !report.fatal && (
          <>
            <p className={report.ok ? 'good' : 'err'}>{report.ok ? 'All puzzles passed' : 'Some puzzles have problems'}</p>
            <table>
              <tbody>
                {report.results.map((r) => (
                  <tr key={r.id}>
                    <td>{r.ok ? '✅' : '❌'}</td>
                    <td>{r.title || r.id}</td>
                    <td>
                      {r.tiles} tiles, {r.groups} groups
                      {r.errors.map((e) => <div className="err" key={e}>{e}</div>)}
                      {r.warnings.map((w) => <div className="warn" key={w}>{w}</div>)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>
    </main>
  );
}
