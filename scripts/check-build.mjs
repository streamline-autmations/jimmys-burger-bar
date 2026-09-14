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
