import { WebcastPushConnection } from 'tiktok-live-connector';

/**
 * Connects to a TikTok LIVE chat and forwards comments. Reconnects forever with backoff,
 * so the game keeps running even if the connection drops or the stream starts later.
 * Returns { stop() } so the server can disconnect when leaving Live mode.
 */
export function connectTikTok({ username, onChat, onStatus, sessionId }) {
  let delay = 5000;
  let timer = null;
  let stopped = false;
  let current = null;

  const status = (s) => {
    if (!stopped) onStatus(s);
  };

  const scheduleRetry = (why) => {
    if (stopped) return;
    status('retrying');
    console.log(`[tiktok] ${why} - retry in ${Math.round(delay / 1000)}s`);
    clearTimeout(timer);
    timer = setTimeout(connect, delay);
    delay = Math.min(delay * 1.7, 60000);
  };

  async function connect() {
    if (stopped) return;
    const conn = new WebcastPushConnection(username, {
      processInitialData: false,
      enableExtendedGiftInfo: false,
      sessionId: sessionId || undefined
    });
    current = conn;

    let retried = false;
    const retryOnce = (why) => {
      if (retried) return;
      retried = true;
      scheduleRetry(why);
    };

    conn.on('chat', (d) => {
      if (stopped) return;
      onChat({
        uniqueId: d.uniqueId,
        nickname: d.nickname,
        profilePictureUrl: d.profilePictureUrl,
        comment: d.comment
      });
    });
    conn.on('disconnected', () => retryOnce('disconnected'));
    conn.on('streamEnd', () => retryOnce('stream ended'));
    conn.on('error', (e) => console.warn('[tiktok] error:', e?.message || e));

    try {
      status('connecting');
      const state = await conn.connect();
      if (stopped) {
        try { conn.disconnect(); } catch { /* already closed */ }
        return;
      }
      delay = 5000;
      status('connected');
      console.log(`[tiktok] connected to @${username} (room ${state.roomId})`);
    } catch (err) {
      retryOnce(`connect failed: ${err?.message || err}`);
    }
  }

  connect();

  return {
    stop() {
      stopped = true;
      clearTimeout(timer);
      try { current?.disconnect(); } catch { /* already closed */ }
      console.log('[tiktok] stopped');
    }
  };
}
