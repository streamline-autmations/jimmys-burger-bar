import fs from 'node:fs';
import assert from 'node:assert/strict';
import { test, before, after } from 'node:test';
import { createHash } from 'node:crypto';
import { createDatabase, asRole, migrationFiles } from './db/harness.mjs';
import { parseItn, parameterString, sign, verifyItn, confirmItn } from '../supabase/functions/payfast/verification.mjs';
import { loadWithEnv } from '../scripts/lib/load-ts.mjs';
import { validateTenant } from '../scripts/lib/tenant-settings.mjs';

let db; let seq=0;
const reviewer='5a000000-0000-4000-8000-000000000001';
before(async()=> {
  db=await createDatabase({files:['supabase/seed/settings.jimmys-staging.sql','supabase/seed/menu.jimmys-staging.sql']});
  await db.exec(`insert into auth.users(id,email) values('${reviewer}','owner@example.com'); insert into public.staff(user_id,email,role) values('${reviewer}','owner@example.com','owner');`);
});
after(async()=>{ await db?.close(); });
const one=async(sql,args)=>(await db.query(sql,args)).rows[0];
async function order() {
  seq++; const ref=`JB-PAY-${seq}`; const email=`pay${seq}@example.com`;
  let day=new Date(Date.now()+86400000*2); while(day.getUTCDay()===0) day=new Date(+day+86400000);
  const time=day.toISOString().slice(0,10)+'T12:00:00+02:00';
  await db.query(`select * from public.create_order($1,'Test Guest',$2,$3,'collection',null,null,null,$4,100,false,'[{"name":"Beef Burger","qty":1,"unit_price":100}]')`,[ref,email,`082${String(seq).padStart(7,'0')}`,time]);
  return {ref,email};
}
const begin=(o)=>one(`select public.begin_payment($1,$2,'jimmys-staging','sandbox') result`,[o.ref,o.email]);
const paid=(o,tx=''+seq,status='COMPLETE',amount=100)=>one(`select public.mark_order_paid($1,$2,$3,$4,'{}') result`,[o.ref,tx,status,amount]);
const state=(o)=>one(`select * from public.orders where order_no=$1`,[o.ref]);

