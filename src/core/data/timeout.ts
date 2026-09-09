/**
 * Wraps a promise in a deadline.
 *
 * The codebase had no timeout on any network call. A hung Supabase request
 * left the order form stuck on "Placing order…" indefinitely, with no retry and
 * no way back - the worst possible state for someone trying to buy dinner.
 *
 * Deliberately NOT a retry: order creation is not safely repeatable without a
 * server-side idempotency key, so a timeout surfaces as a clear failure the
 * customer can act on rather than a silent second order.
 */
export class TimeoutError extends Error {
  constructor(public readonly ms: number) {
    super(`Timed out after ${ms}ms`);
    this.name = 'TimeoutError';
  }
}

export const DEFAULT_TIMEOUT_MS = 15000;

export function withTimeout<T>(work: Promise<T>, ms: number = DEFAULT_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(ms)), ms);
  });
  return Promise.race([work, deadline]).finally(() => clearTimeout(timer)) as Promise<T>;
}

export const isTimeout = (error: unknown): boolean => error instanceof TimeoutError;

/** True when the failure looks like connectivity rather than a rejected request. */
export const isOffline = (error: unknown): boolean => {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  return message.includes('failed to fetch') || message.includes('networkerror');
};
