// Scaffolds a new restaurant.
//
//   npm run new-tenant -- <slug> "<Restaurant name>"
//
// Creates src/tenants/<slug>/ (config and home page sections from the
// template), src/tenants/<slug>/public/ for its photos, and
// supabase/tenants/<slug>.json for its server settings, then registers it in
// src/config.ts. Every value that needs the client's real details is marked
// PLACEHOLDER; `npm run check-tenant -- <slug>` fails until none remain.
import fs from 'node:fs';

const [slug, name] = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

if (!slug || !name) fail('Usage: npm run new-tenant -- <slug> "<Restaurant name>"\n  e.g. npm run new-tenant -- rosies-diner "Rosie\'s Diner"');
if (!/^[a-z][a-z0-9-]{1,30}$/.test(slug)) fail(`"${slug}" is not a valid slug: lowercase letters, digits and hyphens, starting with a letter.`);
if (slug.startsWith('_') || slug.endsWith('-demo')) fail(`"${slug}" is reserved.`);

const dir = `src/tenants/${slug}`;
const infraFile = `supabase/tenants/${slug}.json`;
if (fs.existsSync(dir) || fs.existsSync(infraFile)) fail(`${dir} or ${infraFile} already exists.`);

// Check everything that could stop the scaffold before writing anything, so a
// failure never leaves a half-made restaurant behind.
const registry = fs.readFileSync('src/config.ts', 'utf8');
const importMarker = '// new-tenant:import';
const registerMarker = '  // new-tenant:register';
if (!registry.includes(importMarker) || !registry.includes(registerMarker)) {
  fail('src/config.ts is missing its new-tenant markers. Restore them from git history, or register the tenant by hand.');
}

const identifier = slug.replace(/-([a-z0-9])/g, (_, char) => char.toUpperCase());
const escapeSingle = (value) => value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

// Function replacers, so a "$" in a restaurant name is inserted literally
// rather than read as a replacement pattern.
const fill = (text) => text
  .replace(/__SLUG__/g, () => slug)
  .replace(/__NAME__/g, () => escapeSingle(name))
  .replace(/export const template\b/, `export const ${identifier}`)
  .replace(/\btemplateSections\b/g, `${identifier}Sections`);

fs.mkdirSync(`${dir}/public/images`, { recursive: true });
fs.writeFileSync(`${dir}/public/images/.gitkeep`, '');
fs.writeFileSync(`${dir}/config.ts`, fill(fs.readFileSync('src/tenants/_template/config.ts', 'utf8'))
  .replace(/^\/\/ =+\n\/\/ NEW RESTAURANT TEMPLATE[\s\S]*?\/\/ =+\n/m, () => `// ============================================================================
// ${name.replace(/\n/g, ' ')}. Scaffolded ${new Date().toISOString().slice(0, 10)} from src/tenants/_template.
//
// Replace every placeholder marker with the restaurant's REAL details. No invented
// reviews, ratings, prices, dishes, hours or photos. Check with:
//   npm run check-tenant -- ${slug}
// ============================================================================
`));
fs.writeFileSync(`${dir}/sections.ts`, fill(fs.readFileSync('src/tenants/_template/sections.ts', 'utf8')));
fs.writeFileSync(infraFile, fill(fs.readFileSync('supabase/tenants/_template.json', 'utf8')));

fs.writeFileSync('src/config.ts', registry
  .replace(importMarker, `import { ${identifier} } from './tenants/${slug}/config';\n${importMarker}`)
  .replace(registerMarker, `  '${slug}': ${identifier},\n${registerMarker}`));

console.log(`Created ${name} (${slug}):
  ${dir}/config.ts          brand, contact, hours, menu, pages
  ${dir}/sections.ts        home page, top to bottom
  ${dir}/public/            photos, videos, logo, favicon
  ${infraFile}   Supabase project, webhooks, review schedule

Next: follow docs/NEW-RESTAURANT.md. Run the site locally with
  VITE_TENANT=${slug} npm run dev
and check progress with
  npm run check-tenant -- ${slug}`);
