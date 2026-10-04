import React, { useEffect, useState } from 'react';

const MODE_INFO = {
  test: ['Test', 'No TikTok. Simulated viewers play so you can check puzzles, settings and animations.'],
  live: ['Live', 'Connects to your TikTok chat. Viewers play. Nothing else can submit guesses.'],
  offline: ['Offline', 'No TikTok. You play on the game screen with your own guess box.']
};

/* ------------------------------------------------ Mode ------------------------------------------------ */
export function ModePanel({ host, admin }) {
  const cur = admin.mode;
  const name = admin.settings.tiktokUsername;
  const pick = (m) => {
    if (m === cur) return;
    const msg =
      m === 'live'
        ? `Go LIVE? Scores reset and the game connects to TikTok${name ? ` @${name}` : ' (no TikTok username is set yet - add it in Settings)'}.`
        : `Switch to ${MODE_INFO[m][0]} mode? Scores reset and a new puzzle starts.`;
    if (window.confirm(msg)) host.act('/mode', { mode: m });
  };
  return (
    <>
      <div className="modes">
        {Object.entries(MODE_INFO).map(([m, [label, desc]]) => (
          <button key={m} className={`mode ${m} ${cur === m ? 'on' : ''}`} onClick={() => pick(m)}>
            <b>{label}{cur === m && ' (current)'}</b>
            <span>{desc}</span>
          </button>
        ))}
      </div>
      {cur === 'live' && (
        <p className="note">
          TikTok chat: <b>{admin.tiktok}</b>{name ? ` (@${name})` : ''}
        </p>
      )}
      <p className="help">Switching mode resets scores. The server starts in the mode set by the MODE environment variable.</p>
    </>
  );
}

/* ------------------------------------------------ Puzzles ------------------------------------------------ */
export function PuzzlePanel({ host, admin }) {
  const g = admin.game;
  const [msg, setMsg] = useState('');
  const reload = async () => {
    const d = await host.act('/puzzles/reload');
    if (d?.reload) setMsg(`Reloaded ${d.reload.count} puzzle(s)${d.reload.skipped.length ? `, skipped ${d.reload.skipped.length} broken` : ''}.`);
  };
  return (
    <>
      <p className="help">Now playing: <b>{g.title}</b> ({g.status})</p>
      <label className="field">
        <span>Jump to puzzle</span>
        <select value={g.puzzleId} onChange={(e) => host.act('/puzzle/load', { id: e.target.value })}>
          {g.puzzles.map((p, i) => <option key={p.id} value={p.id}>{i + 1}. {p.title || p.id}</option>)}
        </select>
      </label>
      <div className="btnrow">
        <button onClick={() => host.act('/puzzle/restart')}>Restart this puzzle</button>
        <button onClick={() => host.act('/puzzle/next')}>Skip to next</button>
        <button onClick={reload}>Reload puzzles.json</button>
      </div>
      {msg && <p className="note">{msg}</p>}
      {g.skipped.length > 0 && <p className="err">Skipped at load: {g.skipped.map((s) => `${s.id} (${s.errors[0]})`).join('; ')}</p>}
    </>
  );
}

/* ------------------------------------------------ Settings (generated from the server schema) ------------------------------------------------ */
export function SettingsPanel({ host, admin }) {
  const { schema, settings, secretSet } = admin;
  const [draft, setDraft] = useState({});
  const [saved, setSaved] = useState(false);
  const dirty = Object.keys(draft).length > 0;
  const val = (f) => (f.key in draft ? draft[f.key] : settings[f.key]);
  const set = (key, v) => {
    setSaved(false);
    setDraft((d) => (v === settings[key] ? Object.fromEntries(Object.entries(d).filter(([k]) => k !== key)) : { ...d, [key]: v }));
  };
  const apply = async () => {
    const d = await host.act('/settings', { values: draft });
    if (d) {
      setDraft({});
      setSaved(true);
    }
  };
  const reset = async () => {
    if (!window.confirm('Reset every setting to its default?')) return;
    if (await host.act('/settings/reset')) setDraft({});
  };
  const groups = [...new Set(schema.map((f) => f.group))];

  return (
    <>
      {groups.map((grp) => (
        <fieldset key={grp} className="group">
          <legend>{grp}</legend>
          {schema.filter((f) => f.group === grp).map((f) => (
            <Field key={f.key} f={f} value={val(f)} secretSet={secretSet[f.key]} changed={f.key in draft} onChange={(v) => set(f.key, v)} />
          ))}
        </fieldset>
      ))}
      <div className="savebar">
        <button className="primary" disabled={!dirty} onClick={apply}>Apply changes</button>
        <button disabled={!dirty} onClick={() => setDraft({})}>Undo</button>
        <button onClick={reset}>Reset to defaults</button>
        {saved && <span className="good">Saved ✓</span>}
      </div>
      <p className="help">Settings are saved on the server (data/settings.json). On hosts that wipe files on restart, put the important ones in environment variables too.</p>
    </>
  );
}

