import { useCallback, useEffect, useRef, useState } from 'react';

// Retain the last successful snapshot on refresh failure. Ignore superseded reads.
export function useAdminResource<T>(load: () => PromiseLike<T>, initial: T) {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true);
    setError(null);
    try {
      const result = await load();
      if (request === generation.current) { setData(result); setUpdatedAt(new Date()); }
    } catch {
      if (request === generation.current) setError('Could not refresh records. Check your connection or sign in again. Previously loaded records may be out of date.');
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, [load]);
  useEffect(() => { const token = generation; void refresh(); return () => { token.current++; }; }, [refresh]);
  return { data, setData, loading, error, updatedAt, refresh };
}
