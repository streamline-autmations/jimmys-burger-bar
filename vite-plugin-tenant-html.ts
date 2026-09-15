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

export function tenantHtml({ slug, entry }: { slug: string; entry?: string }): Plugin {
  return {
    name: 'restaurant-direct:tenant-html',
    async transformIndexHtml(html) {
      const config = await loadTenant(slug, entry) as never as {
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
        '%TENANT_FONT_LINK%': fontHref
          ? `<link rel="preconnect" href="https://fonts.googleapis.com" />\n    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />\n    <link rel="stylesheet" href="${fontHref}" />`
          : '',
      };

      let output = html;
      for (const [token, value] of Object.entries(tokens)) {
        output = output.split(token).join(value);
      }

      const leftover = output.match(/%TENANT_[A-Z_]+%/g);
      if (leftover) throw new Error(`index.html has unfilled tenant tokens: ${leftover.join(', ')}`);
      return output;
    },
  };
}
