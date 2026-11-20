/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  /** Geoapify key for delivery address suggestions. Unset: Photon is used instead. */
  readonly VITE_GEOAPIFY_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
