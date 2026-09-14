import { isOffline, isTimeout } from './timeout';

/**
 * What a failed customer submission means for the customer.
 *
 * The distinction that matters is not "which error" but "was anything saved":
 *
 * - `rejected`  The server answered and refused. Nothing was saved, so the
 *               customer can fix the problem and send again.
 * - `throttled` Refused by the anti-spam limit. Nothing saved; sending again
 *               straight away will not help, phoning will.
 * - `uncertain` No trustworthy answer: a timeout, a dropped connection, a
 *               gateway error. The request may have landed. The only safe
 *               next step is to repeat the SAME request, which the server
 *               treats as a no-op if it already has it.
 *
 * Previously every failure was treated as uncertain and the order form locked
 * permanently, with WhatsApp as the only way out - even when the server had
 * plainly said "no" and nothing had been saved.
 */
export type SubmissionFailure = 'rejected' | 'throttled' | 'uncertain';

export class SubmissionError extends Error {
  constructor(
    public readonly kind: SubmissionFailure,
    /** True when the device reported no connection at the time. */
    public readonly offline = false,
    cause?: unknown,
  ) {
    super(kind);
    this.name = 'SubmissionError';
    if (cause !== undefined) (this as { cause?: unknown }).cause = cause;
  }
}

interface ServerError {
  code?: string;
  message?: string;
}

const asServerError = (error: unknown): ServerError =>
  typeof error === 'object' && error !== null ? (error as ServerError) : {};

/**
 * Maps whatever the transport produced onto a SubmissionError.
 *
 * `savedConstraint` names the unique key a retry collides with when its first
 * attempt did land (the booking primary key, the order reference). Hitting
 * THAT key is proof the request was saved. Any other 23505 is a genuine
 * failure: before the Phase 3 migration a returning guest's phone number
 * colliding in `customers` rolled back the whole order with the same code.
 */
export function classifySubmission(error: unknown, savedConstraint?: string): SubmissionError | 'saved' {
  if (error instanceof SubmissionError) return error;
  if (isTimeout(error)) return new SubmissionError('uncertain', false, error);
  if (isOffline(error)) return new SubmissionError('uncertain', true, error);

  const { code = '', message = '' } = asServerError(error);
  const text = message.toLowerCase();

  // A unique-key collision on a retried request: the first attempt landed.
  if (code === '23505' && savedConstraint && message.includes(savedConstraint)) return 'saved';

  // RAISE EXCEPTION from our own functions and triggers. The transaction was
  // rolled back, so this is a definite "not saved".
  if (code === 'P0001') {
    if (text.includes('too many') || text.includes('temporarily unavailable')) {
      return new SubmissionError('throttled', false, error);
    }
    return new SubmissionError('rejected', false, error);
  }

  // Postgres data or permission errors (class 22, 23, 42) and PostgREST's own
  // request errors are all answered refusals.
  if (/^(22|23|42)/.test(code) || code.startsWith('PGRST')) {
    return new SubmissionError('rejected', false, error);
  }

  // No code at all: fetch failed, a proxy returned HTML, or the response was
  // lost. Cannot tell whether the write happened.
  return new SubmissionError('uncertain', false, error);
}
