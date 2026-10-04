import React from 'react';

/** Live + Test: instructions for viewers. Offline: your own guess box. */
export default function Footer({ mode, text, setText, canGuess, valid, onSubmit, onSkip }) {
  if (mode !== 'offline') {
    return (
      <section className="zone zone-footer">
        <p className="how">
          Combine tiles to fuse them! Type their numbers (e.g. <b>2 5 8 12</b>) in the chat.
        </p>
      </section>
    );
  }
  return (
    <section className="zone zone-footer offline">
      <div className="guessbar">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && canGuess && valid && onSubmit()}
          placeholder="2 5 8 12"
          enterKeyHint="go"
          autoComplete="off"
          autoFocus
        />
        <button className="gb-clear" disabled={!text} onClick={() => setText('')}>Clear</button>
        <button className="gb-fuse" disabled={!canGuess || !valid} onClick={onSubmit}>Fuse!</button>
      </div>
      <div className="gb-row">
        <span>Type tile numbers or tap tiles</span>
        <button className="gb-skip" onClick={onSkip}>Skip puzzle</button>
      </div>
    </section>
  );
}
