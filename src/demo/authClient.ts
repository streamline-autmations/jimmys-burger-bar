// Stand-in for src/lib/supabase.ts in the demo build.
//
// Only the auth calls the staff console makes are implemented, and the demo
// staff member starts signed in so the walkthrough goes straight to the queue.
// There is deliberately no `from()` or `rpc()`: if anything in the demo ever
// tried to reach a real database it would fail loudly instead of quietly.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../lib/database.types';

const SIGNED_OUT_KEY = 'rd-demo-signed-out';

const demoUser = {
  id: '00000000-0000-4000-8000-0000000000d0',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'demo.staff@example.com',
  app_metadata: {},
  user_metadata: { name: 'Demo staff' },
  created_at: '2026-01-01T00:00:00.000Z',
};

const session = () => ({
  access_token: 'demo',
  refresh_token: 'demo',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: demoUser,
});

const readSignedOut = (): boolean => {
  try { return sessionStorage.getItem(SIGNED_OUT_KEY) === '1'; } catch { return false; }
};

type Listener = (event: string, next: ReturnType<typeof session> | null) => void;
const listeners = new Set<Listener>();

const notify = (event: string) => {
  const next = readSignedOut() ? null : session();
  listeners.forEach((listener) => listener(event, next));
};

const unavailable = { message: 'Two-factor setup is switched off in the demo.' };

const auth = {
  getSession: async () => ({ data: { session: readSignedOut() ? null : session() }, error: null }),

  onAuthStateChange: (listener: Listener) => {
    listeners.add(listener);
    return { data: { subscription: { unsubscribe: () => listeners.delete(listener) } } };
  },

  // Any details sign in: the point is to show the screen, not to guard it.
  signInWithPassword: async () => {
    try { sessionStorage.removeItem(SIGNED_OUT_KEY); } catch { /* storage blocked */ }
    notify('SIGNED_IN');
    return { data: { session: session(), user: demoUser }, error: null };
  },

  signOut: async () => {
    try { sessionStorage.setItem(SIGNED_OUT_KEY, '1'); } catch { /* storage blocked */ }
    notify('SIGNED_OUT');
    return { error: null };
  },

  mfa: {
    getAuthenticatorAssuranceLevel: async () => ({ data: { currentLevel: 'aal1', nextLevel: 'aal1', currentAuthenticationMethods: [] }, error: null }),
    listFactors: async () => ({ data: { all: [], totp: [], phone: [] }, error: null }),
    enroll: async () => ({ data: null, error: unavailable }),
    unenroll: async () => ({ data: null, error: unavailable }),
    challengeAndVerify: async () => ({ data: null, error: unavailable }),
  },
};

export const supabase = { auth } as unknown as SupabaseClient<Database>;
