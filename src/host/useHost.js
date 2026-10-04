import { useCallback, useEffect, useState } from 'react';

const KEY = 'fusionHostKey';

/** Host session: the admin key lives in this browser only; every call proves it to the server. */
export function useHost() {
  const [key, setKey] = useState(() => localStorage.getItem(KEY) || '');
  const [admin, setAdmin] = useState(null); // last /status payload (null = not unlocked)
  const [error, setError] = useState('');

  const logout = useCallback(() => {
    localStorage.removeItem(KEY);
    setKey('');
    setAdmin(null);
  }, []);

  const call = useCallback(
    async (path, body) => {
      try {
        const r = await fetch(`/api/control${path}`, {
          method: body ? 'POST' : 'GET',
          headers: { 'x-admin-key': key, 'Content-Type': 'application/json' },
          body: body ? JSON.stringify(body) : undefined
        });
        const data = await r.json().catch(() => ({}));
        if (r.status === 403) {
          logout();
          setError('Wrong admin key');
          return null;
        }
        if (!r.ok) {
          setError(data.error || `Error ${r.status}`);
          return null;
        }
        setError('');
        return data;
      } catch {
        setError('Cannot reach the server');
        return null;
      }
    },
    [key, logout]
  );

  /** Fetch status; `call` results that carry a status payload (they have `mode`) update it too. */
  const refresh = useCallback(async () => {
    const d = await call('/status');
    if (d) setAdmin(d);
    return d;
  }, [call]);

  const act = useCallback(
    async (path, body = {}) => {
      const d = await call(path, body);
      if (d?.mode) setAdmin(d);
      return d;
    },
    [call]
  );

  useEffect(() => {
    if (key) refresh();
  }, [key, refresh]);

  const login = (k) => {
    setError('');
    localStorage.setItem(KEY, k.trim());
    setKey(k.trim());
  };

  return { key, admin, error, setError, call, act, refresh, login, logout, unlocked: !!admin };
}
