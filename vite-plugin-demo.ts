import path from 'node:path';
import type { Plugin } from 'vite';

/**
 * The sales demo, gated at BUILD time.
 *
 * With VITE_DEMO=1 four modules are swapped as they are resolved:
 *
 *   src/config.ts                   -> src/demo/config.ts      (Jimmy's brand, demo tenant slug, no intro)
 *   src/core/data/adapter.ts        -> src/demo/adapter.ts     (in-browser fictional records)
 *   src/lib/supabase.ts             -> src/demo/authClient.ts  (always-signed-in fictional staff)
 *   src/components/BuildOverlay.tsx -> src/demo/DemoShell.tsx  (banner, controls, inert links)
 *
 * Without it, the plugin does the opposite job: any attempt to load a file
 * from src/demo fails the build. There is no runtime flag and no query string,
 * so a restaurant's production site cannot be switched into demo mode, and
 * scripts/check-build.mjs double-checks the output after every build.
 */

const SWAPS: Record<string, string> = {
  'src/config.ts': 'src/demo/config.ts',
  'src/core/data/adapter.ts': 'src/demo/adapter.ts',
  'src/lib/supabase.ts': 'src/demo/authClient.ts',
  'src/components/BuildOverlay.tsx': 'src/demo/DemoShell.tsx',
};

const DEMO_DIR = `${path.sep}src${path.sep}demo${path.sep}`;

export const isDemoBuild = (): boolean => process.env.VITE_DEMO === '1';

export function demoMode(root: string = process.cwd()): Plugin {
  const demo = isDemoBuild();
  const swaps = new Map(
    Object.entries(SWAPS).map(([from, to]) => [path.resolve(root, from), path.resolve(root, to)]),
  );

  return {
    name: 'restaurant-direct:demo-mode',
    enforce: 'pre',

    async resolveId(source, importer, options) {
      if (!importer) return null;
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      if (!resolved) return null;
      const file = resolved.id.split('?')[0];

      if (demo) {
        // Fail closed: nothing in a demo may load a Supabase client, whatever
        // credentials the build environment happens to have. Type-only imports
        // are erased before resolution, so they never reach this check.
        if (/[\\/]node_modules[\\/]@supabase[\\/]/.test(file)) {
          this.error(`Supabase imported into the demo build (from ${path.relative(root, importer)}). Route it through a demo seam instead.`);
        }
        return swaps.get(file) ?? null;
      }

      if (file.includes(DEMO_DIR)) {
        this.error(`Demo code imported into a production build: ${path.relative(root, file)} (from ${path.relative(root, importer)}). Demo modules are only reachable with VITE_DEMO=1.`);
      }
      return null;
    },

    // Belt and braces for modules that arrive without an importer (entry points).
    load(id) {
      const file = id.split('?')[0];
      if (!demo && file.includes(DEMO_DIR)) {
        this.error(`Demo module loaded in a production build: ${path.relative(root, file)}.`);
      }
      if (demo && file === path.resolve(root, 'src/lib/supabase.ts')) {
        this.error('src/lib/supabase.ts loaded in the demo build: the swap was bypassed.');
      }
      return null;
    },

    transformIndexHtml(html) {
      if (!demo) return html;
      // A demo must never be indexed or mistaken for the restaurant's own site.
      return html.replace('<head>', '<head>\n    <meta name="robots" content="noindex, nofollow" />');
    },
  };
}