test('pending cannot be accepted; paid once; duplicate ITN emits one kitchen notification',async()=>{
 const o=await order(); await begin(o);
 await assert.rejects(db.query(`update public.orders set status='accepted' where order_no=$1`,[o.ref]),/PAYMENT_REQUIRED/);
 assert.equal((await paid(o)).result.result,'paid');
 assert.equal((await paid(o)).result.result,'duplicate');
 assert.equal((await one(`select count(*)::int n from public.notification_log where reference=$1`,[o.ref])).n,1);
 assert.equal((await state(o)).payment_status,'paid');
});
test('extras are paid for: the Payfast amount is the server total, and a changed extra price stops payment',async()=>{
 seq++; const ref=`JB-PAY-X${seq}`; const email=`pay${seq}@example.com`;
 let day=new Date(Date.now()+86400000*2); while(day.getUTCDay()===0) day=new Date(+day+86400000);
 const time=day.toISOString().slice(0,10)+'T12:00:00+02:00';
 const extras=[{name:'Extra Bacon',price:25},{name:'Extra Egg',price:20}];
 await db.query(`select * from public.create_order($1,'Test Guest',$2,$3,'collection',null,null,null,$4,145,false,$5::jsonb)`,[ref,email,`082${String(seq).padStart(7,'0')}`,time,JSON.stringify([{name:'Beef Burger',qty:1,unit_price:100,extras}])]);
 const o={ref,email};
 assert.equal((await begin(o)).result.amount,'145.00','Payfast is asked for dish + extras');
 await assert.rejects(paid(o,'7'+seq,'COMPLETE',100),/PAYMENT_AMOUNT_MISMATCH/,'the dish price alone is not enough');
 await db.exec("update public.menu_items set available=false where name='Extra Bacon'");
 try { await assert.rejects(begin(o), /PAYMENT_UNAVAILABLE/, 'a topping sold out after the order'); }
 finally { await db.exec("update public.menu_items set available=true where name='Extra Bacon'"); }
 await db.exec(`update public.menu_items set extras='[{"name":"Extra Bacon","price":30},{"name":"Extra Egg","price":20}]'::jsonb where name='Beef Burger'`);
 try { await assert.rejects(begin(o),/PAYMENT_UNAVAILABLE/,'an extra that changed price since the order'); }
 finally { await db.exec(fs.readFileSync('supabase/seed/menu.jimmys-staging.sql','utf8')); }
 assert.equal((await begin(o)).result.amount,'145.00');
 // Staging ships with no order webhook; give it one for this order so the payload can be read.
 await db.exec(`insert into public.app_settings(key,value) values('webhook.order','https://example.com/order-hook')`);
 try {
  assert.equal((await paid(o,'7'+seq,'COMPLETE',145)).result.result,'paid');
  const queued=await one(`select q.body from public.notification_log l join net.http_request_queue q on q.id=l.request_id where l.reference=$1`,[ref]);
  assert.deepEqual(queued.body.items[0].extras,extras,'the paid-order webhook carries the extras');
  assert.equal(Number(queued.body.total),145);
 } finally { await db.exec(`delete from public.app_settings where key='webhook.order'`); }
});
test('repeated create-payment for same reference persists one pending attempt',async()=>{
 const o=await order(); const first=await begin(o); assert.deepEqual(await begin(o),first);
 assert.equal((await one(`select count(*)::int n from public.payment_events e join public.orders o on o.id=e.order_id where o.order_no=$1`,[o.ref])).n,1);
});
test('amount mismatch is rejected without event or payment change',async()=>{
 const o=await order(); await begin(o); await assert.rejects(paid(o,''+seq,'COMPLETE',99.99),/PAYMENT_AMOUNT_MISMATCH/);
 assert.equal((await state(o)).payment_status,'pending');
});
test('late ITN after expiry stays cancelled and is flagged for refund review',async()=>{
 const o=await order(); await begin(o);
 await db.query(`update public.orders set payment_expires_at=now()-interval '1 minute' where order_no=$1`,[o.ref]);
 await db.exec(`select public.expire_pending_payments()`);
 assert.equal((await paid(o)).result.result,'review_required');
 const s=await state(o); assert.equal(s.status,'cancelled'); assert.equal(s.payment_status,'paid'); assert.equal(s.payment_review_required,true);
 assert.equal((await one(`select count(*)::int n from public.notification_log where reference=$1`,[o.ref])).n,0);
});
test('late ITN before expiry job and payment after explicit cancellation cannot create tickets',async()=>{
 for(const cancelled of [false,true]) {
 const o=await order(); await begin(o);
 await db.query(cancelled ? `update public.orders set status='cancelled' where order_no=$1` : `update public.orders set payment_expires_at=now()-interval '1 second' where order_no=$1`,[o.ref]);
 assert.equal((await paid(o)).result.result,'review_required'); assert.equal((await state(o)).status,'cancelled');
 }
});
test('out-of-order failure cannot downgrade paid and second transaction cannot create another ticket',async()=>{
 const o=await order(); await begin(o); const tx=''+seq; await paid(o,tx); await paid(o,tx,'CANCELLED'); await paid(o,'900'+seq);
 assert.equal((await state(o)).payment_status,'paid'); assert.equal((await state(o)).payment_review_required,true);
 assert.equal((await one(`select count(*)::int n from public.notification_log where reference=$1`,[o.ref])).n,1);
});
test('provider transaction cannot be reused against another order',async()=>{
 const a=await order(); await begin(a); const tx='800'+seq; await paid(a,tx);
 const b=await order(); await begin(b); await assert.rejects(paid(b,tx),/PAYMENT_TRANSACTION_REUSED/);
});
test('pause refuses new payments and new online orders but permits verified existing payment',async()=>{
 const o=await order(); await begin(o);
 await db.exec(`insert into public.app_settings(key,value) values('ordering.paused','true') on conflict(key) do update set value='true'`);
 try { await db.exec(fs.readFileSync('supabase/seed/settings.jimmys-staging.sql','utf8')); await assert.rejects(begin(o),/ORDERING_PAUSED/); await assert.rejects(order(),/ORDERING_PAUSED/); assert.equal((await paid(o)).result.result,'paid'); }
 finally {await db.exec(`update public.app_settings set value='false' where key='ordering.paused'`);}
});
test('checkout checks contact, tenant, mode, hours, menu availability and trusted server total',async()=>{
 const o=await order(); await assert.rejects(begin({...o,email:'wrong@example.com'}),/PAYMENT_NOT_FOUND/);
 await assert.rejects(db.query(`select public.begin_payment($1,$2,'wrong','live')`,[o.ref,o.email]),/PAYMENT_TENANT_MODE/);
 await db.exec(`update public.menu_items set available=false where name='Beef Burger'`);
 try{await assert.rejects(begin(o),/PAYMENT_UNAVAILABLE/);}finally{await db.exec(`update public.menu_items set available=true where name='Beef Burger'`);}
 assert.equal((await begin(o)).result.amount,'100.00');
 await db.query(`update public.orders set requested_time=now()-interval '1 minute' where order_no=$1`,[o.ref]);
 await assert.rejects(begin(o),/PAYMENT_CLOSED/);
});
test('report excludes cancelled and nets confirmed partial/full refunds; refund retries are idempotent',async()=>{
 const o=await order();await begin(o);await paid(o);
 await db.query(`update public.orders set status='completed' where order_no=$1`,[o.ref]);
 const refund=(id,amount,confirmed)=>db.query(`select public.record_payment_refund($1,$2,$3,$4,$5)`,[o.ref,id,amount,confirmed,reviewer]);
 await refund('refund-a',20,false); assert.equal((await state(o)).refund_amount,'0.00');
 await refund('refund-a',20,true);await refund('refund-a',20,true);
 let rows=await asRole(db,'authenticated',()=>db.query(`select * from public.collection_commission_report()`),{userId:reviewer});
 let r=rows.rows.find(r=>r.reference===o.ref);assert.equal(r.commission_base,'80.00');assert.equal(r.delivery,'0.00');
 await refund('refund-b',80,true);
 rows=await asRole(db,'authenticated',()=>db.query(`select * from public.collection_commission_report()`),{userId:reviewer});
 r=rows.rows.find(r=>r.reference===o.ref); assert.equal(r.commission_base,'0');
 assert.ok(rows.rows.every(r=>r.fulfilment_state==='completed'));
});
test('public and staff cannot call payment writers; staff cannot forge paid columns',async()=>{
 await asRole(db,'anon',async()=>{ await assert.rejects(db.query(`select public.begin_payment('x','x','x','sandbox')`),/permission denied/); });
 const o=await order();
 await asRole(db,'authenticated',async()=>{ await assert.rejects(db.query(`update public.orders set payment_status='paid' where order_no=$1`,[o.ref]),/PAYMENT_SERVER_ONLY/); },{userId:reviewer});
});
test('flag off keeps reference retry, immediate notification, fulfilment and checkout refusal',async()=>{
 await db.exec(`delete from public.app_settings where key='payments.provider'`);
 try {const o=await order(); assert.equal((await state(o)).payment_status,'not_required');
 await assert.rejects(begin(o),/PAYMENTS_DISABLED/);
 assert.equal((await one(`select count(*)::int n from public.notification_log where reference=$1`,[o.ref])).n,1);
 await db.query(`update public.orders set status='accepted' where order_no=$1`,[o.ref]);
 } finally {await db.exec(`insert into public.app_settings(key,value) values('payments.provider','payfast')`);}
});
test('only staging enables ordering.payment and infra mismatch fails validation',()=>{
 const live=loadWithEnv('src/config.ts',{VITE_TENANT:'jimmys'}).config;
 const stage=loadWithEnv('src/config.ts',{VITE_TENANT:'jimmys-staging'}).config;
 assert.equal(live.ordering.payment,'on_collection');assert.equal(stage.ordering.payment,'payfast');
 assert.ok(validateTenant({slug:stage.slug},stage).some(p=>p.includes('disagrees')));
});

