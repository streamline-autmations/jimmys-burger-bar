// Delivery preview: the server prices the fee, refuses what it cannot deliver,
// and charges, verifies and reports food and delivery separately.
import assert from 'node:assert/strict';
import { test, before, after } from 'node:test';
import { createDatabase, asRole } from './db/harness.mjs';

let db; let seq = 0;
const manager = '5d000000-0000-4000-8000-000000000001';
const cook = '5d000000-0000-4000-8000-000000000002';
before(async () => {
  db = await createDatabase({ files: ['supabase/seed/settings.jimmys-staging.sql', 'supabase/seed/menu.jimmys-staging.sql'] });
  await db.exec(`insert into auth.users(id,email) values('${manager}','m@example.com'),('${cook}','c@example.com');
    insert into public.staff(user_id,email,role) values('${manager}','m@example.com','manager'),('${cook}','c@example.com','staff');`);
});
after(async () => { await db?.close(); });
const one = async (sql, args) => (await db.query(sql, args)).rows[0];

// A trading day two or more days out (Jimmy's is closed on Sunday), restaurant-local time.
const at = (hhmm) => {
  let day = new Date(Date.now() + 86400000 * 2);
  while (day.getUTCDay() === 0) day = new Date(+day + 86400000);
  return `${day.toISOString().slice(0, 10)}T${hhmm}:00+02:00`;
};
const burger = '[{"name":"Smash Burger","qty":1,"unit_price":100}]';

async function deliver({ suburb = 'Riversdale', time = at('12:00'), total = 100, role = 'anon' } = {}) {
  seq++;
  const o = { ref: `JB-DEL-${seq}`, email: `del${seq}@example.com` };
  await asRole(db, role, () => db.query(
    `select * from public.create_delivery_order($1,'Test Guest',$2,$3,'12 Loch Street','Gate code 0000',$4,$5,false,$6,$7)`,
    [o.ref, o.email, `083${String(seq).padStart(7, '0')}`, time, total, burger, suburb]));
  // asRole rolls back; run it for real once the role check passed.
  await db.query(
    `select * from public.create_delivery_order($1,'Test Guest',$2,$3,'12 Loch Street','Gate code 0000',$4,$5,false,$6,$7)`,
    [o.ref, o.email, `083${String(seq).padStart(7, '0')}`, time, total, burger, suburb]);
  return o;
}
const state = (o) => one(`select * from public.orders where order_no=$1`, [o.ref]);
const begin = (o) => one(`select public.begin_payment($1,$2,'jimmys-staging','sandbox') r`, [o.ref, o.email]);
const paid = (o, amount, tx = `77${seq}`) => one(`select public.mark_order_paid($1,$2,'COMPLETE',$3,'{}') r`, [o.ref, tx, amount]);
// Status moves run as a signed-in staff member, as the kitchen screen does, so the
// transition trigger is exercised (postgres bypasses it). Committed when it succeeds.
async function move(o, status) {
  await db.exec('begin');
  try {
    await db.query(`select set_config('request.jwt.claim.sub',$1,true)`, [cook]);
    await db.exec('set local role authenticated');
    const { affectedRows } = await db.query(`update public.orders set status=$2 where order_no=$1`, [o.ref, status]);
    assert.equal(affectedRows, 1, `staff could not see ${o.ref}`);
    await db.exec('commit');
  } catch (error) { await db.exec('rollback'); throw error; }
}
const toReady = async (o) => { for (const s of ['accepted', 'preparing', 'ready']) await move(o, s); };

test('the fee is added by the server and the checkout charges food + fee', async () => {
  const o = await deliver({ suburb: 'Riversdale' });
  const s = await state(o);
  assert.equal(Number(s.delivery_fee), 39);
  assert.equal(Number(s.total), 139);
  assert.equal(s.delivery_suburb, 'Riversdale');
  assert.equal(s.payment_status, 'pending');
  const r = (await begin(o)).r;
  assert.equal(r.amount, '139.00');
  assert.equal(r.order_type, 'delivery');
  const far = await deliver({ suburb: 'Daleside' });
  assert.equal(Number((await state(far)).total), 149);
});

