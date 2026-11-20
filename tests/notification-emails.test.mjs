import assert from 'node:assert/strict';
import { test } from 'node:test';
import { load } from '../scripts/lib/load-ts.mjs';

const { jimmys } = load('src/tenants/jimmys/config.ts');
const { renderNotificationEmail } = load('src/core/notifications/emails.ts');
const render = event => renderNotificationEmail(jimmys, 'https://stage.example.invalid', event);
const order = { order_no: 'JB-1120-SAMPLE', customer_name: 'Test <guest>', email: 'test@example.invalid', phone: '000',
  order_type: 'collection', requested_time: '2026-11-20T23:00:00Z', total: 250,
  items: [{ qty: 2, name: 'Beef Burger', unit_price: 100, extras: [{ name: 'Extra Bacon', price: 25 }] }] };
const paid_at = '2026-11-20T16:00:00Z';
const receipt = (changes = {}, audience = 'guest') => render({ kind: 'order.received', audience, order: { ...order, ...changes } });

test('saved webhook is a request, with frozen extras, restaurant time and only the reference in the track URL', () => {
  const mail = receipt();
  assert.doesNotMatch(mail.text + mail.subject, /payment received|paid|confirmed order/i);
  assert.match(mail.text, /21 Nov 2026.+01:00/);
  assert.match(mail.text, /2× Beef Burger \(\+ Extra Bacon\): R250/);
  assert.match(mail.html, /href="https:\/\/stage.example.invalid\/track\?ref=JB-1120-SAMPLE"/);
  assert.doesNotMatch(mail.html, /test@example.invalid/);
  assert.match(receipt({ paid_at }).text, /received your payment/i);
  assert.match(receipt({ order_type: 'table', table_number: '3', items: [{ name: 'Beef Burger', qty: 1, unit_price: 100 }], total: 100, requested_time: null }).text, /Table: 3/);
  assert.throws(() => receipt({ paid_at: 'invalid' }));
});

test('staff gets the kitchen details and protected admin link, and delivery fees remain separate', () => {
  const mail = receipt({ order_type: 'delivery', delivery_address: 'Sample <street>', delivery_notes: 'Ring the bell', delivery_fee: 39, total: 289 }, 'staff');
  assert.match(mail.text, /Delivery fee: R39[\s\S]*Total: R289/);
  assert.match(mail.text, /Guest email: test@example.invalid/);
  assert.match(mail.html, /Sample &lt;street&gt;/);
  assert.match(mail.html, /Test &lt;guest&gt;/);
  assert.match(mail.text, /https:\/\/stage.example.invalid\/admin\/orders/);
  assert.doesNotMatch(mail.text, /Collect from|Track your order/);
});

test('acceptance uses the kitchen ETA only, and cancellation needs a previously accepted or paid order', () => {
  const event = { kind: 'order.accepted', order_no: order.order_no, eta: null };
  assert.doesNotMatch(render(event).text, /Estimated ready time/);
  assert.match(render({ ...event, eta: paid_at }).text, /Estimated ready time:.+18:00/);
  const cancelled = { kind: 'order.cancelled', order_no: order.order_no, paid_at: null, previouslyAccepted: false };
  assert.throws(() => render(cancelled));
  assert.match(render({ ...cancelled, paid_at }).text, /received your payment/);
  assert.match(render({ ...cancelled, previouslyAccepted: true }).text, /no online payment recorded/);
});

test('pending and confirmed refunds show the individual event amount', () => {
  const refund = { order_no: order.order_no, amount: 25.5 };
  assert.match(render({ ...refund, kind: 'refund.pending' }).text, /Pending amount: R25\.50/);
  assert.match(render({ ...refund, kind: 'refund.recorded' }).text, /Refund amount: R25\.50/);
  assert.throws(() => render({ ...refund, kind: 'refund.recorded', amount: 0 }));
});

