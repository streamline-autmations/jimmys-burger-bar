import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Public-safe: this is the anon/publishable key, meant to ship in the client
// bundle. Every table it can reach is locked down by RLS — see the schema
// migrations in the jimmys-supabase Supabase project for the actual policies.
export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);
