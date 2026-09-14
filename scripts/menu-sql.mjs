// Writes supabase/seed/menu.<slug>.sql from the tenant config.
//   npm run menu:sql          regenerate the file
//   npm run menu:sql -- --check   exit 1 if the committed file is out of date
import fs from 'node:fs';
import { load } from './lib/load-ts.mjs';

const { config } = load('src/config.ts');
const { resolveCopy } = load('src/core/config/copy.ts');
const { orderableCategories, orderableItems, menuItemsSql } = load('src/core/menu/orderable.ts');

const copy = resolveCopy(config.copy);
const categories = orderableCategories(config.menu.categories, {
  label: copy.order.softDrinksLabel,
  note: copy.order.softDrinksNote,
  items: config.ordering.nonAlcoholicDrinks,
});
const sql = menuItemsSql(orderableItems(categories), config.slug);
const target = `supabase/seed/menu.${config.slug}.sql`;

if (process.argv.includes('--check')) {
  const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
  if (current !== sql) {
    console.error(`${target} is out of date with the menu config. Run npm run menu:sql and apply it to the database.`);
    process.exit(1);
  }
  console.log(`${target} matches the config.`);
} else {
  fs.writeFileSync(target, sql);
  console.log(`Wrote ${target} (${orderableItems(categories).length} items).`);
}