// Fictional fixture, with independently generated MD5; no merchant secrets.
const fixture=[['m_payment_id','JB-TEST-1'],['pf_payment_id','12345'],['payment_status','COMPLETE'],['item_name','Test + food'],['amount_gross','100.00'],['merchant_id','test-merchant']];
const fixtureString='m_payment_id=JB-TEST-1&pf_payment_id=12345&payment_status=COMPLETE&item_name=Test+%2B+food&amount_gross=100.00&merchant_id=test-merchant';
const fixtureSignature=createHash('md5').update(fixtureString+'&passphrase=fixture+salt').digest('hex');
const entries=[...fixture,['signature',fixtureSignature]];
const options={passphrase:'fixture salt',merchantId:'test-merchant',reference:'JB-TEST-1',amount:'100.00',sourceIp:'192.0.2.1',allowedIps:['192.0.2.1']};
test('ITN fixture signature, field order, plus encoding and exact cents pass',()=>{
 assert.equal(parameterString(fixture),fixtureString);assert.equal(sign(fixture,options.passphrase),fixtureSignature);
 // PHP urlencode escapes ~, and ITN values are signed untrimmed (checkout values are trimmed).
 assert.equal(parameterString([['a',' b~ ']]),'a=+b%7E+');assert.equal(parameterString([['a',' b~ ']],true),'a=b%7E');
 assert.equal(verifyItn(parseItn(new URLSearchParams(entries).toString()),options).payment_status,'COMPLETE');
});
for(const [name,changed,opts,pattern] of [
 ['bad signature',[...fixture,['signature','0'.repeat(32)]],{},/BAD_SIGNATURE/],
 ['amount mismatch',entries,{amount:'100.01'},/AMOUNT_MISMATCH/],
 ['invalid source',entries,{sourceIp:'192.0.2.2'},/BAD_SOURCE/],
 ['wrong merchant',entries,{merchantId:'other'},/BAD_MERCHANT/],
 ['wrong reference',entries,{reference:'other'},/BAD_REFERENCE/],
]) test('ITN verification rejects '+name,()=>assert.throws(()=>verifyItn(changed,{...options,...opts}),pattern));
test('ITN rejects duplicate form keys and reordered signed fields',()=>{
 assert.throws(()=>parseItn('a=1&a=2'),/INVALID_PAYLOAD/);
 assert.throws(()=>verifyItn([...entries].reverse(),options),/BAD_SIGNATURE/);
});


