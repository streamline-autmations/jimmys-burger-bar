// Is this restaurant ready to launch?
//
//   npm run check-tenant -- <slug>
//
// Fails on anything that would ship wrong: placeholders, missing photos, an
// unregistered tenant, invalid server settings, stale seed files. Prints
// warnings for gaps worth a second look.
import { checkTenant } from './lib/check-tenant.mjs';

const slug = process.argv.slice(2).find((arg) => !arg.startsWith('--'));
if (!slug) {
  console.error('Usage: npm run check-tenant -- <slug>');
  process.exit(1);
}

const { problems, warnings } = checkTenant(slug);
for (const warning of warnings) console.log(`warning: ${warning}`);
if (problems.length) {
  console.error(`\n${slug} is NOT ready:\n  - ${problems.join('\n  - ')}`);
  process.exit(1);
}
console.log(`\n${slug} passes every launch check.`);
