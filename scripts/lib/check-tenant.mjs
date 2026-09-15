// Launch-readiness check for one restaurant. Used by `npm run check-tenant`
// and by the test suite for every registered tenant.
import fs from 'node:fs';
import path from 'node:path';
import { load } from './load-ts.mjs';
import { settingsSql, validateTenant } from './tenant-settings.mjs';

const ASSET = /^\/[^\s?#]+\.(png|jpe?g|webp|svg|mp4|webm|gif|avif|ico)$/i;
const MARKERS = /PLACEHOLDER|__SLUG__|__NAME__/;

/**
 * Files some section types load directly rather than through config. Keep in
 * step with the components named; a test checks the paths still appear there.
 */
export const SECTION_ASSETS = {
  hero: {
    component: 'src/components/BurgerAssembly.tsx',
    files: [
      '/images/burger-layers/burger-bottom-bun.webp',
      '/images/burger-layers/burger-salad-layer.webp',
      '/images/burger-layers/burger-patty&cheese.webp',
      '/images/burger-layers/burger-top-bun.webp',
      '/images/burger-layers/burger-complete.webp',
    ],
  },
};

export const publicDirFor = (slug) => {
  const own = `src/tenants/${slug}/public`;
  return fs.existsSync(own) ? own : 'public';
};

const collectAssets = (value, found = new Set()) => {
  if (typeof value === 'string') {
    if (ASSET.test(value)) found.add(value);
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectAssets(item, found));
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => collectAssets(item, found));
  }
  return found;
};

export function checkTenant(slug) {
  const problems = [];
  const warnings = [];
  const dir = `src/tenants/${slug}`;
  const infraFile = `supabase/tenants/${slug}.json`;

  if (!fs.existsSync(`${dir}/config.ts`)) {
    return { problems: [`${dir}/config.ts does not exist. Run npm run new-tenant -- ${slug} "Name".`], warnings };
  }

  // 1. The config itself. defineRestaurant throws with every structural problem.
  let config;
  try {
    const module = load(`${dir}/config.ts`);
    config = Object.values(module).find((value) => value && typeof value === 'object' && 'slug' in value);
    if (!config) problems.push(`${dir}/config.ts exports no restaurant config`);
  } catch (error) {
    problems.push(error.message);
  }

  // 2. Placeholders, anywhere in the tenant's own files.
  const tenantFiles = fs.readdirSync(dir).filter((file) => /\.(ts|json)$/.test(file)).map((file) => `${dir}/${file}`);
  if (fs.existsSync(infraFile)) tenantFiles.push(infraFile);
  for (const file of tenantFiles) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    const hits = lines.map((line, index) => (MARKERS.test(line) ? index + 1 : 0)).filter(Boolean);
    if (hits.length) problems.push(`${file} still has placeholders on line${hits.length > 1 ? 's' : ''} ${hits.slice(0, 12).join(', ')}${hits.length > 12 ? '…' : ''}`);
  }

  // 3. Registered, so VITE_TENANT=<slug> actually builds it.
  if (!fs.readFileSync('src/config.ts', 'utf8').includes(`./tenants/${slug}/config`)) {
    problems.push(`${slug} is not registered in src/config.ts`);
  }

  if (!config) return { problems, warnings };

  if (config.slug !== slug) problems.push(`config slug "${config.slug}" does not match the folder "${slug}"`);

  // 4. Every photo, video and icon the site will request exists.
  const publicDir = publicDirFor(slug);
  const assets = collectAssets(config);
  for (const section of config.sections ?? []) {
    for (const file of SECTION_ASSETS[section.type]?.files ?? []) assets.add(file);
  }
  const missing = [...assets].filter((asset) => !fs.existsSync(path.join(publicDir, decodeURIComponent(asset))));
  if (missing.length) problems.push(`missing from ${publicDir}: ${missing.join(', ')}`);

  // 5. Server-side settings and the generated seed files.
  if (!fs.existsSync(infraFile)) {
    problems.push(`${infraFile} does not exist`);
  } else {
    const infra = JSON.parse(fs.readFileSync(infraFile, 'utf8'));
    problems.push(...validateTenant(infra, config).map((problem) => `${infraFile}: ${problem}`));
    for (const kind of ['order', 'booking', 'review']) {
      if (infra.webhooks?.[kind] === null) warnings.push(`${kind} notifications are switched off (webhooks.${kind} is null)`);
    }
    if (!problems.length) {
      const { resolveCopy } = load('src/core/config/copy.ts');
      const { orderableCategories, orderableItems, menuItemsSql } = load('src/core/menu/orderable.ts');
      const copy = resolveCopy(config.copy);
      const expected = {
        [`supabase/seed/settings.${slug}.sql`]: settingsSql(infra, config),
        [`supabase/seed/menu.${slug}.sql`]: menuItemsSql(orderableItems(orderableCategories(config.menu.categories, {
          label: copy.order.softDrinksLabel, note: copy.order.softDrinksNote, items: config.ordering.nonAlcoholicDrinks,
        })), slug),
      };
      for (const [file, sql] of Object.entries(expected)) {
        if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== sql) {
          problems.push(`${file} is missing or out of date: run npm run tenant:sql -- ${slug}, then apply it`);
        }
      }
    }
  }

  // 6. Honest gaps worth a second look, not blockers.
  if (!config.testimonials?.length) warnings.push('no testimonials: the reviews section will be empty (fine if there are no real reviews to quote)');
  if ((config.pages?.visit?.gallery?.length ?? 0) !== 6) warnings.push(`the Visit gallery has ${config.pages?.visit?.gallery?.length ?? 0} photos; its layout is designed for 6`);

  return { problems, warnings };
}
