// The adapter this build talks to.
//
// A separate one-line module on purpose: the demo build (VITE_DEMO=1) swaps
// this file for src/demo/adapter.ts at resolve time (see vite-plugin-demo.ts),
// so a production bundle never contains the demo store and the demo bundle
// never contains the Supabase client.

export { supabaseAdapter as adapter } from './supabaseAdapter';
