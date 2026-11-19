// Lock-screen alerts (20261117140000 + supabase/functions/kitchen-push): queued
// once per paid order, staff see only their own subscriptions, the VAPID
// signature verifies, and the lock-screen text carries no order data.
import assert from 'node:assert/strict';
import { test, before, after } from 'node:test';
import { runInNewContext } from 'node:vm';
import { createDatabase, asRole } from './db/harness.mjs';
import { importVapidKey, pushEndpoint, vapidHeaders } from '../supabase/functions/kitchen-push/vapid.mjs';
import { load } from '../scripts/lib/load-ts.mjs';
import { validateTenant } from '../scripts/lib/tenant-settings.mjs';

const CHEF = '5a000000-0000-4000-8000-000000000011';
const COOK = '5a000000-0000-4000-8000-000000000012';
const OUTSIDER = '5a000000-0000-4000-8000-000000000013';
const PUSH_URL = 'https://cagcpwlzqpolojpgewtw.supabase.co/functions/v1/kitchen-push';

let db; let seq = 0;
before(async () => {
  db = await createDatabase({ files: ['supabase/seed/settings.jimmys-staging.sql', 'supabase/seed/menu.jimmys-staging.sql'] });
  await db.exec(`insert into auth.users(id,email) values ('${CHEF}','chef@example.com'),('${COOK}','cook@example.com'),('${OUTSIDER}','outsider@example.com');
    insert into public.staff(user_id,email,role) values ('${CHEF}','chef@example.com','staff'),('${COOK}','cook@example.com','staff');`);
});
after(async () => { await db?.close(); });
const one = async (sql, args) => (await db.query(sql, args)).rows[0];

async function paidOrder() {
  seq += 1; const ref = `JB-PUSH-${seq}`; const email = `push${seq}@example.com`;
  let day = new Date(Date.now() + 86400000 * 2); while (day.getUTCDay() === 0) day = new Date(+day + 86400000);
  await db.query(`select * from public.create_order($1,'Push Guest',$2,$3,'collection',null,null,null,$4,100,false,'[{"name":"Smash Burger","qty":1,"unit_price":100}]')`,
    [ref, email, `083${String(seq).padStart(7, '0')}`, `${day.toISOString().slice(0, 10)}T12:00:00+02:00`]);
  await db.query(`select public.begin_payment($1,$2,'jimmys-staging','sandbox')`, [ref, email]);
  return { ref, email, pay: (tx = `70${seq}`) => db.query(`select public.mark_order_paid($1,$2,'COMPLETE',100,'{}')`, [ref, tx]) };
}
const queued = (ref) => db.query(`select q.url, q.body from net.http_request_queue q where q.url = $1 and q.body->>'order_id' = (select id::text from public.orders where order_no = $2)`, [PUSH_URL, ref]);
const pushRow = (ref) => one(`select p.* from public.order_push p join public.orders o on o.id = p.order_id where o.order_no = $1`, [ref]);

test('a paid order queues exactly one push, carrying only the order id', async () => {
  const o = await paidOrder();
  await o.pay(); await o.pay(); await o.pay('999' + seq);
  const calls = (await queued(o.ref)).rows;
  assert.equal(calls.length, 1, 'replayed and second-transaction ITNs queue nothing more');
  assert.deepEqual(Object.keys(calls[0].body), ['order_id']);
  assert.ok((await pushRow(o.ref)).request_id, 'the pg_net request is recorded on the dedupe row');
});

test('a late payment the kitchen must not cook queues no push', async () => {
  const o = await paidOrder();
  await db.query(`update public.orders set payment_expires_at = now() - interval '1 second' where order_no = $1`, [o.ref]);
  await o.pay();
  assert.equal((await one(`select status from public.orders where order_no = $1`, [o.ref])).status, 'cancelled');
  assert.equal((await queued(o.ref)).rows.length, 0);
  assert.equal(await pushRow(o.ref), undefined);
});

test('without push.url nothing is queued', async () => {
  await db.exec('begin');
  try {
    await db.exec(`delete from public.app_settings where key = 'push.url'`);
    const o = await paidOrder(); await o.pay();
    assert.equal((await queued(o.ref)).rows.length, 0);
  } finally { await db.exec('rollback'); }
});