function Field({ f, value, onChange, changed, secretSet }) {
  const label = (
    <span className="lbl">
      {f.label}{changed && <i className="dirty">●</i>}
    </span>
  );
  let input;
  if (f.type === 'bool') {
    return (
      <label className="field check">
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
        {label}
        {f.help && <small>{f.help}</small>}
      </label>
    );
  }
  if (f.type === 'number') {
    input = (
      <div className="rangeRow">
        <input type="range" min={f.min} max={f.max} step={f.step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
        <input className="num" type="number" min={f.min} max={f.max} step={f.step} value={value} onChange={(e) => onChange(e.target.value === '' ? f.min : Number(e.target.value))} />
        {f.unit && <em>{f.unit}</em>}
      </div>
    );
  } else if (f.type === 'select') {
    input = (
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    );
  } else if (f.type === 'secret') {
    input = (
      <div className="rangeRow">
        <input type="password" autoComplete="new-password" value={value} placeholder={secretSet ? '•••••• saved (type to replace)' : 'not set'} maxLength={f.max} onChange={(e) => onChange(e.target.value)} />
        {secretSet && !changed && <button type="button" onClick={() => onChange('')} title="Delete the saved value">Remove</button>}
      </div>
    );
  } else {
    input = <input type="text" value={value} maxLength={f.max} onChange={(e) => onChange(e.target.value)} />;
  }
  return (
    <label className="field">
      {label}
      {input}
      {f.help && <small>{f.help}</small>}
    </label>
  );
}

/* ------------------------------------------------ Answer key ------------------------------------------------ */
export function AnswerPanel({ admin }) {
  const g = admin.game;
  return (
    <>
      <p className="help">Private: this is only visible in the host toolbar, never on the game screen. 🟢 = can be solved now, 🔒 = needs earlier fusions, ★ = final category.</p>
      <table>
        <tbody>
          {g.answerKey.map((r) => (
            <tr key={r.id} className={r.done ? 'done' : ''}>
              <td>{r.done ? '✅' : r.available ? '🟢' : '🔒'}</td>
              <td>{r.result}{r.kind === 'category_solve' ? ' ★' : ''}</td>
              <td className="nums">{r.nums ? r.nums.join(' ') : r.done ? 'solved' : 'needs earlier fusions'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

/* ------------------------------------------------ Self-test ------------------------------------------------ */
export function SelfTestPanel({ host }) {
  const [report, setReport] = useState(null);
  const run = async () => setReport(await host.call('/selftest'));
  useEffect(() => { run(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <p className="help">Reads puzzles.json fresh and checks every puzzle: exactly 24 words, word-only, no duplicate words, groups of 2-12, and a full automatic play-through to an empty board. Run it after every edit.</p>
      <button className="primary" onClick={run}>Run again</button>
      {report?.fatal && <p className="err">{report.fatal}</p>}
      {report && !report.fatal && (
        <>
          <p className={report.ok ? 'good' : 'err'}>{report.ok ? 'All puzzles passed' : 'Some puzzles have problems'}</p>
          <table>
            <tbody>
              {report.results.map((r) => (
                <tr key={r.id}>
                  <td>{r.ok ? '✅' : '❌'}</td>
                  <td>
                    {r.title || r.id}
                    <div className="help">{r.tiles} tiles, {r.groups} groups</div>
                    {r.errors.map((e) => <div className="err" key={e}>{e}</div>)}
                    {r.warnings.map((w) => <div className="warn" key={w}>{w}</div>)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </>
  );
}

/* ------------------------------------------------ Test tools ------------------------------------------------ */
export function TestPanel({ host, admin }) {
  const [guess, setGuess] = useState('');
  const test = admin.mode === 'test';
  const s = admin.settings;
  const send = async (e) => {
    e.preventDefault();
    await host.act('/guess', { text: guess });
    setGuess('');
  };
  if (!test) {
    return (
      <>
        <p className="help">These tools only work in Test mode, so they can never touch a live stream.</p>
        <button className="primary" onClick={() => window.confirm('Switch to Test mode? Scores reset.') && host.act('/mode', { mode: 'test' })}>Switch to Test mode</button>
      </>
    );
  }
  return (
    <>
      <label className="field check">
        <input type="checkbox" checked={s.botEnabled} onChange={(e) => host.act('/settings', { values: { botEnabled: e.target.checked } })} />
        <span className="lbl">Simulated viewers</span>
        <small>Speed and accuracy are in Settings → Test mode.</small>
      </label>
      <div className="btnrow">
        <button onClick={() => host.act('/solve-step')}>Solve next group</button>
        <button onClick={() => host.act('/puzzle/restart')}>Restart puzzle</button>
        <button onClick={() => host.act('/puzzle/next')}>Next puzzle</button>
      </div>
      <form className="btnrow" onSubmit={send}>
        <input value={guess} onChange={(e) => setGuess(e.target.value)} placeholder="Guess as Tester: 2 5 8 12" />
        <button disabled={!guess}>Send</button>
      </form>
    </>
  );
}
