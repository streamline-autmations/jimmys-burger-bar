# Hands-on test plan: collection ordering and kitchen screen

Use this script to check the whole flow by hand. It is written for staging
(https://jimmys-staging.vercel.app, Payfast **sandbox**, no real money). Section J lists
what changes for the first live order. Write the result next to each step: **Pass**,
**Fail** (with what you saw), or **Skipped** (with why).

Takes about 40 minutes for two people. Last full write-up: `MVP-STATUS.md`.

## Before you start

- **Time:** inside trading hours (Mon to Tue 09:00 to 20:00, Wed to Thu 09:00 to 21:00,
  Fri to Sat 09:00 to 24:00, Sunday closed). Breakfast is only orderable for collection
  before 12:00.
- **Devices:** a *guest phone*, the *till* (laptop or POS PC, Chrome or Edge), and the
  *chef's phone*. Real iPhone and Android phones if you can, not only a desktop browser.
- **Logins:** till = `till@example.com`, chef = `chef@example.com`. Section H also needs a
  manager or owner login.
- **Test details only:** name "Test Guest", email `<anything>@example.com`, phone
  `+27 00 000 00xx` (pick a new `xx` per run). Never a real person's details.
- **Clean start:** on the kitchen screen, move any old gold tickets through to Collected.

## A. Staff screens ready (till and chef)

| # | Step | Expected |
|---|---|---|
| A1 | Sign in at `/admin/login`, open Orders → **Kitchen screen** | Three lanes. Pill at the top says **Live**, "Updated a few s ago" |
| A2 | Tap **Enable sound**, then **Test alert** | Three beeps on each device |
| A3 | Chef's phone: turn on **Lock-screen alerts** if offered, allow notifications | Button reports alerts on. A non-staff login is told it cannot get alerts |

## B. Guest orders and pays (guest phone)

| # | Step | Expected |
|---|---|---|
| B1 | Open `/order`, tap **Add** on Beef Burger | Bottom bar: **1 item, R90 · View cart** |
| B2 | Tap the bar, check the cart (photo, price, − qty +, Remove), tap **Checkout** | Checkout opens with **As soon as possible** selected and the estimated ready time. **Schedule for later** shows a Day list with no Sunday and a time list. When Jimmy's is closed there is no ASAP option: the note says when it opens and the next slot is already chosen |
| B3 | Fill name, phone, email. Read the *Before you pay* box | Address 57 Loch Street, the time (ASAP shows "As soon as possible, about 12:15"), **Total to pay R90** |
| B4 | Tap **Pay R90 with Payfast** | Payfast page with a yellow sandbox banner, R 90.00 |
| B5 | Tap **Complete Payment** | Back on `/track?ref=JB-…` within a few seconds: **Payment received. Waiting for Jimmy's to accept your order.** with a PAID sticker. Write down the reference |

## C. Kitchen receives it (till and chef together)

| # | Step | Expected |
|---|---|---|
| C1 | Watch both kitchen screens after B5 | Within a few seconds the order appears **gold** under *To accept* on both, with a running clock and a chime. A reminder sounds every 20 s until accepted |
| C2 | Chef's phone locked, if A3 was on | A lock-screen alert with generic text (no guest name or items) |
| C3 | Till: under *Accept and promise a time*, tap a time | Ticket moves on; the chef's phone shows the same within a few seconds |
| C4 | Guest phone: tap **Check status** | "Accepted" state with the promised time |
| C5 | Till: **Start preparing**, then **Mark ready** | Guest tracking shows **Ready to collect** and *Kitchen expects it ready* with the time (auto-refresh every 15 s) |
| C6 | Till: **Collected** | Ticket leaves the screen on both devices |
| C7 | Count tickets for this reference | Exactly one ticket, one chime burst, no duplicate |

## D. Two people tap at once

| # | Step | Expected |
|---|---|---|
| D1 | Place another order (B1 to B5). When it is gold on both, tap a time on the till and the chef's phone at the same moment | One wins. The other screen says the order was already moved. Status advances once |
| D2 | Take the till offline (Wi-Fi off) for 30 s, place an order from the guest phone, reconnect | Till shows the gold **Offline** banner while off. After reconnecting, the new order appears without a page refresh |

## E. Things that must be refused (guest phone)

| # | Step | Expected |
|---|---|---|
| E1 | On Payfast, tap **Cancel transaction** instead of paying | Tracking does **not** say payment received. The order never appears on the kitchen screen |
| E2 | Start checkout, leave Payfast open for 30+ minutes, then pay | The order expires. A payment after expiry is flagged for review and never reaches the kitchen |
| E3 | After 12:00, try to order a breakfast dish for today | Refused (breakfast not served at that time) |
| E4 | Tap **Pay** twice quickly | One order, one Payfast page |

## F. Busy-shift controls (till, then guest phone)

| # | Step | Expected |
|---|---|---|
| F1 | Staff console → **Ordering** → **Pause online orders** | Guest `/order` says ordering is paused and will not take payment. Orders already paid stay on the kitchen screen |
| F2 | Resume. Mark Beef Burger **Sold out** | Guest cannot order it; checkout refuses it if it was in the cart |
| F3 | Mark it available again and leave ordering **resumed** | Back to normal |

## G. Logged out and wrong account

| # | Step | Expected |
|---|---|---|
| G1 | Private window, open `/admin/kitchen` | Sent to `/admin/login`. No orders visible |
| G2 | Sign out on the chef's phone while an order arrives | No order details on that phone, no chime |

## H. Refund (manager or owner login)

| # | Step | Expected |
|---|---|---|
| H1 | Pick a paid test order. Refund it in the Payfast sandbox dashboard | Payfast shows the refund |
| H2 | Record it (today Streamline runs `record_payment_refund`; there is no screen) | Order shows refund pending, then refunded. A retry of the same refund changes nothing |
| H3 | Run the report (`collection_commission_report()`; no screen yet) | The refunded order's commission base is reduced; cancelled orders are absent |

## I. One notification check

Do this once per run, not per order.

| # | Step | Expected |
|---|---|---|
| I1 | After B5, check the order email inbox | Staging: no email; the log reads `skipped: webhook.order not configured`. Production: one email per **paid** order, none for an unpaid one |

## J. First live order (production, only after every approval in LAUNCH-CHECKLIST.md)

Same as B, C and H with these changes: a small real order paid by Christiaan's own card;
check the till records it with the reference; refund it in the live Payfast dashboard;
check the order, the refund, Payfast and the till all agree. Then F1 on production
(pause, confirm the order page refuses, resume) before sharing the link.

## Reset after the run

- Move every test ticket to **Collected** so the 20-second reminder stops.
- Leave ordering **resumed** and every dish available.
- Note the references used in the results.

## Read-only checks for Streamline (staging SQL)

```sql
-- the order, its payment events and the push it sent
select o.order_no, o.status, o.payment_status, o.paid_at, p.delivered, p.failed
from orders o left join order_push p on p.order_id = o.id
where o.order_no = 'JB-MMDD-XXXXXX';

-- notifications written for it (one, at payment time)
select kind, note, created_at from notification_log where reference = 'JB-MMDD-XXXXXX';

-- test data rule: should return nothing
select order_no from orders where email not like '%@example.com';
```
