import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Public-safe: this is the anon/publishable key, meant to ship in the client
// bundle. Access control depends on backend RLS and grants. Those policies
// are not defined in this repository and require a separate security audit.
export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);