test('a fee sent by the browser is ignored', async () => {
  // Food + fee as the claimed total: create_order still checks the food lines.
  await assert.rejects(deliver({ total: 139 }), /order total does not match/);
  // A direct insert naming its own fee gets the zone's fee instead.
  await db.exec('begin');
  try {
    await db.query(`select set_config('app.delivery_suburb','Daleside',true)`);
    await db.query(`insert into public.orders(order_no,customer_name,email,phone,order_type,delivery_address,requested_time,total,delivery_fee)
      values('JB-DEL-FORGE','X','forge@example.com','0830000000','delivery','1 Street',$1,100,0.01)`, [at('12:00')]);
    const s = await one(`select delivery_fee, total from public.orders where order_no='JB-DEL-FORGE'`);
    assert.equal(Number(s.delivery_fee), 49);
    assert.equal(Number(s.total), 149);
  } finally { await db.exec('rollback'); }
});

test('a suburb outside the zone is refused, with or without the delivery wrapper', async () => {
  await assert.rejects(deliver({ suburb: 'Sasolburg' }), /DELIVERY_OUT_OF_ZONE/);
  await assert.rejects(deliver({ suburb: '' }), /DELIVERY_OUT_OF_ZONE/);
  await assert.rejects(db.query(`select * from public.create_order('JB-DEL-PLAIN','X','plain@example.com','0831111111','delivery',null,'1 Street',null,$1,100,false,$2)`,
    [at('12:00'), burger]), /DELIVERY_OUT_OF_ZONE/);
});

test('a time outside delivery hours is refused, at order time and again at payment', async () => {
  await assert.rejects(deliver({ time: at('10:00') }), /DELIVERY_CLOSED/);
  await assert.rejects(deliver({ time: at('19:30') }), /DELIVERY_CLOSED/);
  const o = await deliver({ time: at('19:15') });
  await db.exec('begin');
  try {
    await db.exec(`update public.app_settings set value=replace(value,'"19:30"','"19:00"') where key='delivery.zone'`);
    await assert.rejects(begin(o), /PAYMENT_DELIVERY_CLOSED/);
  } finally { await db.exec('rollback'); }
});

test('the ITN must match food + fee', async () => {
  const o = await deliver();
  await begin(o);
  await assert.rejects(paid(o, 100), /PAYMENT_AMOUNT_MISMATCH/);
  assert.equal((await paid(o, 139)).r.result, 'paid');
  assert.equal((await state(o)).payment_status, 'paid');
});

test('a same-reference retry returns the order without adding the fee twice', async () => {
  const o = await deliver();
  await db.query(`select * from public.create_delivery_order($1,'Test Guest',$2,'0839999999','12 Loch Street',null,$3,100,false,$4,'Riversdale')`,
    [o.ref, o.email, at('12:00'), burger]);
  assert.equal(Number((await state(o)).total), 139);
});

