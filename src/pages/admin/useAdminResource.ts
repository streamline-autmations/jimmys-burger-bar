import { useCallback, useEffect, useRef, useState } from 'react';
import { data as db } from '../../core/data';

interface AdminResourceOptions {
  pollMs?: number;
  paused?: boolean;
}

// Retain the last successful snapshot on refresh failure. Ignore superseded reads.
export function useAdminResource<T>(
  load: () => PromiseLike<T>,
  initial: T,
  { pollMs = 30_000, paused = false }: AdminResourceOptions = {},
) {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const generation = useRef(0);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const run = useCallback(async (silent: boolean) => {
    const request = ++generation.current;
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const result = await load();
      if (request === generation.current && (!silent || !pausedRef.current)) {
        setData(result);
        setUpdatedAt(new Date());
        setError(null);
      }
    } catch {
      if (request === generation.current && (!silent || !pausedRef.current)) {
        setError('Could not refresh records. Check your connection or sign in again. Previously loaded records may be out of date.');
      }
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, [load]);

  const refresh = useCallback(() => run(false), [run]);
  const refreshSilently = useCallback(() => run(true), [run]);

  useEffect(() => { const token = generation; void refresh(); return () => { token.current++; }; }, [refresh]);

  useEffect(() => {
    if (pollMs <= 0) return;

    const canRefresh = () => !pausedRef.current && document.visibilityState !== 'hidden';
    const poll = () => {
      if (canRefresh()) void refreshSilently();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !pausedRef.current) void refreshSilently();
    };
    const handleOnline = () => {
      if (canRefresh()) void refreshSilently();
    };

    const interval = window.setInterval(poll, pollMs);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
    };
  }, [pollMs, refreshSilently]);

  // Push updates where the adapter offers them; polling stays as the fallback.
  useEffect(() => {
    if (!db.subscribe) return;
    return db.subscribe(() => {
      if (!pausedRef.current) void refreshSilently();
    });
  }, [refreshSilently]);

  return { data, setData, loading, error, updatedAt, refresh };
}
