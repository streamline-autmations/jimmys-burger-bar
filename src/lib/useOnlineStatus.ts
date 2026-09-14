import { useEffect, useState } from 'react';

/**
 * The browser's own online flag, kept live.
 *
 * `navigator.onLine === false` is reliable (no network interface at all);
 * `true` only means "probably". So this is used to warn early and to hold a
 * submit back, never as proof that a request will get through.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine !== false));

  useEffect(() => {
    const update = () => setOnline(navigator.onLine !== false);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  return online;
}