test('out_for_delivery exists only for delivery orders; the report splits food and delivery', async () => {
  const o = await deliver();
  await begin(o); await paid(o, 139);
  await toReady(o);
  await assert.rejects(move(o, 'completed'), /illegal order status transition/, 'a delivery goes out before it is done');
  await move(o, 'out_for_delivery');
  await assert.rejects(move(o, 'cancelled'), /illegal order status transition/, 'a failed delivery goes through mark_delivery_failed');
  await move(o, 'completed');

  seq++;
  const c = { ref: `JB-COL-${seq}`, email: `col${seq}@example.com` };
  await db.query(`select * from public.create_order($1,'X',$2,$3,'collection',null,null,null,$4,100,false,$5)`, [c.ref, c.email, `084${String(seq).padStart(7, '0')}`, at('12:00'), burger]);
  assert.equal(Number((await state(c)).delivery_fee), 0);
  await begin(c); await paid(c, 100, `78${seq}`); await toReady(c);
  await assert.rejects(move(c, 'out_for_delivery'), /illegal order status transition/);
  await assert.rejects(db.query(`update public.orders set status='out_for_delivery' where order_no=$1`, [c.ref]), /orders_out_for_delivery_check/);
  await move(c, 'completed');

  const rows = await asRole(db, 'authenticated', async () => (await db.query(`select * from public.collection_commission_report() where reference = any($1)`, [[o.ref, c.ref]])).rows, { userId: cook });
  const byRef = Object.fromEntries(rows.map((row) => [row.reference, row]));
  assert.deepEqual([Number(byRef[o.ref].food_subtotal), Number(byRef[o.ref].delivery), Number(byRef[o.ref].commission_base)], [100, 39, 100]);
  assert.deepEqual([Number(byRef[c.ref].food_subtotal), Number(byRef[c.ref].delivery), Number(byRef[c.ref].commission_base)], [100, 0, 100]);
});

test('staff cannot move money between food and delivery once payment started', async () => {
  const o = await deliver();
  await asRole(db, 'authenticated', async () => {
    await assert.rejects(db.query(`update public.orders set delivery_fee=0 where order_no=$1`, [o.ref]), /PAYMENT_SERVER_ONLY/);
  }, { userId: cook });
});

test('only a manager can mark a paid delivery failed, which puts it in refund pending', async () => {
  const o = await deliver();
  await begin(o); await paid(o, 139); await toReady(o); await move(o, 'out_for_delivery');
  const { id } = await state(o);
  await asRole(db, 'anon', async () => { await assert.rejects(db.query(`select public.mark_delivery_failed($1)`, [id]), /permission denied/); });
  await asRole(db, 'authenticated', async () => { await assert.rejects(db.query(`select public.mark_delivery_failed($1)`, [id]), /MANAGER_ONLY/); }, { userId: cook });
  await db.exec('begin');
  try {
    await db.query(`select set_config('request.jwt.claim.sub',$1,true)`, [manager]);
    await db.exec('set local role authenticated');
    await db.query(`select public.mark_delivery_failed($1)`, [id]);
    await db.query(`select public.mark_delivery_failed($1)`, [id]); // a second tap is a no-op
    await db.exec('reset role');
    const s = await state(o);
    assert.equal(s.status, 'cancelled');
    assert.equal(s.payment_status, 'refund_pending');
    const e = await one(`select count(*)::int n, max(recorded_by::text) who from public.payment_events where order_id=$1 and kind='refund'`, [id]);
    assert.deepEqual([e.n, e.who], [1, manager]);
  } finally { await db.exec('rollback'); }

  // A collection order is never a failed delivery.
  seq++;
  const c = { ref: `JB-COL-${seq}`, email: `col${seq}@example.com` };
  await db.query(`select * from public.create_order($1,'X',$2,$3,'collection',null,null,null,$4,100,false,$5)`, [c.ref, c.email, `085${String(seq).padStart(7, '0')}`, at('12:00'), burger]);
  await asRole(db, 'authenticated', async () => {
    await assert.rejects(db.query(`select public.mark_delivery_failed($1)`, [(await state(c)).id]), /DELIVERY_NOT_FOUND/);
  }, { userId: manager });
});

test('without the delivery.zone setting a paid delivery is refused as before', async () => {
  await db.exec('begin');
  try {
    await db.exec(`delete from public.app_settings where key='delivery.zone'`);
    await assert.rejects(db.query(`select * from public.create_delivery_order('JB-DEL-OFF','X','off@example.com','0832222222','1 Street',null,$1,100,false,$2,'Riversdale')`,
      [at('12:00'), burger]), /PAYMENT_COLLECTION_ONLY/);
  } finally { await db.exec('rollback'); }
});
