// Tenant provisioning: every registered restaurant is launch-ready, the
// template stays valid, and the checker's knowledge of component assets is
// still true.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { load, loadWithEnv } from '../scripts/lib/load-ts.mjs';
import { checkTenant, SECTION_ASSETS } from '../scripts/lib/check-tenant.mjs';
import { dailyCronUtc, validateTenant, settingsSql, paymentSecretNames } from '../scripts/lib/tenant-settings.mjs';

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
          if (/Jimmy|Meyerton|Loch Street|Rehearsal Grill/.test(line.replace(/\/\/.*$/, ''))) offenders.push(`${full}:${index + 1}`);
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


test('rehearsal settings, secret names and kitchen contacts are tenant isolated', () => {
  const read = slug => JSON.parse(fs.readFileSync(`supabase/tenants/${slug}.json`, 'utf8'));
  const rehearsal = read('rehearsal-grill');
  const staging = read('jimmys-staging');
  const { rehearsalGrill: config } = load('src/tenants/rehearsal-grill/config.ts');
  assert.notEqual(rehearsal.supabaseProjectRef, staging.supabaseProjectRef);
  assert.notEqual(rehearsal.vercelProject, staging.vercelProject);
  assert.equal(rehearsal.payments, null);
  assert.equal(staging.payments.provider, 'payfast');
  assert.deepEqual(rehearsal.webhooks, { order: null, booking: null, review: null });
  assert.equal(rehearsal.kitchen.escalation.phone, config.ordering.escalation.phone);
  for (const key of Object.keys(paymentSecretNames(rehearsal))) {
    assert.notEqual(paymentSecretNames(rehearsal)[key], paymentSecretNames(staging)[key]);
    const environment = { [paymentSecretNames(rehearsal)[key]]: 'fictional-a', [paymentSecretNames(staging)[key]]: 'fictional-b' };
    assert.equal(environment[paymentSecretNames(rehearsal)[key]], 'fictional-a');
    assert.equal(environment[paymentSecretNames(staging)[key]], 'fictional-b');
  }
  const sql = settingsSql(rehearsal, config);
  assert.ok(!sql.includes(staging.supabaseProjectRef));
  assert.ok(!sql.includes('jimmys'));
  assert.match(sql, /delete from public.app_settings where key in \('webhook.order'/);
  const changed = structuredClone(rehearsal);
  changed.webhooks.order = 'https://n8n.example.com/webhook/rehearsal-order';
  assert.match(settingsSql(changed, config), /rehearsal-order/);
  assert.equal(staging.webhooks.order, null);
  assert.equal(rehearsal.webhooks.order, null);
  assert.throws(() => paymentSecretNames({ payfastSecretNames: { mode: 'secret value' } }));
  assert.match(fs.readFileSync('supabase/functions/payfast/index.ts', 'utf8'), /secret\('merchant_key'\)/);
});

// No test runs the Deno handler, so a comma expression such as
// settingsMap['payments.site_url','payments.secret_names'] once shipped and broke every checkout.
test('payfast handler reads each setting by a single key', () => {
  const source = fs.readFileSync('supabase/functions/payfast/index.ts', 'utf8');
  assert.doesNotMatch(source, /settingsMap\[[^\]]*,[^\]]*\]/);
});

// The live database refuses ready -> out_for_delivery, so a live delivery must still close as completed.
test('the rider step exists only on a pay-first tenant with a delivery preview', () => {
  const ops = load('src/pages/admin/operations.ts');
  assert.equal(loadWithEnv('src/core/tenant.ts', { VITE_TENANT: 'jimmys' }).deliveryRun, false);
  assert.equal(loadWithEnv('src/core/tenant.ts', { VITE_TENANT: 'jimmys-staging' }).deliveryRun, true);
  assert.deepEqual(ops.nextStatuses('ready'), ['completed', 'cancelled']);
  assert.deepEqual(ops.nextStatuses('ready', 'delivery'), ['out_for_delivery', 'cancelled']);
});

test('the get-the-app sticker encourages without nagging', () => {
  const { shouldOffer, platformOf } = load('src/lib/installApp.ts');
  const now = Date.UTC(2026, 10, 18);
  const day = 86_400_000;
  assert.equal(platformOf('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari', 5), 'ios');
  assert.equal(platformOf('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari', 5), 'ios'); // iPadOS
  assert.equal(platformOf('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari', 0), 'other');
  assert.equal(platformOf('Mozilla/5.0 (Linux; Android 10; K) Chrome/157 Mobile', 5), 'android');
  assert.equal(shouldOffer({ visits: 1 }, 'order', 'android', now), true);
  assert.equal(shouldOffer({ visits: 1 }, 'after-order', 'ios', now), true);
  assert.equal(shouldOffer({ visits: 1 }, 'return-visit', 'ios', now), false, 'first visit gets no floating card');
  assert.equal(shouldOffer({ visits: 2 }, 'return-visit', 'ios', now), true);
  assert.equal(shouldOffer({ visits: 5 }, 'order', 'other', now), false, 'desktop is never asked');
  assert.equal(shouldOffer({ visits: 5, installed: true }, 'order', 'android', now), false);
  assert.equal(shouldOffer({ visits: 5, dismissedAt: now - 13 * day }, 'after-order', 'android', now), false);
  assert.equal(shouldOffer({ visits: 5, dismissedAt: now - 15 * day }, 'after-order', 'android', now), true);
});

