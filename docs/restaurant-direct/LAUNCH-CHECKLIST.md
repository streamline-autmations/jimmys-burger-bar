# Live launch checklist: Jimmy's collection ordering

One page. Every box needs a name and a date beside it. Nothing here is done on production
until the box marked **Christiaan approves** is ticked. Written 2026-11-17 from the repo and
staging state that day.

## 1. Hardware (at Jimmy's, during a quiet shift)

- [ ] Till computer: Chrome or Edge, kitchen screen installed as its own window beside the
      POS (`STAFF-SETUP.md`), speakers loud enough to hear in the kitchen.
- [ ] Chef's phone: kitchen screen added to the Home Screen, on a charger, iPhone ring switch on ring.
- [ ] Wi-Fi checked at the till; a phone on mobile data agreed as the fallback screen.
- [ ] Test alert heard on both devices. A test order seen on both at once.

## 2. Accounts

- [ ] Jimmy's Payfast **live** merchant account, in Jimmy's name, with Jimmy's bank account.
- [ ] Payfast merchant ID, key and passphrase entered by Christiaan as Edge Function secrets on
      the **production** Supabase project. Never in chat, the repo or Vercel.
- [ ] One named staff login per person (owner, manager, till, chef). No shared logins.
      Two-factor decided for owner and manager.
- [ ] New-order email recipient agreed (Jimmy's inbox, Christiaan, or both).
- [ ] Review-request emails: continue or stop during the pilot.

## 3. Menu and hours sign-off (Jimmy's, in writing)

- [ ] Every online dish and price confirmed. Dishes not sold online removed.
- [ ] Dish options: none for the pilot, or Jimmy's list supplied.
- [ ] Trading hours and closures confirmed; collection notice time agreed.
- [ ] Config updated, `npm run tenant:sql -- jimmys` run, seed applied and site deployed back
      to back (orders with a changed dish are refused in between).

## 4. Who does what

- [ ] Who accepts orders on each shift, and the backup.
- [ ] Escalation: who is called when a paid order waits 5 minutes, and their number
      (`ordering.escalation` in the tenant config; unset shows "the manager on duty").
- [ ] Who refunds in the Payfast dashboard, and in which hours.
- [ ] Who records each refund against the order (`record_payment_refund` has no screen yet;
      Streamline records it).
- [ ] Which till payment method staff use to ring up an online order, with its reference.

## 5. Pause switch

- [ ] Who may pause ordering and mark dishes sold out (staff console, **Ordering**).
- [ ] Pause and resume tested on production before the link is shared.
- [ ] Staff know: pause, not switching payments off, is the way to stop orders. Orders
      already paid stay on the kitchen screen.

## 6. Gated changes: Christiaan approves each one explicitly

None of these is on production today. Apply in a planned window, then run `supabase/verify.sql`.

- [ ] `20260915130000_harden_public_writes.sql` (held since 2026-09-15).
- [ ] `supabase/seed/settings.jimmys.sql` (switches on the trading-hours check; payments
      refuse to run without it).
- [ ] `20261116120000_collection_payments.sql`, `20261116130000_ordering_controls.sql`,
      `20261117120000_kitchen_eta.sql`, `20261117130000_staff_order_signal.sql`.
      (Staging shows the last one as two entries; the repo file already contains both parts.)
- [ ] Payfast function: today it refuses every project except staging and every mode except
      sandbox. Going live needs a code change, a Codex review, and a deploy to production.
- [ ] Order report screen built and checked (step 5 of the demo).
- [ ] Payments switched on in the `jimmys` tenant. A merge to `master` deploys every Vercel
      project, so plan the merge as the production release.
- [ ] Real iPhone and Android checkout tested, including a slow connection.

## 7. First controlled live order

- [ ] Quiet hour, owner present. Christiaan pays a small real order with a personal card.
- [ ] Payfast notification recorded; tracking shows "Payment received".
- [ ] Chime on both devices; accept with a time; preparing, ready, collected.
- [ ] Rung up in the till with the order reference.
- [ ] Refunded in the Payfast dashboard; refund recorded; order and refund show correctly in
      the report and match Payfast and the till.
- [ ] Pause, check the order page refuses, resume.
- [ ] Only then: share the link (Google profile, Instagram, Facebook, QR codes).

Delivery is not part of this launch: later, priced after testing.
