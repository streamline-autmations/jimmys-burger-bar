import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";
import { tenantHtml } from "./vite-plugin-tenant-html";
import { demoMode, isDemoBuild } from "./vite-plugin-demo";

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  build: {
    sourcemap: 'hidden',
    // The demo builds into its own folder so it can never overwrite, or be
    // deployed as, the restaurant's production output.
    outDir: isDemoBuild() ? 'dist-demo' : 'dist',
  },
  plugins: [
    // First, so demo swaps and the production guard see every import.
    demoMode(),
    react({
      babel: {
        plugins: command === 'serve' ? ['react-dev-locator'] : [],
      },
    }),
    tsconfigPaths(),
    // Fills index.html (title, meta, OG, theme colour, boot palette, fonts)
    // from the active tenant, so launching a client never means editing HTML.
    tenantHtml({ entry: isDemoBuild() ? 'src/demo/config.ts' : undefined })
  ],
}))
