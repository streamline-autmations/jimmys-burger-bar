// Tenant provisioning: every registered restaurant is launch-ready, the
// template stays valid, and the checker's knowledge of component assets is
// still true.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import { load } from '../scripts/lib/load-ts.mjs';
import { checkTenant, SECTION_ASSETS } from '../scripts/lib/check-tenant.mjs';

const registered = [...fs.readFileSync('src/config.ts', 'utf8').matchAll(/from '\.\/tenants\/([^/]+)\/config'/g)].map((match) => match[1]);

test('at least one tenant is registered', () => {
  assert.ok(registered.includes('jimmys'));
});

for (const slug of registered) {
  test(`${slug} passes every launch check`, () => {
    const { problems } = checkTenant(slug);
    assert.deepEqual(problems, [], problems.join('\n'));
  });
}

test('the new-restaurant template is valid but never launch-ready', () => {
  const { template } = load('src/tenants/_template/config.ts');
  assert.equal(template.slug, '__SLUG__');
  assert.ok(template.sections.length > 0);
  const text = fs.readFileSync('src/tenants/_template/config.ts', 'utf8');
  assert.match(text, /PLACEHOLDER/);
  assert.ok(!registered.includes('_template'), 'the template must never be registered');
});

test('the checker still knows which files each section loads itself', () => {
  for (const [type, { component, files }] of Object.entries(SECTION_ASSETS)) {
    const source = fs.readFileSync(component, 'utf8');
    for (const file of files) assert.ok(source.includes(file), `${type}: ${component} no longer references ${file}`);
  }
});

test('no shared component hardcodes a restaurant name', () => {
  const offenders = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = `${dir}/${entry.name}`;
      if (entry.isDirectory()) {
        if (!['tenants', 'demo'].includes(entry.name)) walk(full);
      } else if (/\.tsx?$/.test(entry.name) && entry.name !== 'SmashStory.tsx') {
        // Blank out block comments (keeping line breaks so line numbers hold), then line comments.
        const code = fs.readFileSync(full, 'utf8').replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '));
        code.split('\n').forEach((line, index) => {
          if (/Jimmy|Meyerton|Loch Street/.test(line.replace(/\/\/.*$/, ''))) offenders.push(`${full}:${index + 1}`);
        });
      }
    }
  };
  walk('src');
  assert.deepEqual(offenders, [], `restaurant-specific text belongs in src/tenants/<slug>:\n${offenders.join('\n')}`);
});

// ---------------------------------------------------------------------------
// Build guards on Vercel. Run the real check script against the existing dist/
// with the environment a misconfigured project would have.
// ---------------------------------------------------------------------------

import { spawnSync } from 'node:child_process';

const JIMMYS_PROJECT = 'prj_e8szqEfeKBPjuUrC34p6ULSKbSbV';
const JIMMYS_URL = 'https://iqxxmvitbuxlpncpjzkx.supabase.co';

const checkBuild = (env) => spawnSync(process.execPath, ['scripts/check-build.mjs'], {
  env: { PATH: process.env.PATH, VERCEL: '1', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test', ...env },
  encoding: 'utf8',
});

test('Vercel build guards: right project and right database pass', { skip: !fs.existsSync('dist/index.html') && 'run npm run build first' }, () => {
  const result = checkBuild({ VERCEL_PROJECT_ID: JIMMYS_PROJECT, VITE_SUPABASE_URL: JIMMYS_URL });
  assert.equal(result.status, 0, result.stderr);
});

test('Vercel build guards: a new project without VITE_TENANT fails', { skip: !fs.existsSync('dist/index.html') && 'run npm run build first' }, () => {
  const result = checkBuild({ VERCEL_PROJECT_ID: 'prj_someNewRestaurant', VITE_SUPABASE_URL: JIMMYS_URL });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /VITE_TENANT is not set/);
});

test("Vercel build guards: another restaurant's database fails", { skip: !fs.existsSync('dist/index.html') && 'run npm run build first' }, () => {
  const result = checkBuild({ VERCEL_PROJECT_ID: JIMMYS_PROJECT, VITE_SUPABASE_URL: 'https://someotherproject.supabase.co' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /does not belong to jimmys/);
});