test('a push that cannot be queued never loses the payment', async () => {
  await db.exec('begin');
  try {
    await db.exec(`create or replace function net.http_post(url text, body jsonb default '{}'::jsonb, params jsonb default '{}'::jsonb,
      headers jsonb default '{}'::jsonb, timeout_milliseconds integer default 5000) returns bigint language plpgsql as $$
      begin raise exception using errcode = 'query_canceled'; end $$;`);
    const o = await paidOrder(); await o.pay();
    assert.equal((await one(`select payment_status from public.orders where order_no = $1`, [o.ref])).payment_status, 'paid');
  } finally { await db.exec('rollback'); }
});

test('staff manage only their own push subscriptions; others and the public see none', async () => {
  const endpoint = (who) => `https://fcm.googleapis.com/fcm/send/${who}-${seq}`;
  const insert = (e, extra = '') => db.query(`insert into public.staff_push_subscriptions(endpoint,p256dh,auth${extra ? ',user_id' : ''}) values($1,'BP','au'${extra ? ',$2' : ''})`, extra ? [e, extra] : [e]);
  const as = (role, userId, work) => asRole(db, role, work, { userId });
  // Each refusal runs in its own rolled-back transaction: Postgres aborts the rest of one after an error.
  await as('authenticated', CHEF, async () => {
    await insert(endpoint('chef'));
    assert.equal((await one(`select user_id from public.staff_push_subscriptions where endpoint = $1`, [endpoint('chef')])).user_id, CHEF, 'owned by the signed-in user');
  });
  await as('authenticated', CHEF, () => assert.rejects(insert(endpoint('forged'), COOK), /row-level security/, 'cannot subscribe on someone else\'s behalf'));
  await as('authenticated', OUTSIDER, () => assert.rejects(insert(endpoint('outsider')), /row-level security/, 'a signed-in non-staff user cannot subscribe'));
  await as('authenticated', CHEF, () => assert.rejects(db.query(`select * from public.order_push`), /permission denied/, 'staff cannot read the dedupe table'));
  await as('anon', null, () => assert.rejects(db.query(`select * from public.staff_push_subscriptions`), /permission denied/));
  await as('anon', null, () => assert.rejects(db.query(`select * from public.order_push`), /permission denied/));

  await db.query(`insert into public.staff_push_subscriptions(endpoint,user_id,p256dh,auth) values($1,$2,'BP','au')`, [endpoint('kept'), CHEF]);
  try {
    await as('authenticated', COOK, async () => {
      assert.equal((await db.query(`select * from public.staff_push_subscriptions`)).rows.length, 0, 'another staff member sees nothing');
      assert.equal((await db.query(`delete from public.staff_push_subscriptions where endpoint = $1 returning endpoint`, [endpoint('kept')])).rows.length, 0, 'and cannot delete it');
    });
    await as('authenticated', CHEF, async () => {
      assert.equal((await db.query(`delete from public.staff_push_subscriptions where endpoint = $1 returning endpoint`, [endpoint('kept')])).rows.length, 1, 'the owner can switch it off');
    });
  } finally {
    await db.query(`delete from public.staff_push_subscriptions where endpoint = $1`, [endpoint('kept')]);
  }
});

test('the VAPID token verifies against the public key and names the push service', async () => {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
  const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
  const publicKey = Buffer.from(raw).toString('base64url');
  const key = await importVapidKey(publicKey, jwk.d);
  const endpoint = 'https://fcm.googleapis.com/fcm/send/abc:def';
  const headers = await vapidHeaders({ endpoint, key, publicKey, subject: 'mailto:ops@example.com', now: Date.UTC(2026, 10, 17) });
  const [, token, k] = headers.Authorization.match(/^vapid t=([^,]+), k=(.+)$/);
  assert.equal(k, publicKey);
  const [head, claims, signature] = token.split('.');
  const verified = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pair.publicKey, Buffer.from(signature, 'base64url'), new TextEncoder().encode(`${head}.${claims}`));
  assert.ok(verified, 'signature verifies');
  const body = JSON.parse(Buffer.from(claims, 'base64url').toString());
  assert.equal(body.aud, 'https://fcm.googleapis.com');
  assert.equal(body.exp, Date.UTC(2026, 10, 17) / 1000 + 12 * 3600, 'within the 24-hour limit');
  assert.equal(headers.Urgency, 'high');
  assert.equal(headers['Content-Encoding'], undefined, 'no encrypted payload, so nothing about the order is sent');
  await assert.rejects(importVapidKey(publicKey.slice(2), jwk.d), /VAPID_KEYS_INVALID/);
});