test('payments migration works without the gated hardening migration or Jimmy settings seed',async()=>{
 const isolated=await createDatabase({baseline:false,files:migrationFiles().filter(f=>!f.includes('20260915130000_harden_public_writes'))});
 try {
  await isolated.exec(`insert into public.menu_items(name,price,category) values('Fixture Burger',10,'Fixture');`);
  const save=()=>isolated.query(`select * from public.create_order('JB-FIXTURE','Test Guest','fixture@example.com','0821234567','collection',null,null,null,now()+interval '1 day',10,false,'[{"name":"Fixture Burger","qty":1,"unit_price":10}]')`);
  assert.deepEqual((await save()).rows,(await save()).rows);
  assert.equal((await isolated.query(`select payment_status from public.orders`)).rows[0].payment_status,'not_required');
  assert.equal((await isolated.query(`select count(*)::int n from public.notification_log`)).rows[0].n,1);
 } finally {await isolated.close();}
});


test('ITN server confirmation requires TLS sandbox POST, unsigned data and exact VALID',async()=>{
 await confirmItn(entries,async(url,init)=>{
  assert.equal(url,'https://sandbox.payfast.co.za/eng/query/validate');
  assert.equal(init.method,'POST');assert.equal(init.body,fixtureString);assert.equal(init.redirect,'error');
  return new Response('VALID');
 });
 for(const response of [new Response('INVALID'),new Response('VALID\n'),new Response('VALID',{status:500})]) {
  await assert.rejects(confirmItn(entries,async()=>response),/SERVER_VALIDATION_FAILED/);
 }
 await assert.rejects(confirmItn(entries,async()=>{throw Error('network failure');}),/network failure/);
});

// Staff controls for a busy shift (20261116130000_ordering_controls.sql).
test('staff pause and sold-out switches are public to read, staff-only to change, and enforced at order time',async()=>{
 const stateAs=(role)=>asRole(db,role,async()=>(await one(`select public.ordering_state() s`)).s);
 assert.deepEqual(await stateAs('anon'),{paused:false,unavailable:[]});
 // One statement per role block: a refused statement aborts that block's transaction.
 for(const write of [`select public.set_ordering_paused(true)`,`select public.set_menu_item_available('Beef Burger',false)`])
  await asRole(db,'anon',async()=>{ await assert.rejects(db.query(write),/permission denied/); });
 const stranger='5a000000-0000-4000-8000-000000000002';
 await db.exec(`insert into auth.users(id,email) values('${stranger}','guest@example.com')`);
 await asRole(db,'authenticated',async()=>{ await assert.rejects(db.query(`select public.set_ordering_paused(true)`),/STAFF_ONLY/); },{userId:stranger});
 // asRole rolls back, so each switch is flipped and checked inside one staff transaction,
 // with the refused order last (a refusal aborts the transaction).
 const asStaff=(work)=>asRole(db,'authenticated',work,{userId:reviewer});
 await asStaff(async()=>{
  await db.query(`select public.set_menu_item_available('Beef Burger',false)`);
  assert.deepEqual((await one(`select public.ordering_state() s`)).s.unavailable,['Beef Burger']);
  await assert.rejects(order(),/menu item unavailable/i);
 });
 await asStaff(async()=>{ await assert.rejects(db.query(`select public.set_menu_item_available('No such dish',false)`),/MENU_ITEM_NOT_FOUND/); });
 await asStaff(async()=>{
  await db.query(`select public.set_ordering_paused(true)`);
  assert.equal((await one(`select public.ordering_state() s`)).s.paused,true);
  await assert.rejects(order(),/ORDERING_PAUSED/);
 });
 assert.equal((await state(await order())).payment_status,'pending');
});
test('tracking reports payment separately from fulfilment, and only after the server marks it paid',async()=>{
 const o=await order(); await begin(o);
 const look=()=>asRole(db,'anon',async()=>(await one(`select public.lookup_request($1,$2) r`,[o.ref,o.email])).r);
 let r=await look(); assert.equal(r.payment_status,'pending'); assert.equal(r.status,'new'); assert.equal(r.paid_at,null);
 await paid(o); r=await look(); assert.equal(r.payment_status,'paid'); assert.equal(r.status,'new'); assert.ok(r.paid_at);
 await db.query(`update public.orders set status='accepted' where order_no=$1`,[o.ref]);
 r=await look(); assert.equal(r.payment_status,'paid'); assert.equal(r.status,'accepted');
});
