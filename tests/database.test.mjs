// Database tests: the Restaurant Direct baseline, applied to a throwaway
// Postgres with Jimmy's generated settings and menu, exercised as the roles the
// real site uses. No network, no Supabase project, no Docker.
import assert from 'node:assert/strict';
import { test, before } from 'node:test';
import fs from 'node:fs';
import { createDatabase, fingerprint, asRole } from './db/harness.mjs';
import { dailyCronUtc, validateTenant, settingsSql } from '../scripts/lib/tenant-settings.mjs';
import { buildCompareSql, currentFingerprint } from '../scripts/db-fingerprint.mjs';

const STAFF_ID = '5a000000-0000-4000-8000-000000000001';
const STRANGER_ID = '5a000000-0000-4000-8000-000000000002';

let db;
before(async () => {
  db = await createDatabase({ files: ['supabase/seed/settings.jimmys.sql', 'supabase/seed/menu.jimmys.sql'] });
  await db.exec(`
    insert into auth.users (id, email) values ('${STAFF_ID}', 'staff@example.com'), ('${STRANGER_ID}', 'stranger@example.com');
    insert into public.staff (user_id, email, role) values ('${STAFF_ID}', 'staff@example.com', 'owner');
  `);
});

const one = async (sql, params) => (await db.query(sql, params)).rows[0];
const tomorrowAt = (hhmm) => {
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Johannesburg', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date(Date.now() + 86400000));
  return new Date(`${date}T${hhmm}:00+02:00`).toISOString();
};
let contactSeq = 0;
const order = (overrides = {}) => ({
  ref: `JB-TEST${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
  name: 'Test Example',
  // A fresh contact per order, so the per-contact rate limit only trips where a test means it to.
  email: `test${(contactSeq += 1)}@example.com`, phone: `082 100 ${String(contactSeq).padStart(4, '0')}`,
  type: 'collection', time: tomorrowAt('18:00'), total: 200,
  items: [{ name: 'Smash Burger', qty: 2, unit_price: 100 }],
  ...overrides,
});
const createOrder = (o) => db.query(
  `select * from public.create_order($1, $2, $3, $4, $5, null, null, null, $6, $7, false, $8::jsonb)`,
  [o.ref, o.name, o.email, o.phone, o.type, o.time, o.total, JSON.stringify(o.items)],
);

// ---------------------------------------------------------------------------
// The baseline matches the committed snapshot of Jimmy's live project.
// ---------------------------------------------------------------------------

test('migrations match the committed snapshot (run npm run db:fingerprint after changing a migration)', async () => {
  const actual = await currentFingerprint();
  const committed = JSON.parse(fs.readFileSync('supabase/snapshot/baseline.fingerprint.json', 'utf8'));
  assert.deepEqual(actual, committed);
  assert.equal(fs.readFileSync('supabase/snapshot/compare.sql', 'utf8'), buildCompareSql(committed), 'compare.sql is stale');
});

test('the fingerprint notices drift that keeps definitions identical', async () => {
  const drifted = await createDatabase();
  const before = await fingerprint(drifted);
  await drifted.exec(`
    alter table public.bookings disable trigger bookings_throttle;
    alter table public.customers force row level security;
    grant select (email) on table public.customers to anon;
  `);
  const after = await fingerprint(drifted);
  const changed = after.filter((row, index) => row.fingerprint !== before[index].fingerprint).map((row) => `${row.kind} ${row.name}`);
  assert.ok(changed.includes('trigger bookings.bookings_throttle'), 'disabled trigger');
  assert.ok(changed.includes('table customers'), 'forced RLS');
  assert.ok(changed.includes('column_grant customers anon'), 'column grant');
});

test('generated seed files apply cleanly, twice', async () => {
  await db.exec(fs.readFileSync('supabase/seed/settings.jimmys.sql', 'utf8'));
  await db.exec(fs.readFileSync('supabase/seed/menu.jimmys.sql', 'utf8'));
  const jobs = (await db.query(`select schedule, command from cron.job`)).rows;
  assert.deepEqual(jobs, [{ schedule: '0 18 * * *', command: 'select public.send_review_requests()' }], 'exactly one review job');
  assert.equal((await one(`select value from public.app_settings where key = 'timezone'`)).value, 'Africa/Johannesburg');
  assert.ok((await one(`select count(*)::int n from public.menu_items where available`)).n >= 40);
});

// ---------------------------------------------------------------------------
// Access. The anon key ships in every browser, so this is the real boundary.
// ---------------------------------------------------------------------------

test('the public can request a booking and nothing else directly', async () => {
  await asRole(db, 'anon', async () => {
    await db.query(`insert into public.bookings (name, email, phone, guests, booking_date, booking_time)
      values ('Anon Example', 'anon@example.com', '082 000 0002', 2, current_date + 2, '19:00')`);
    for (const table of ['bookings', 'orders', 'order_items', 'customers', 'staff', 'app_settings', 'menu_items', 'notification_log']) {
      await db.exec('savepoint probe');
      await assert.rejects(db.query(`select * from public.${table} limit 1`), /permission denied/, `anon must not read ${table}`);
      await db.exec('rollback to savepoint probe');
    }
    await db.exec('savepoint probe');
    await assert.rejects(db.query(`insert into public.orders (order_no, customer_name, email, phone, order_type, total) values ('X', 'X', 'x@example.com', '1', 'collection', 1)`), /permission denied/);
    await db.exec('rollback to savepoint probe');
  });
});

test('the public cannot call internal functions', async () => {
  await asRole(db, 'anon', async () => {
    for (const call of [`public.setting('timezone')`, `public.upsert_customer('a', 'a@example.com', '1', false)`, `public.send_review_requests()`, `public.normalise_phone('1')`, `public.set_updated_at()`, `public.sanitise_booking_insert()`]) {
      await db.exec('savepoint probe');
      await assert.rejects(db.query(`select ${call}`), /permission denied/, call);
      await db.exec('rollback to savepoint probe');
    }
  });
});

test('signed-in non-staff see nothing; staff see everything', async () => {
  await createOrder(order());
  const count = () => one(`select (select count(*) from public.orders)::int orders, (select count(*) from public.customers)::int customers`);
  const stranger = await asRole(db, 'authenticated', count, { userId: STRANGER_ID });
  assert.deepEqual(stranger, { orders: 0, customers: 0 });
  const staff = await asRole(db, 'authenticated', count, { userId: STAFF_ID });
  assert.ok(staff.orders >= 1 && staff.customers >= 1);
});

// ---------------------------------------------------------------------------
// Orders: the server is the price authority and a retry is not a second order.
// ---------------------------------------------------------------------------

test('an order is priced from the menu, linked to a guest and queued for notification', async () => {
  const o = order({ items: [{ name: 'Smash Burger', qty: 2, unit_price: 100 }, { name: 'Coke', qty: 1, unit_price: 25 }], total: 225 });
  const asPublic = await asRole(db, 'anon', async () => (await createOrder({ ...o, ref: `${o.ref}X` })).rows[0]);
  assert.ok(asPublic.id, 'the public can place an order through create_order');

  const placed = (await createOrder(o)).rows[0];
  const row = await one(`select total, customer_id, status from public.orders where id = $1`, [placed.id]);
  assert.equal(Number(row.total), 225);
  assert.equal(row.status, 'new');
  assert.ok(row.customer_id);
  const queued = await one(`select q.url, q.body from public.notification_log l join net.http_request_queue q on q.id = l.request_id where l.reference = $1`, [o.ref]);
  assert.match(queued.url, /jimmys-order$/);
  assert.equal(queued.body.items.length, 2);

  const retry = (await createOrder(o)).rows[0];
  assert.equal(retry.id, placed.id, 'same reference and email returns the existing order');
  assert.equal((await one(`select count(*)::int n from public.notification_log where reference = $1`, [o.ref])).n, 1, 'no second notification');
});

test('orders the menu does not allow are refused', async () => {
  const refused = async (o, pattern, label) => {
    await db.exec('savepoint probe');
    await assert.rejects(createOrder(order(o)), pattern, label);
    await db.exec('rollback to savepoint probe');
  };
  await db.exec('begin');
  try {
    await refused({ items: [{ name: 'Smash Burger', qty: 2, unit_price: 0.01 }], total: 0.02 }, /menu price changed/, 'underpriced');
    await refused({ items: [{ name: 'Free Lobster', qty: 1, unit_price: 10 }], total: 10 }, /menu item unavailable/, 'invented item');
    await refused({ items: [{ name: 'Breakfast Bun', qty: 1, unit_price: 60 }], total: 60 }, /not served at that time/, 'breakfast in the evening');
    await refused({ total: 199.99 }, /does not match/, 'total a cent short');
    await refused({ time: new Date(Date.now() - 3600000).toISOString() }, /in the past/, 'past time');
    await refused({ items: [] , total: 0 }, /at least one item/, 'empty');
  } finally {
    await db.exec('rollback');
  }
  const breakfast = await createOrder(order({ items: [{ name: 'Breakfast Bun', qty: 1, unit_price: 60 }], total: 60, time: tomorrowAt('10:00') }));
  assert.ok(breakfast.rows[0].id, 'breakfast before 12:00 is fine');
});

test('staff move orders one stage at a time', async () => {
  const placed = (await createOrder(order())).rows[0];
  await asRole(db, 'authenticated', async () => {
    await db.exec('savepoint probe');
    await assert.rejects(db.query(`update public.orders set status = 'completed' where id = $1`, [placed.id]), /illegal order status transition/);
    await db.exec('rollback to savepoint probe');
    for (const status of ['accepted', 'preparing', 'ready', 'completed']) {
      const result = await db.query(`update public.orders set status = $2 where id = $1 and status <> $2 returning status`, [placed.id, status]);
      assert.equal(result.rows[0]?.status, status);
    }
    assert.ok((await one(`select completed_at from public.orders where id = $1`, [placed.id])).completed_at);
    await db.exec('savepoint probe');
    await assert.rejects(db.query(`update public.orders set status = 'new' where id = $1`, [placed.id]), /illegal/);
    await db.exec('rollback to savepoint probe');
  }, { userId: STAFF_ID });
});

// ---------------------------------------------------------------------------
// Guests, lookup, throttling and reviews.
// ---------------------------------------------------------------------------

test('a returning guest with a new email is recognised by phone in any format', async () => {
  const first = (await createOrder(order({ email: 'guest.one@example.com', phone: '083 111 2222' }))).rows[0];
  const second = (await createOrder(order({ email: 'guest.new@example.com', phone: '+27 83 111 2222' }))).rows[0];
  const ids = (await db.query(`select customer_id from public.orders where id in ($1, $2)`, [first.id, second.id])).rows.map((r) => r.customer_id);
  assert.equal(ids[0], ids[1]);
});

test('a guest can check a request with the reference and their own contact only', async () => {
  const o = order({ email: 'lookup@example.com', phone: '084 555 6666' });
  await createOrder(o);
  const lookup = (contact) => asRole(db, 'anon', async () => (await one(`select public.lookup_request($1, $2) r`, [o.ref.toLowerCase(), contact])).r);
  assert.equal((await lookup('LOOKUP@example.com')).status, 'new');
  assert.equal((await lookup('+27 84 555 6666')).kind, 'order');
  assert.equal(await lookup('+44 84 555 6666'), null, 'same digits, different country');
  assert.equal(await lookup('someone@example.com'), null);
  assert.ok(!('email' in (await lookup('lookup@example.com'))), 'returns no contact details');
});

test('booking spam from one contact is throttled', async () => {
  await asRole(db, 'anon', async () => {
    const insert = () => db.query(`insert into public.bookings (name, email, phone, guests, booking_date, booking_time)
      values ('Spam Example', 'spam@example.com', '082 999 0000', 2, current_date + 3, '19:00')`);
    for (let i = 0; i < 3; i += 1) await insert();
    await assert.rejects(insert(), /too many booking requests/);
  });
});

test('the nightly job sends one review request per completed order', async () => {
  const placed = (await createOrder(order({ email: 'review@example.com' }))).rows[0];
  await db.query(`update public.orders set status = 'completed', completed_at = now() where id = $1`, [placed.id]);
  const sent = async () => (await one(`select count(*)::int n from public.notification_log where kind = 'review' and reference = (select order_no from public.orders where id = $1)`, [placed.id])).n;
  await db.query(`select public.send_review_requests()`);
  assert.equal(await sent(), 1);
  await db.query(`select public.send_review_requests()`);
  assert.equal(await sent(), 1, 'never twice');
});

// ---------------------------------------------------------------------------
// Tenant settings generation.
// ---------------------------------------------------------------------------

test('review schedules convert to UTC and flag daylight-saving zones', () => {
  assert.deepEqual(dailyCronUtc('20:00', 'Africa/Johannesburg'), { expression: '0 18 * * *', observesDst: false });
  assert.deepEqual(dailyCronUtc('01:30', 'Africa/Johannesburg'), { expression: '30 23 * * *', observesDst: false });
  assert.equal(dailyCronUtc('20:00', 'Europe/London').observesDst, true);
  assert.equal(dailyCronUtc('20:00', 'Asia/Dubai').expression, '0 16 * * *');
});

test('tenant infrastructure files are validated before any SQL is written', () => {
  const config = { slug: 'newplace', timezone: 'Africa/Johannesburg' };
  const good = { slug: 'newplace', supabaseProjectRef: 'abcdefghijklmnopqrst', phoneCountryCode: '27', webhooks: { order: 'https://n8n.example.com/a', booking: null, review: null }, reviewRequests: { localTime: null } };
  assert.deepEqual(validateTenant(good, config), []);
  assert.match(settingsSql(good, config), /delete from public\.app_settings where key in \('webhook\.booking', 'webhook\.review'\)/);
  assert.match(settingsSql(good, config), /Review requests are switched off/);
  const bad = { ...good, phoneCountryCode: '+27', webhooks: { order: 'http://PLACEHOLDER', booking: null, review: null }, reviewRequests: { localTime: '20:00' } };
  assert.equal(validateTenant(bad, config).length, 3);
});

// ---------------------------------------------------------------------------
// Hardening (migration 20260915130000): what the public can write, and how often.
// ---------------------------------------------------------------------------

test('the public cannot forge a confirmed or back-dated booking', async () => {
  await asRole(db, 'anon', async () => {
    await db.exec('savepoint probe');
    await assert.rejects(db.query(`insert into public.bookings (name, email, phone, guests, booking_date, booking_time, status)
      values ('Forge Example', 'forge@example.com', '082 300 0001', 2, current_date + 2, '19:00', 'confirmed')`), /permission denied/, 'status');
    await db.exec('rollback to savepoint probe');
    await assert.rejects(db.query(`insert into public.bookings (name, email, phone, guests, booking_date, booking_time, created_at)
      values ('Forge Example', 'forge@example.com', '082 300 0001', 2, current_date + 2, '19:00', now() - interval '1 day')`), /permission denied/, 'created_at');
    await db.exec('rollback to savepoint probe');
  });
});

test('booking requests outside what the form allows are refused', async () => {
  const bad = [
    `9999, current_date + 2`,
    `2, current_date - 5`,
    `2, current_date + 400`,
  ];
  await asRole(db, 'anon', async () => {
    for (const values of bad) {
      await db.exec('savepoint probe');
      await assert.rejects(db.query(`insert into public.bookings (name, email, phone, guests, booking_date, booking_time)
        values ('Bounds Example', 'bounds@example.com', '082 300 0002', ${values}, '19:00')`), /invalid booking request/, values);
      await db.exec('rollback to savepoint probe');
    }
  });
  const staffInsert = await asRole(db, 'postgres', async () => (await one(`insert into public.bookings (name, email, phone, guests, booking_date, booking_time, status)
    values ('Import Example', 'import@example.com', '082 300 0003', 2, current_date + 2, '19:00', 'confirmed') returning status`)).status);
  assert.equal(staffInsert, 'confirmed', 'the project owner can still import confirmed bookings');
});

test('orders are rate limited per contact, and a retry is never throttled', async () => {
  const contact = { email: 'rush@example.com', phone: '082 400 0001' };
  const placed = [];
  for (let i = 0; i < 5; i += 1) placed.push(order(contact));
  for (const o of placed) await createOrder(o);
  // Outside a transaction a failed call rolls itself back.
  await assert.rejects(createOrder(order(contact)), /too many orders from this contact/);
  const retry = (await createOrder(placed[0])).rows[0];
  assert.ok(retry.id, 'retrying an order that already landed still returns it');
});

test('future objects in public start closed to the public', async () => {
  const fresh = await createDatabase();
  await fresh.exec(`create table public.later_table (id int); create function public.later_fn() returns int language sql as 'select 1';`);
  const grants = (await fresh.query(`select has_table_privilege('anon', 'public.later_table', 'SELECT') t,
    has_function_privilege('anon', 'public.later_fn()', 'EXECUTE') f`)).rows[0];
  assert.deepEqual(grants, { t: false, f: false });
});

test('the health check passes its security rows on a correctly built project', async () => {
  const rows = (await db.query(fs.readFileSync('supabase/verify.sql', 'utf8'))).rows;
  const byName = Object.fromEntries(rows.map((row) => [row.check_name, row]));
  for (const name of [
    'timezone setting is a real zone', 'phone country code setting', 'menu loaded', 'at least one staff member',
    'row level security on every table', 'the public has no table-wide privileges',
    'the public can only insert booking form columns', 'the public can only call create_order and lookup_request',
    'future tables and functions start closed', 'no duplicate or inactive review jobs',
  ]) {
    assert.ok(byName[name], `missing check: ${name}`);
    assert.equal(byName[name].ok, true, `${name}: ${byName[name].detail}`);
  }
  assert.equal(byName['pg_cron extension installed'].ok, false, 'PGlite has no pg_cron, and the check says so instead of erroring');
});