test('only real push services are ever called', () => {
  for (const ok of ['https://fcm.googleapis.com/fcm/send/x', 'https://web.push.apple.com/abc', 'https://wns2-par02p.notify.windows.com/w/?token=x', 'https://updates.push.services.mozilla.com/wpush/v2/x']) assert.ok(pushEndpoint(ok), ok);
  for (const bad of ['http://fcm.googleapis.com/x', 'https://fcm.googleapis.com:8443/x', 'https://evil.example.com/fcm.googleapis.com', 'https://fcm.googleapis.com.evil.example/x', 'https://169.254.169.254/', 'not a url']) assert.equal(pushEndpoint(bad), null, bad);
});

test('the lock-screen text is generic and the worker caches nothing', () => {
  const worker = load('vite-plugin-tenant-html.ts').staffServiceWorker({ venue: { name: "Jimmy's" }, seo: { themeColor: '#172544' }, theme: { colors: { paper: '#FFFDF7' } } }, 'public');
  assert.match(worker, /"New order at Jimmy's"/);
  assert.doesNotMatch(worker, /event\.data|customer|total|order_items|caches|addEventListener\('fetch'/, 'no payload read, no fetch handler, no cache');
});

test('a push URL must point at this project\'s own function, on a pay-first tenant', () => {
  const infra = { slug: 'x', supabaseProjectRef: 'cagcpwlzqpolojpgewtw', phoneCountryCode: '27', webhooks: { order: null, booking: null, review: null },
    reviewRequests: { localTime: null }, payments: { provider: 'payfast', mode: 'sandbox', siteUrl: 'https://x.example' } };
  const config = { slug: 'x', timezone: 'Africa/Johannesburg', ordering: { payment: 'payfast' } };
  assert.deepEqual(validateTenant({ ...infra, pushUrl: PUSH_URL }, config), []);
  assert.match(validateTenant({ ...infra, pushUrl: PUSH_URL.replace('cagc', 'zzzz') }, config).join(), /pushUrl must be this project/);
  assert.match(validateTenant({ ...infra, payments: null, pushUrl: PUSH_URL }, { ...config, ordering: { payment: 'on_collection' } }).join(), /pushUrl needs ordering.payment/);
});

// ---------------------------------------------------------------------------
// Guest order-ready alerts (20261119120000): anon proves the order is theirs,
// can never read a subscription, one push per status, cleanup on completion.
// ---------------------------------------------------------------------------

const guestSub = (tag) => ({ endpoint: `https://fcm.googleapis.com/fcm/send/guest-${tag}-${seq}`, p256dh: 'BPguest', auth: 'auguest' });
const addGuestPush = (ref, email, sub) =>
  db.query(`select public.add_guest_push($1,$2,$3,$4,$5) as ok`, [ref, email, sub.endpoint, sub.p256dh, sub.auth]).then((r) => r.rows[0].ok);
const guestQueued = (ref) => db.query(`select q.body from net.http_request_queue q where q.url = $1 and q.body ? 'status' and q.body->>'order_id' = (select id::text from public.orders where order_no = $2) order by q.id`, [PUSH_URL, ref]);
const guestSubs = (ref) => db.query(`select s.endpoint from public.guest_push_subscriptions s join public.orders o on o.id = s.order_id where o.order_no = $1`, [ref]).then((r) => r.rows);
// Run as the database owner: staff screens go one step at a time, the tests also bounce back to prove the dedupe.
const setStatus = (ref, status) => db.query(`update public.orders set status = $2 where order_no = $1`, [ref, status]);

test('a guest can add an alert only for a paid order they prove is theirs', async () => {
  const o = await paidOrder();
  const sub = guestSub('own');
  await asRole(db, 'anon', async () => {
    assert.equal(await addGuestPush(o.ref, o.email, sub), false, 'not paid yet: no alert');
  });
  await o.pay();
  await asRole(db, 'anon', async () => {
    assert.equal(await addGuestPush(o.ref, 'someone.else@example.com', sub), false, 'wrong email');
    assert.equal(await addGuestPush('JB-NOPE-000', o.email, sub), false, 'unknown reference');
    assert.equal(await addGuestPush(o.ref, o.email, { ...sub, endpoint: 'http://insecure.example/x' }), false, 'https only');
    assert.equal(await addGuestPush(o.ref, `  ${o.email.toUpperCase()} `, sub), true, 'the owner, in any case and spacing');
    assert.equal(await addGuestPush(o.ref, o.email, sub), true, 'repeating it is harmless');
    // asRole rolls back, so the row is checked inside the same transaction, as the owner.
    await db.exec('reset role');
    assert.equal((await guestSubs(o.ref)).length, 1);
  });
});

test('nobody can read, write or delete guest subscriptions directly', async () => {
  const o = await paidOrder(); await o.pay();
  await addGuestPush(o.ref, o.email, guestSub('direct'));
  for (const role of ['anon', 'authenticated']) {
    const userId = role === 'authenticated' ? CHEF : undefined;
    await asRole(db, role, () => assert.rejects(db.query(`select * from public.guest_push_subscriptions`), /permission denied/, `${role} cannot read them, staff included`), { userId });
    await asRole(db, role, () => assert.rejects(db.query(`select * from public.guest_order_push`), /permission denied/), { userId });
    await asRole(db, role, () => assert.rejects(db.query(`insert into public.guest_push_subscriptions(order_id,endpoint,p256dh,auth) select id,'https://fcm.googleapis.com/x','a','b' from public.orders limit 1`), /permission denied/), { userId });
    await asRole(db, role, () => assert.rejects(db.query(`delete from public.guest_push_subscriptions`), /permission denied/), { userId });
  }
  await asRole(db, 'anon', async () => {
    await db.query(`select public.remove_guest_push($1,'wrong@example.com',$2)`, [o.ref, guestSub('direct').endpoint]);
  });
  assert.equal((await guestSubs(o.ref)).length, 1, 'removing needs the same proof');
  await asRole(db, 'anon', async () => {
    await db.query(`select public.remove_guest_push($1,$2,$3)`, [o.ref, o.email, guestSub('direct').endpoint]);
    await db.exec('reset role');
    assert.equal((await guestSubs(o.ref)).length, 0, 'the owner can switch it off');
  });
});

test('a collection order queues one alert at ready, once, carrying only its id and status', async () => {
  const o = await paidOrder(); await o.pay();
  await addGuestPush(o.ref, o.email, guestSub('ready'));
  for (const status of ['accepted', 'preparing']) await setStatus(o.ref, status);
  assert.equal((await guestQueued(o.ref)).rows.length, 0, 'nothing before ready');
  await setStatus(o.ref, 'ready');
  await setStatus(o.ref, 'preparing');
  await setStatus(o.ref, 'ready');
  const calls = (await guestQueued(o.ref)).rows;
  assert.equal(calls.length, 1, 'bouncing back to ready sends nothing twice');
  assert.deepEqual(Object.keys(calls[0].body).sort(), ['order_id', 'status']);
  assert.equal(calls[0].body.status, 'ready');
  assert.ok((await one(`select p.request_id from public.guest_order_push p join public.orders o on o.id = p.order_id where o.order_no = $1 and p.status = 'ready'`, [o.ref])).request_id, 'the dedupe row records the request');
  await setStatus(o.ref, 'completed');
  assert.equal((await guestSubs(o.ref)).length, 0, 'the push address is deleted once the order is collected');
  await asRole(db, 'anon', async () => {
    assert.equal(await addGuestPush(o.ref, o.email, guestSub('late')), false, 'and a finished order takes no new alert');
  });
});

test('a delivery alerts at ready and when it leaves; a cancelled order forgets its subscriptions', async () => {
  const o = await paidOrder(); await o.pay();
  await db.query(`update public.orders set order_type = 'delivery', delivery_address = '1 Test Street' where order_no = $1`, [o.ref]);
  await addGuestPush(o.ref, o.email, guestSub('delivery'));
  for (const status of ['accepted', 'preparing', 'ready', 'out_for_delivery']) await setStatus(o.ref, status);
  assert.deepEqual((await guestQueued(o.ref)).rows.map((row) => row.body.status), ['ready', 'out_for_delivery']);

  const c = await paidOrder(); await c.pay();
  await addGuestPush(c.ref, c.email, guestSub('cancel'));
  await setStatus(c.ref, 'accepted');
  await setStatus(c.ref, 'cancelled');
  assert.equal((await guestSubs(c.ref)).length, 0);
});

test('an order nobody asked to be alerted about queues nothing', async () => {
  const o = await paidOrder(); await o.pay();
  for (const status of ['accepted', 'preparing', 'ready']) await setStatus(o.ref, status);
  assert.equal(await addGuestPush(o.ref, o.email, guestSub('missed-ready')), false);
  assert.equal((await guestQueued(o.ref)).rows.length, 0);
  assert.equal((await guestSubs(o.ref)).length, 0);
});

test('delivery can still opt in after ready but signup closes at dispatch', async () => {
  const o = await paidOrder(); await o.pay();
  await db.query(`update public.orders set order_type = 'delivery', delivery_address = '1 Test Street' where order_no = $1`, [o.ref]);
  for (const status of ['accepted', 'preparing', 'ready']) await setStatus(o.ref, status);
  assert.equal(await addGuestPush(o.ref, o.email, guestSub('before-dispatch')), true);
  await setStatus(o.ref, 'out_for_delivery');
  assert.equal(await addGuestPush(o.ref, o.email, guestSub('missed-dispatch')), false);
  assert.deepEqual((await guestQueued(o.ref)).rows.map((row) => row.body.status), ['out_for_delivery']);
});

test("the guest's alert text is generic and the guest worker still caches only the offline page", () => {
  const worker = load('vite-plugin-tenant-html.ts').customerServiceWorker({ venue: { name: "Jimmy's" }, seo: { themeColor: '#172544' }, theme: { colors: { paper: '#FFFDF7' } } }, 'public');
  assert.match(worker, /"Your order at Jimmy's is ready"/);
  assert.match(worker, /addEventListener\('push'/);
  assert.doesNotMatch(worker, /event\.data|customer|total|order_items|\.put\(|addAll/, 'no payload read, nothing cached beyond the offline page');
});

test('a guest alert opens order history in an existing guest window or a new one', async () => {
  const worker = load('vite-plugin-tenant-html.ts').customerServiceWorker({ venue: { name: "Jimmy's" }, seo: { themeColor: '#172544' }, theme: { colors: { paper: '#FFFDF7' } } }, 'public');
  const origin = 'https://restaurant.example';
  const target = `${origin}/orders?source=alert`;
  const click = async (windows) => {
    const calls = [];
    const handlers = new Map();
    runInNewContext(worker, { URL, self: {
      location: { origin },
      addEventListener: (name, handler) => handlers.set(name, handler),
      clients: {
        matchAll: async () => windows(calls),
        openWindow: async (url) => calls.push(['open', url]),
      },
    } });
    let result;
    handlers.get('notificationclick')({ notification: { close() {} }, waitUntil: (work) => { result = work; } });
    await result;
    return calls;
  };
  const staff = { url: `${origin}/admin/kitchen`, navigate: () => assert.fail('leave the kitchen window alone') };
  assert.deepEqual(await click(() => [staff]), [['open', target]]);
  assert.deepEqual(await click((calls) => [staff, {
    url: `${origin}/order`,
    navigate: async (url) => { calls.push(['navigate', url]); return { focus: () => calls.push(['focus', url]) }; },
  }]), [['navigate', target], ['focus', target]]);
  assert.deepEqual(await click((calls) => [{ url: target, focus: () => calls.push(['focus', target]) }]), [['focus', target]]);
});
