// The product's single data access point.
//
// Components import `data` and never Supabase directly, so swapping in a demo
// adapter is one assignment rather than a network-interception layer.

import { supabaseAdapter } from './supabaseAdapter';
import type { DataAdapter } from './types';

export const data: DataAdapter = supabaseAdapter;

export * from './types';
export { ConflictError } from './supabaseAdapter';
export { withTimeout, TimeoutError, isTimeout, isOffline, DEFAULT_TIMEOUT_MS } from './timeout';