test('the guest app opens on the order page and its worker caches only the offline page', () => {
  const plugin = load('vite-plugin-tenant-html.ts');
  const jimmys = loadWithEnv('src/config.ts', { VITE_TENANT: 'jimmys' }).config;
  const manifest = JSON.parse(plugin.customerManifest(jimmys, 'public'));
  assert.equal(manifest.start_url, '/order');
  assert.equal(manifest.scope, '/');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.id, '/order', 'the installed app keeps its identity');
  assert.equal(manifest.icons.length, 4);
  assert.deepEqual(manifest.icons.map((icon) => icon.purpose).sort(), ['any', 'any', 'maskable', 'maskable']);
  assert.deepEqual(manifest.shortcuts.map((shortcut) => shortcut.url), ['/orders', '/order?view=cart']);
  assert.ok(manifest.description && manifest.lang, 'description and language for the store listing');
  for (const shot of manifest.screenshots ?? []) assert.ok(fs.existsSync(`public${shot.src}`), shot.src);
  assert.equal(JSON.parse(plugin.staffManifest(jimmys, 'public')).scope, '/admin/', 'the staff app stays separate');
  const worker = plugin.customerServiceWorker(jimmys, 'public');
  assert.match(worker, /addEventListener\('fetch'/);
  assert.match(worker, /mode !== 'navigate'/);
  assert.doesNotMatch(worker, /\.put\(|addAll/, 'no menu, price or order is ever cached');
  const offline = plugin.offlinePage({ ...jimmys, venue: { ...jimmys.venue, name: 'A <b> & Co' } });
  assert.match(offline, /A &lt;b&gt; &amp; Co/);
  assert.match(plugin.offlinePage(jimmys, false), /href="tel:/);
  assert.doesNotMatch(plugin.offlinePage(jimmys, true), /href=/, 'the demo offline page links nowhere');
});

test('shared menu and PDF cannot inherit another restaurant extras prices', () => {
  const { rehearsalGrill } = load('src/tenants/rehearsal-grill/config.ts');
  assert.equal(rehearsalGrill.menu.extrasNote, undefined);
  for (const file of ['src/pages/FoodDrinks.tsx', 'src/lib/generateMenuPdf.ts']) {
    const source = fs.readFileSync(file, 'utf8');
    assert.ok(!source.includes('bacon R17'));
    assert.match(source, /config.menu.extrasNote/);
  }
});

test("todayHoursLabel reads Jimmy's hours in the restaurant's own timezone", async () => {
  const tenant = await load('src/core/tenant.ts');
  const at = (iso) => tenant.todayHoursLabel(new Date(iso));
  assert.equal(at('2026-11-16T10:00:00+02:00'), 'Open today 09:00 – 20:00'); // Monday
  assert.equal(at('2026-11-20T10:00:00+02:00'), 'Open today 09:00 – midnight'); // Friday closes "00:00"
  assert.equal(at('2026-11-22T10:00:00+02:00'), 'Closed today'); // Sunday
  assert.equal(at('2026-11-20T23:30:00Z'), 'Open today 09:00 – midnight'); // already Saturday in Meyerton
});

test('order again uses today\'s prices and names every dish it had to leave out', () => {
  const { rebuildCart } = load('src/lib/orderHistory.ts');
  const menu = [{ name: 'Smash Burger', price: 11000 }, { name: 'Chips', price: 3500 }, { name: 'Market Fish', price: 0 }];
  const { lines, skipped } = rebuildCart(
    [{ name: 'Smash Burger', qty: 2 }, { name: 'Retired Burger', qty: 1 }, { name: 'Chips', qty: 1 }, { name: 'Market Fish', qty: 1 }, { name: 'Smash Burger', qty: 1 }],
    menu,
  );
  assert.deepEqual(lines, [{ key: 'Smash Burger', name: 'Smash Burger', price: 11000, qty: 3, extras: [] }, { key: 'Chips', name: 'Chips', price: 3500, qty: 1, extras: [] }]);
  assert.deepEqual(skipped, ['Retired Burger', 'Market Fish'], 'an unpriced dish is left out too, never added at R0');
  assert.equal(rebuildCart([{ name: 'Chips', qty: 500 }], menu).lines[0].qty, 99, 'capped like the cart');
});
