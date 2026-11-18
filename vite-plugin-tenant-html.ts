import fs from 'node:fs';
import { build } from 'esbuild';
import type { Plugin } from 'vite';

/**
 * Fills index.html from the tenant configuration.
 *
 * index.html previously hardcoded the page title, meta description, all the
 * Open Graph and Twitter tags, the canonical domain, the theme colour and the
 * colours of the pre-paint boot animation. None of it could be reached from
 * config, so launching a client meant hand-editing this file and hoping nothing
 * was missed - the OG tags in particular are invisible until someone shares the
 * link and the wrong restaurant's description appears.
 *
 * The font <link> is generated here too. The Google Fonts request used to be an
 * @import at the top of index.css, so changing theme.fonts set a CSS variable
 * naming a family the browser had never been asked to download, and the page
 * silently fell back. Moving it into the document head also removes a
 * render-blocking CSS import.
 */

async function loadTenant(slug: string, entry = `src/tenants/${slug}/config.ts`) {
  // The config is TypeScript with imports, so it is bundled to CJS in memory
  // rather than parsed. esbuild ships with Vite, so this adds no dependency.
  const result = await build({
    entryPoints: [entry],
    bundle: true, write: false, format: 'cjs', platform: 'node', logLevel: 'silent',
  });
  const source = result.outputFiles[0].text;
  const module = { exports: {} as Record<string, unknown> };
  new Function('module', 'exports', 'require', source)(module, module.exports, require);
  const config = module.exports[slug] ?? module.exports.config ?? Object.values(module.exports)[0];
  if (!config) throw new Error(`Tenant "${slug}" exported no config`);
  return config as Record<string, never>;
}

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

type ManifestSource = { venue: { name: string }; seo: { themeColor: string }; theme: { colors: Record<string, string> } };

/**
 * The staff console's web app manifest, so the kitchen screen can be pinned as
 * a window on the POS and added to a phone's Home Screen. Linked only from
 * /admin (AdminApp), so the public site never offers to install the console.
 * Icons are listed only when the tenant has them in its public folder.
 */
export function staffManifest(config: ManifestSource, publicDir: string): string {
  const icon = (size: number, purpose: string) => ({ src: `/images/app/icon-${size}.png`, sizes: `${size}x${size}`, type: 'image/png', purpose });
  return JSON.stringify({
    id: '/admin/kitchen',
    name: `${config.venue.name} Kitchen`,
    short_name: 'Kitchen',
    start_url: '/admin/kitchen',
    scope: '/admin/',
    display: 'standalone',
    background_color: config.theme.colors.paper,
    theme_color: config.seo.themeColor,
    icons: fs.existsSync(`${publicDir}/images/app/icon-512.png`)
      ? [icon(192, 'any'), icon(512, 'any'), icon(512, 'maskable')]
      : [],
  }, null, 2);
}

export function tenantHtml({ slug, entry }: { slug: string; entry?: string }): Plugin {
  const publicDir = fs.existsSync(`src/tenants/${slug}/public`) ? `src/tenants/${slug}/public` : 'public';
  const manifest = async () => staffManifest(await loadTenant(slug, entry) as never as ManifestSource, publicDir);
  return {
    name: 'restaurant-direct:tenant-html',
    configureServer(server) {
      server.middlewares.use('/staff.webmanifest', (_req, res) => {
        void manifest().then((body) => { res.setHeader('Content-Type', 'application/manifest+json'); res.end(body); });
      });
    },
    async generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'staff.webmanifest', source: await manifest() });
    },
    async transformIndexHtml(html) {
      const config = await loadTenant(slug, entry) as never as {
        slug: string;
        seo: { title: string; description: string; themeColor: string };
        assets: { favicon: string; ogImage: string; siteUrl: string };
        venue: { name: string; nameSuffix: string };
        theme: { colors: Record<string, string>; googleFonts?: string[] };
      };

      const fontHref = config.theme.googleFonts?.length
        ? `https://fonts.googleapis.com/css2?${config.theme.googleFonts
            .map((family) => `family=${family}`)
            .join('&')}&display=swap`
        : null;

      const tokens: Record<string, string> = {
        '%TENANT_TITLE%': escapeHtml(config.seo.title),
        '%TENANT_DESCRIPTION%': escapeHtml(config.seo.description),
        '%TENANT_THEME_COLOR%': config.seo.themeColor,
        '%TENANT_FAVICON%': config.assets.favicon,
        '%TENANT_OG_IMAGE%': config.assets.ogImage,
        '%TENANT_SITE_URL%': config.assets.siteUrl,
        '%TENANT_SITE_NAME%': escapeHtml(`${config.venue.name} ${config.venue.nameSuffix}`.trim()),
        // The boot layer is inline CSS evaluated before any JS, so it cannot
        // read a CSS variable set later by ThemeProvider.
        '%TENANT_PAPER%': config.theme.colors.paper,
        '%TENANT_INK%': config.theme.colors.ink,
        // Same key as storageKey('intro-seen') in App.tsx.
        '%TENANT_INTRO_SEEN_KEY%': `${config.slug}-intro-seen`,
        '%TENANT_FONT_LINK%': fontHref
          ? `<link rel="preconnect" href="https://fonts.googleapis.com" />\n    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />\n    <link rel="stylesheet" href="${fontHref}" />`
          : '',
      };

      let output = slug === 'jimmys-staging'
        ? html.replace('</head>', '<meta name="robots" content="noindex,nofollow" /></head>')
        : html;
      for (const [token, value] of Object.entries(tokens)) {
        output = output.split(token).join(value);
      }

      const leftover = output.match(/%TENANT_[A-Z_]+%/g);
      if (leftover) throw new Error(`index.html has unfilled tenant tokens: ${leftover.join(', ')}`);
      return output;
    },
  };
}
