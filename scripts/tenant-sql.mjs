// Generates a restaurant's database seed files from the repo.
//
//   npm run tenant:sql -- <slug>            write both files
//   npm run tenant:sql -- <slug> --check    exit 1 if either committed file is out of date
//
// Outputs:
//   supabase/seed/settings.<slug>.sql   webhooks, timezone, phone country code, review schedule
//   supabase/seed/menu.<slug>.sql       the prices create_order charges
//
// Apply both after the baseline migration, and re-apply the menu file (then
// deploy the site straight after) whenever prices or dishes change.
import fs from 'node:fs';
import { load } from './lib/load-ts.mjs';
import { settingsSql } from './lib/tenant-settings.mjs';

const args = process.argv.slice(2);
const check = args.includes('--check');
const slug = args.find((arg) => !arg.startsWith('--')) ?? 'jimmys';

const configFile = `src/tenants/${slug}/config.ts`;
const infraFile = `supabase/tenants/${slug}.json`;
for (const file of [configFile, infraFile]) {
  if (!fs.existsSync(file)) {
    console.error(`${file} does not exist. Scaffold the restaurant first with npm run new-tenant -- ${slug} "Name".`);
    process.exit(1);
  }
}

const module = load(configFile);
const config = Object.values(module).find((value) => value && typeof value === 'object' && 'slug' in value);
if (!config) {
  console.error(`${configFile} exports no restaurant config.`);
  process.exit(1);
}
const infra = JSON.parse(fs.readFileSync(infraFile, 'utf8'));

const { resolveCopy } = load('src/core/config/copy.ts');
const { orderableCategories, orderableItems, menuItemsSql } = load('src/core/menu/orderable.ts');
const copy = resolveCopy(config.copy);
const items = orderableItems(orderableCategories(config.menu.categories, {
  label: copy.order.softDrinksLabel,
  note: copy.order.softDrinksNote,
  items: config.ordering.nonAlcoholicDrinks,
}));

let outputs;
try {
  outputs = [
    [`supabase/seed/settings.${slug}.sql`, settingsSql(infra, config)],
    [`supabase/seed/menu.${slug}.sql`, menuItemsSql(items, slug)],
  ];
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

let stale = false;
for (const [file, sql] of outputs) {
  if (check) {
    const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
    if (current !== sql) {
      console.error(`${file} is out of date. Run npm run tenant:sql -- ${slug}, then apply it to the database.`);
      stale = true;
    }
  } else {
    fs.writeFileSync(file, sql);
    console.log(`Wrote ${file}`);
  }
}
if (stale) process.exit(1);
if (check) console.log(`Seed files for ${slug} match the repo.`);