test('booking requests, confirmations and cancellations preserve the local day and clock', () => {
  const booking = { name: 'Test Guest', phone: '000', email: 'test@example.invalid', guests: 2, date: '2026-11-21', time: '18:30:00', notes: 'Seat <outside>' };
  const event = { kind: 'booking.requested', audience: 'guest', booking };
  const request = render(event);
  assert.match(request.text, /awaiting confirmation/);
  assert.match(request.text, /Date: .*21 Nov 2026\nTime: 18:30/);
  assert.match(request.html, /Seat &lt;outside&gt;/);
  assert.match(render({ ...event, audience: 'staff' }).text, /Guest phone: 000/);
  assert.match(render({ kind: 'booking.confirmed', booking }).subject, /table is confirmed/);
  assert.match(render({ kind: 'booking.cancelled', booking }).subject, /Booking cancelled/);
});

test('review requires eligibility and a usable opt-out link in both alternatives', () => {
  const event = { kind: 'review.requested', eligible: true, optOutUrl: 'https://stage.example.invalid/stop?token=example' };
  const mail = render(event);
  for (const body of [mail.text, mail.html]) {
    assert.ok(body.includes(event.optOutUrl));
    assert.match(body, /Stop review emails/);
    assert.match(body, /www.google.com\/maps/);
  }
  assert.throws(() => render({ ...event, eligible: false }));
  assert.throws(() => render({ ...event, optOutUrl: 'javascript:void(0)' }));
});

test('committed kitchen transitions produce ordered, single-claim emails with fulfilment-specific instructions', async () => {
  const { createDatabase } = await import('./db/harness.mjs');
  const db = await createDatabase();
  const rows = async (query, args = []) => (await db.query(query, args)).rows;
  try {
    await db.exec("insert into public.app_settings(key,value) values('webhook.status','https://example.invalid/updates')");
    const [{id}]=await rows("insert into public.orders(order_no,customer_name,email,phone,order_type,total) values('JB-TEST-EMAIL','Sample','guest@example.invalid','000','collection',125) returning id");
    for (const status of ['accepted','preparing','ready','completed']) {
      await rows('update public.orders set status=$2 where id=$1',[id,status]);
      await rows('update public.orders set status=$2 where id=$1',[id,status]);
    }
    const queued=await rows('select * from public.notification_email_queue where subject_id=$1 order by seq',[id]);
    assert.deepEqual(queued.map(q=>q.event.kind),['order.accepted','order.preparing','order.ready','order.completed']);
    assert.equal(queued.filter(q=>q.posted_at).length,1);
    for (const job of queued) {
      const [claim]=await rows('select * from public.claim_notification_email($1)',[job.ticket]);
      assert.equal(claim.recipient,'guest@example.invalid');
      const mail=render(claim.event);
      if(job.event.kind==='order.ready') assert.match(mail.text,/Ready to collect[\s\S]*57 Loch Street/);
      assert.deepEqual(await rows('select * from public.claim_notification_email($1)',[job.ticket]),[]);
      await rows('select public.finish_notification_email($1)',[claim.receipt]);
    }
    assert.equal((await rows('select count(*)::int n from public.notification_email_queue where event is not null'))[0].n,0);
    for(const [type,title] of [['delivery','Ready for dispatch'],['table','Your table order is ready']]){
      const mail=render({kind:'order.ready',order_no:order.order_no,order_type:type});
      assert.match(mail.subject,new RegExp(title));
      assert.doesNotMatch(mail.text,/ready to collect/i);
    }
    assert.match(render({kind:'order.out_for_delivery',order_no:order.order_no}).subject,/Out for delivery/);
    await db.exec("insert into public.app_settings(key,value) values('email.review_optout_url','https://example.invalid/preferences')");
    await rows("select public.enqueue_review_email($1,'guest@example.invalid','order')",[id]);
    const [pref]=await rows('select token from public.review_email_preferences');
    await rows('select public.stop_review_emails($1)',[pref.token]);
    const [review]=await rows("select ticket from public.notification_email_queue where event_key='review.order'");
    assert.deepEqual(await rows('select * from public.claim_notification_email($1)',[review.ticket]),[]);
  } finally { await db.close(); }
});

test('email HTML declares both schemes and retains readable inline light styles', () => {
  const {html}=receipt();
  assert.match(html, /name="color-scheme" content="light dark"/);
  assert.match(html, /@media\(prefers-color-scheme:dark\)/);
  assert.match(html, /\[data-ogsc\] \.mail-button/);
  assert.match(html, /class="mail-button" bgcolor="#F2A93B"/);
  assert.match(html, /class="mail-logo"/);
});
