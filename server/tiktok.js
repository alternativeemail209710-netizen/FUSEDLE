import { WebcastPushConnection } from 'tiktok-live-connector';

/**
 * Connects to a TikTok LIVE chat and forwards comments. Reconnects forever with backoff,
 * so the game keeps running even if the connection drops or the stream starts later.
 */
export function connectTikTok({ username, onChat, onStatus }) {
  let delay = 5000;
  let timer = null;

  const scheduleRetry = (why) => {
    onStatus('retrying');
    console.log(`[tiktok] ${why} - retry in ${Math.round(delay / 1000)}s`);
    clearTimeout(timer);
    timer = setTimeout(connect, delay);
    delay = Math.min(delay * 1.7, 60000);
  };

  async function connect() {
    const conn = new WebcastPushConnection(username, {
      processInitialData: false,
      enableExtendedGiftInfo: false,
      sessionId: process.env.TIKTOK_SESSION_ID || undefined
    });

    let retried = false;
    const retryOnce = (why) => {
      if (retried) return;
      retried = true;
      scheduleRetry(why);
    };

    conn.on('chat', (d) =>
      onChat({
        uniqueId: d.uniqueId,
        nickname: d.nickname,
        profilePictureUrl: d.profilePictureUrl,
        comment: d.comment
      })
    );
    conn.on('disconnected', () => retryOnce('disconnected'));
    conn.on('streamEnd', () => retryOnce('stream ended'));
    conn.on('error', (e) => console.warn('[tiktok] error:', e?.message || e));

    try {
      onStatus('connecting');
      const state = await conn.connect();
      delay = 5000;
      onStatus('connected');
      console.log(`[tiktok] connected to @${username} (room ${state.roomId})`);
    } catch (err) {
      retryOnce(`connect failed: ${err?.message || err}`);
    }
  }

  connect();
}
