// The demo's database: the browser's own storage.
//
// localStorage rather than memory, for two reasons that both matter on a sales
// call. A reload mid-demo keeps the order the presenter just placed. And the
// `storage` event carries changes between tabs, so the customer site on a phone
// frame and the staff console in a second window stay in step: an order placed
// in one appears in the other's queue immediately.

import { restaurantDate } from '../core/tenant';
import { createSeed, type DemoRecords } from './seed';

const KEY = 'rd-demo-records-v1';

interface Stored extends DemoRecords {
  /** The restaurant date the seed was laid out for. A new day re-seeds, so "today" is never empty. */
  seededFor: string;
}

let memory: Stored | null = null;
const listeners = new Set<() => void>();

const storage = (): Storage | null => {
  try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; }
};

const fresh = (): Stored => ({ ...createSeed(), seededFor: restaurantDate() });

export function readRecords(): Stored {
  const store = storage();
  if (store) {
    try {
      const parsed = JSON.parse(store.getItem(KEY) ?? 'null') as Stored | null;
      if (parsed && parsed.seededFor === restaurantDate()) return parsed;
    } catch { /* corrupt or blocked: fall through to a fresh seed */ }
  } else if (memory && memory.seededFor === restaurantDate()) {
    return memory;
  }
  const seeded = fresh();
  writeRecords(seeded, false);
  return seeded;
}

export function writeRecords(records: Stored, announce = true): void {
  memory = records;
  const store = storage();
  if (store) {
    try { store.setItem(KEY, JSON.stringify(records)); } catch { /* quota or blocked: memory still holds it */ }
  }
  if (announce) listeners.forEach((listener) => listener());
}

/**
 * Apply a change to the freshest records and announce it. The callback returns
 * false to leave everything untouched, so checks made inside it (duplicates,
 * stale statuses) see what another tab may have just written.
 */
export function updateRecords(change: (records: Stored) => boolean): void {
  const records = readRecords();
  if (change(records)) writeRecords(records);
}

export function resetRecords(): void {
  writeRecords(fresh());
}

export function subscribeRecords(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => { if (event.key === KEY) listener(); };
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
  };
}
