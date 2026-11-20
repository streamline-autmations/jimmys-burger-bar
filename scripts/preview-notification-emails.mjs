// A local proof book, built from the same renderer a sender would call.
// No recipients, mail provider, network fetches or environment credentials.
import fs from 'node:fs/promises';
import path from 'node:path';
import { load } from './lib/load-ts.mjs';

const { jimmys } = load('src/tenants/jimmys/config.ts');
const { renderNotificationEmail } = load('src/core/notifications/emails.ts');
const out = path.resolve('notification-previews.local');
const siteUrl = 'https://preview.example.invalid';
const order_no = 'JB-1120-SAMPLE';
const paid_at = '2026-11-20T15:05:00Z';
const guest = { email: 'guest@example.invalid', phone: '+27 00 000 0000' };
const menu = jimmys.menu.categories.flatMap(category => category.items);
const burger = menu.find(item => item.name === 'Beef Burger');
const bacon = jimmys.menu.categories.find(category => category.name === 'Extras').items.find(item => item.name === 'Extra Bacon');
const items = [{ name: burger.name, qty: 2, unit_price: burger.price, extras: [{ name: bacon.name, price: bacon.price }] }];
const order = { ...guest, customer_name: 'Sample guest', order_no, order_type: 'collection', requested_time: '2026-11-20T17:00:00Z',
  total: 2 * (burger.price + bacon.price), items };
const booking = { ...guest, name: 'Sample guest', date: '2026-11-21', time: '18:30:00', guests: 4, seating: 'Inside' };
const groups = [
  ['Orders', [
    ['paid', 'Payment received', { kind: 'order.received', audience: 'guest', order: { ...order, paid_at } }],
    ['received', 'Request received', { kind: 'order.received', audience: 'guest', order }],
    ['staff-order', 'New kitchen order', { kind: 'order.received', audience: 'staff', order: { ...order, paid_at } }],
    ['accepted', 'Accepted with a kitchen estimate', { kind: 'order.accepted', order_no, eta: '2026-11-20T17:10:00Z' }],
    ['preparing', 'Preparing', { kind: 'order.preparing', order_no }],
    ['ready-collection', 'Ready to collect', { kind: 'order.ready', order_no, order_type: 'collection' }],
    ['ready-delivery', 'Ready for dispatch', { kind: 'order.ready', order_no, order_type: 'delivery' }],
    ['ready-table', 'Table order ready', { kind: 'order.ready', order_no, order_type: 'table' }],
    ['out-for-delivery', 'Out for delivery', { kind: 'order.out_for_delivery', order_no }],
    ['completed', 'Order complete', { kind: 'order.completed', order_no }],
    ['cancelled', 'Paid order cancelled', { kind: 'order.cancelled', order_no, paid_at, previouslyAccepted: true }],
    ['refund-pending', 'Refund pending', { kind: 'refund.pending', order_no, amount: 50 }],
    ['refund-recorded', 'Partial refund recorded', { kind: 'refund.recorded', order_no, amount: 50 }],
  ]],
  ['Table bookings', [
    ['booking-requested', 'Request received', { kind: 'booking.requested', audience: 'guest', booking }],
    ['staff-booking', 'New request for staff', { kind: 'booking.requested', audience: 'staff', booking }],
    ['booking-confirmed', 'Table confirmed', { kind: 'booking.confirmed', booking }],
    ['booking-cancelled', 'Booking cancelled', { kind: 'booking.cancelled', booking }],
  ]],
  ['After the visit', [
    ['review', 'Google review request with opt-out', { kind: 'review.requested', eligible: true, optOutUrl: siteUrl + '/sample-opt-out' }],
  ]],
];

await fs.mkdir(out, { recursive: true });
await fs.copyFile(path.join('public', jimmys.assets.logo), path.join(out, 'logo.png'));
for (const [, samples] of groups) {
  for (const [slug, , event] of samples) {
    const mail = renderNotificationEmail(jimmys, siteUrl, event);
    const html = mail.html.replace('src="' + new URL(jimmys.assets.logo, siteUrl).href + '"', 'src="logo.png"');
    await fs.writeFile(path.join(out, slug + '.html'), html);
    // Exercise the same Outlook dark selectors without changing the reviewer's OS.
    await fs.writeFile(path.join(out, slug + '-dark.html'), html.replace('<html lang="en">', '<html lang="en" data-ogsc>'));
    await fs.writeFile(path.join(out, slug + '.txt'), 'Subject: ' + mail.subject + '\n\n' + mail.text + '\n');
  }
}

const { ink, accent, paper } = jimmys.theme.colors;
const index = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Jimmy’s notification emails</title><style>
body{background:${paper};color:${ink};font:16px/1.5 Arial,sans-serif;margin:0}main{max-width:46rem;margin:0 auto;padding:32px 20px}
header{border-bottom:6px solid ${accent};padding-bottom:16px}h1{font:800 2.2rem/1.1 'Trebuchet MS',Arial,sans-serif;margin:20px 0 8px}
h2{margin:28px 0 0}p{margin:0}ul{list-style:none;padding:0;margin:4px 0}li{display:flex;align-items:baseline;justify-content:space-between;gap:16px;padding:9px 0;border-bottom:1px solid ${ink}}
a{color:${ink};text-underline-offset:3px}li>span{display:flex;gap:12px;flex-shrink:0}li>span>a{white-space:nowrap;font-size:.9rem}a:focus-visible{outline:3px solid ${ink};outline-offset:3px}@media(prefers-color-scheme:dark){body{background:${ink};color:${paper}}a{color:${accent}}li{border-color:${paper}}img{background:white;border-radius:4px}}</style></head>
<body><main><header><img src="logo.png" width="94" alt="Jimmy's Burger Bar"><h1>Notification emails</h1><p>Drafts for review. All orders, guests and bookings shown here are examples.</p></header>
${groups.map(([name, samples]) => `<section><h2>${name}</h2><ul>${samples.map(([slug, label]) =>
  `<li><a href="${slug}.html">${label}</a><span><a href="${slug}-dark.html" aria-label="Dark preview for ${label}">Dark</a><a href="${slug}.txt" aria-label="Plain text for ${label}">Plain text</a></span></li>`).join('')}</ul></section>`).join('')}
</main></body></html>`;
await fs.writeFile(path.join(out, 'index.html'), index);
console.log('Open ' + path.join(out, 'index.html'));
