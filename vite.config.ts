import fs from 'node:fs'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";
import { tenantHtml } from "./vite-plugin-tenant-html";
import { demoMode, isDemoBuild } from "./vite-plugin-demo";

// https://vite.dev/config/
// Each restaurant's photos, videos, logo and favicon live in
// src/tenants/<slug>/public and are served from the site root, so config paths
// like "/images/logo.png" work unchanged. Jimmy's predates this and still uses
// the top-level public/ folder, which remains the fallback.
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const demo = isDemoBuild()
  const tenant = demo ? 'jimmys' : process.env.VITE_TENANT ?? env.VITE_TENANT ?? 'jimmys'
  const tenantPublic = `src/tenants/${tenant}/public`
  const publicDir = fs.existsSync(tenantPublic) ? tenantPublic : 'public'

  return {
    publicDir,
    build: {
      sourcemap: 'hidden',
      // The demo builds into its own folder so it can never overwrite, or be
      // deployed as, the restaurant's production output.
      outDir: demo ? 'dist-demo' : 'dist',
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
      tenantHtml({ slug: tenant, entry: demo ? 'src/demo/config.ts' : undefined }),
    ],
  }
})
