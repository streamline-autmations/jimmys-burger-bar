// The product's single data access point.
//
// Components import `data` and never Supabase directly, so swapping in a demo
// adapter is one assignment rather than a network-interception layer.

import { adapter } from './adapter';
import type { DataAdapter } from './types';

export const data: DataAdapter = adapter;

export * from './types';
export { ConflictError } from './errors';
export { SubmissionError, classifySubmission, type SubmissionFailure, type RefusalReason } from './submission';
export { withTimeout, TimeoutError, isTimeout, isOffline, DEFAULT_TIMEOUT_MS } from './timeout';
