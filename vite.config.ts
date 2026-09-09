import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";
import { tenantHtml } from "./vite-plugin-tenant-html";

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  build: {
    sourcemap: 'hidden',
  },
  plugins: [
    react({
      babel: {
        plugins: command === 'serve' ? ['react-dev-locator'] : [],
      },
    }),
    tsconfigPaths(),
    // Fills index.html (title, meta, OG, theme colour, boot palette, fonts)
    // from the active tenant, so launching a client never means editing HTML.
    tenantHtml()
  ],
}))
