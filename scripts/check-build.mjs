// Runs after every build. Fails the build if demo code reached a restaurant's
// production output, or if a demo build could reach a real database.
//
// vite-plugin-demo.ts already refuses to load src/demo in a production build;
// this checks the thing that actually ships, in case a future change routes
// around the plugin.
import fs from 'node:fs';
import path from 'node:path';

const demo = process.env.VITE_DEMO === '1';
const dir = demo ? 'dist-demo' : 'dist';

if (!fs.existsSync(dir)) {
  console.error(`check-build: ${dir}/ does not exist. Run the build first.`);
  process.exit(1);
}

const files = [];
const walk = (folder) => {
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    const full = path.join(folder, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(js|html|css)$/.test(entry.name)) files.push(full);
  }
};
walk(dir);
const contents = files.map((file) => [file, fs.readFileSync(file, 'utf8')]);
const find = (needle) => contents.filter(([, text]) => text.includes(needle)).map(([file]) => file);

// Strings that only exist in demo modules.
const DEMO_MARKERS = ['data-rd-demo', 'rd-demo-records-v1', 'rd-demo-signed-out', 'JB-DEMO-', 'Presenter controls'];
const problems = [];

// Which Vercel project is building, if any. The demo project must only ever
// publish the demo, and a restaurant's project must never publish it: a demo
// project once went live with the default build command and served a plain
// copy of Jimmy's site on a second public URL.
const DEMO_PROJECTS = new Set(['prj_BpuBFUISZC0rmLqzUf6rrqUv9Tbp']);
const vercelProject = process.env.VERCEL_PROJECT_ID ?? '';
console.log(`check-build: VERCEL=${process.env.VERCEL ?? 'unset'} VERCEL_PROJECT_ID=${vercelProject || 'unset'}`);
if (vercelProject && DEMO_PROJECTS.has(vercelProject) && !demo) {
  problems.push('this Vercel project is the sales demo, but the build is not a demo build. Set the Build Command to "npm run build:demo" and the Output Directory to "dist-demo".');
}
if (vercelProject && !DEMO_PROJECTS.has(vercelProject) && demo) {
  problems.push('a demo build is running in a restaurant\'s Vercel project. Demo builds belong only to restaurant-direct-demo.');
}

// Every restaurant builds from this one repo. On Vercel, a restaurant project
// must say which restaurant it is, and must point at that restaurant's own
// database: forgetting VITE_TENANT silently publishes Jimmy's site, and a
// copied Supabase URL sends the new restaurant's orders to Jimmy's kitchen.
// Jimmy's project predates VITE_TENANT and is the one exemption.
const LEGACY_DEFAULT_PROJECT = 'prj_e8szqEfeKBPjuUrC34p6ULSKbSbV';
if (process.env.VERCEL && !demo) {
  const tenant = process.env.VITE_TENANT;
  if (!tenant && vercelProject !== LEGACY_DEFAULT_PROJECT) {
    problems.push('VITE_TENANT is not set for this Vercel project. Set it to the restaurant\'s slug (Settings → Environment Variables).');
  }
  const slug = tenant ?? 'jimmys';
  const infraFile = `supabase/tenants/${slug}.json`;
  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? '';
  let ref = '';
  if (!fs.existsSync(infraFile)) {
    problems.push(`${infraFile} does not exist for VITE_TENANT="${slug}"`);
  } else {
    ref = JSON.parse(fs.readFileSync(infraFile, 'utf8')).supabaseProjectRef ?? '';
    if (!supabaseUrl) problems.push('VITE_SUPABASE_URL is not set: the site would build but could not take orders.');
    else if (!ref || /PLACEHOLDER/.test(ref)) problems.push(`${infraFile} has no supabaseProjectRef yet`);
    else {
      let url;
      try {
        url = new URL(supabaseUrl);
      } catch {
        // The shared error below explains the required tenant URL shape.
      }
      if (!url
        || url.protocol !== 'https:'
        || url.hostname !== `${ref}.supabase.co`
        || url.port
        || url.username
        || url.password
        || !['', '/'].includes(url.pathname)
        || url.search
        || url.hash) {
        problems.push(`VITE_SUPABASE_URL does not belong to ${slug}'s Supabase project (${ref}). It must be exactly https://${ref}.supabase.co so orders cannot go to another restaurant's database.`);
      }
    }
  }

  const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';
  if (!publishableKey) {
    problems.push('VITE_SUPABASE_PUBLISHABLE_KEY is not set.');
  } else if (publishableKey.startsWith('sb_secret_')) {
    problems.push('VITE_SUPABASE_PUBLISHABLE_KEY is a secret key. VITE_* values ship to browsers; use an sb_publishable_ key or the project anon JWT.');
  } else if (!publishableKey.startsWith('sb_publishable_')) {
    const parts = publishableKey.split('.');
    if (parts.length !== 3 || parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))) {
      problems.push('VITE_SUPABASE_PUBLISHABLE_KEY has an unrecognised shape. Use an sb_publishable_ key or the project anon JWT.');
    } else {
      let payload;
      let decoded = false;
      try {
        payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
        decoded = true;
      } catch {
        problems.push('VITE_SUPABASE_PUBLISHABLE_KEY looks like a JWT but its payload cannot be decoded. Use the project anon JWT.');
      }
      if (decoded && payload?.role !== 'anon') {
        problems.push(`VITE_SUPABASE_PUBLISHABLE_KEY JWT role is "${payload?.role ?? 'missing'}", not "anon". VITE_* values ship to browsers.`);
      }
      if (decoded && payload && typeof payload === 'object' && Object.hasOwn(payload, 'ref') && payload.ref !== ref) {
        problems.push(`VITE_SUPABASE_PUBLISHABLE_KEY belongs to Supabase project ${payload.ref}, not ${slug}'s project (${ref}).`);
      }
    }
  }
}

if (demo) {
  for (const marker of ['data-rd-demo', 'rd-demo-records-v1']) {
    if (!find(marker).length) problems.push(`demo build is missing "${marker}": the demo modules were not swapped in`);
  }
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  if (!html.includes('noindex')) problems.push('demo index.html is missing the noindex robots tag');
  // A demo must not be able to reach a real project, whatever env the build had.
  // Broad on purpose: auth, storage and custom-domain clients all carry the name.
  for (const needle of ['supabase', 'Supabase', 'rest/v1', 'create_order', 'auth/v1']) {
    const hits = find(needle);
    if (hits.length) problems.push(`demo build references "${needle}" in ${hits.join(', ')}`);
  }
} else {
  for (const marker of DEMO_MARKERS) {
    const hits = find(marker);
    if (hits.length) problems.push(`production build contains demo marker "${marker}" in ${hits.join(', ')}`);
  }
}

if (problems.length) {
  console.error(`check-build (${demo ? 'demo' : 'production'}) FAILED:\n  - ${problems.join('\n  - ')}`);
  process.exit(1);
}
console.log(`check-build (${demo ? 'demo' : 'production'}): ok, ${files.length} files checked.`);
