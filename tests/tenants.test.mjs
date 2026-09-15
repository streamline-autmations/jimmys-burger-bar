// Tenant provisioning: every registered restaurant is launch-ready, the
// template stays valid, and the checker's knowledge of component assets is
// still true.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { load, loadWithEnv } from '../scripts/lib/load-ts.mjs';
import { checkTenant, SECTION_ASSETS } from '../scripts/lib/check-tenant.mjs';
import { dailyCronUtc, validateTenant } from '../scripts/lib/tenant-settings.mjs';

// This workspace's process sandbox suppresses piped output when a spawned
// process exits non-zero. Capture it in a uniquely named temporary file and
// let a successful shell wrapper report the real status.
let spawnCount = 0;
const spawnScript = (args, env) => {
  const marker = '__RD_EXIT_STATUS__:';
  const outputFile = `/tmp/restaurant-direct-test-${process.pid}-${spawnCount += 1}.log`;
  const result = spawnSync('/bin/sh', [
    '-c', 'output=$1; shift; "$@" >"$output" 2>&1; status=$?; printf "__RD_EXIT_STATUS__:%s\\n" "$status"',
    'restaurant-direct-test', outputFile, process.execPath, ...args,
  ], { env, encoding: 'utf8' });
  const output = fs.existsSync(outputFile) ? fs.readFileSync(outputFile, 'utf8') : `${result.stderr ?? ''}`;
  if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
  const statusOutput = result.stdout ?? '';
  const markerAt = statusOutput.lastIndexOf(marker);
  return {
    status: markerAt === -1 ? result.status : Number(statusOutput.slice(markerAt + marker.length).trim()),
    stderr: output,
  };
};

const candidates = [...fs.readFileSync('src/config.ts', 'utf8').matchAll(/from '\.\/tenants\/([^/]+)\/config'/g)].map((match) => match[1]);
const registered = candidates.filter((slug) => {
  try {
    return loadWithEnv('src/config.ts', { VITE_TENANT: slug }).config?.slug === slug;
  } catch {
    return false;
  }
});

test('at least one tenant is registered', () => {
  assert.ok(registered.includes('jimmys'));
});

test('every imported tenant is present in the runtime tenant map', () => {
  assert.deepEqual(registered, candidates);
  for (const slug of candidates) {
    assert.equal(loadWithEnv('src/config.ts', { VITE_TENANT: slug }).config.slug, slug);
  }
});

test('tenant config loading uses the requested environment with a fresh module cache', () => {
  assert.equal(loadWithEnv('src/config.ts', { VITE_TENANT: 'jimmys' }).config.slug, 'jimmys');
  assert.throws(() => loadWithEnv('src/config.ts', { VITE_TENANT: 'not-registered' }), /Unknown tenant/);
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

test('tenant infrastructure requires a real project ref and valid IANA timezone', () => {
  const infra = {
    slug: 'test', supabaseProjectRef: 'abcdefghijklmnopqrst', phoneCountryCode: '27',
    webhooks: { order: null, booking: null, review: null }, reviewRequests: { localTime: null },
  };
  assert.deepEqual(validateTenant(infra, { slug: 'test', timezone: 'Africa/Johannesburg' }), []);
  assert.match(validateTenant({ ...infra, supabaseProjectRef: 'PLACEHOLDER' }, { slug: 'test', timezone: 'Africa/Johannesburg' }).join('\n'), /supabaseProjectRef/);
  assert.match(validateTenant(infra, { slug: 'test', timezone: 'Africa\/Not_A_Zone' }).join('\n'), /valid IANA/);
});

test('daily review cron samples every month and uses the most common UTC offset', () => {
  assert.deepEqual(dailyCronUtc('20:00', 'Africa/Johannesburg', 2026), { expression: '0 18 * * *', observesDst: false });
  assert.deepEqual(dailyCronUtc('01:30', 'Africa/Johannesburg', 2026), { expression: '30 23 * * *', observesDst: false });
  assert.deepEqual(dailyCronUtc('20:00', 'Asia/Dubai', 2026), { expression: '0 16 * * *', observesDst: false });
  assert.equal(dailyCronUtc('20:00', 'Europe/London', 2026).observesDst, true);
  assert.equal(dailyCronUtc('20:00', 'Africa/Casablanca', 2026).observesDst, true);
});

test('new-tenant rejects reserved and colliding identifiers before writing', () => {
  const registryBefore = fs.readFileSync('src/config.ts', 'utf8');
  const run = (slug) => spawnScript(['scripts/new-tenant.mjs', slug, 'Test Restaurant'], { PATH: process.env.PATH });
  const reserved = run('class');
  assert.notEqual(reserved.status, 0);
  assert.match(reserved.stderr, /reserved identifier/);
  const internal = run('config');
  assert.notEqual(internal.status, 0);
  assert.match(internal.stderr, /reserved identifier/);
  const collision = run('jimmys');
  assert.notEqual(collision.status, 0);
  assert.match(collision.stderr, /already imported/);
  assert.equal(fs.readFileSync('src/config.ts', 'utf8'), registryBefore);
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

const JIMMYS_PROJECT = 'prj_e8szqEfeKBPjuUrC34p6ULSKbSbV';
const JIMMYS_URL = 'https://iqxxmvitbuxlpncpjzkx.supabase.co';

const checkBuild = (env) => spawnScript(['scripts/check-build.mjs'], {
  PATH: process.env.PATH, VERCEL: '1', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test', ...env,
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

test('Vercel build guards: Supabase URL must be the exact project origin', { skip: !fs.existsSync('dist/index.html') && 'run npm run build first' }, () => {
  for (const url of [
    `${JIMMYS_URL}.attacker.example`,
    `${JIMMYS_URL}/rest/v1`,
    `${JIMMYS_URL}?redirect=1`,
    `http://${new URL(JIMMYS_URL).hostname}`,
  ]) {
    const result = checkBuild({ VERCEL_PROJECT_ID: JIMMYS_PROJECT, VITE_SUPABASE_URL: url });
    assert.notEqual(result.status, 0, url);
    assert.match(result.stderr, /must be exactly/, url);
  }
});

const jwt = (payload) => [
  Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
  Buffer.from(JSON.stringify(payload)).toString('base64url'),
  'signature',
].join('.');

test('Vercel build guards: browser key must be publishable or an anon JWT for this project', { skip: !fs.existsSync('dist/index.html') && 'run npm run build first' }, () => {
  const base = { VERCEL_PROJECT_ID: JIMMYS_PROJECT, VITE_SUPABASE_URL: JIMMYS_URL };
  const validJwt = checkBuild({ ...base, VITE_SUPABASE_PUBLISHABLE_KEY: jwt({ role: 'anon', ref: 'iqxxmvitbuxlpncpjzkx' }) });
  assert.equal(validJwt.status, 0, validJwt.stderr);

  for (const [key, message] of [
    ['sb_secret_do-not-ship', /secret key/],
    [jwt({ role: 'service_role', ref: 'iqxxmvitbuxlpncpjzkx' }), /not "anon"/],
    [jwt({ role: 'anon', ref: 'abcdefghijklmnopqrst' }), /belongs to Supabase project/],
    ['not-a-publishable-key', /unrecognised shape/],
  ]) {
    const result = checkBuild({ ...base, VITE_SUPABASE_PUBLISHABLE_KEY: key });
    assert.notEqual(result.status, 0, key);
    assert.match(result.stderr, message, key);
  }
});
