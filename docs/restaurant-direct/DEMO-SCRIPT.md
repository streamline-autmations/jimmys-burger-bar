# Owner demo: two minutes on staging

Site: https://jimmys-staging.vercel.app (staging, noindex, Payfast **sandbox**: no real money).
Kitchen screen: https://jimmys-staging.vercel.app/admin/kitchen

Checked against staging on 2026-11-17 (deploy `dpl_8CN4hptEgEbvf1KzMMumU22xczr7`, commit
`235637d`). What was walked and what was not is listed at the end. If staging is redeployed,
walk it again before the meeting.

> **Staging state on 2026-11-18 (see `MVP-STATUS.md`):** staging now runs `kitchen-push`
> 378e61c, which has **no delivery option**, so step 6 cannot be shown until kitchen-push and
> delivery-preview are combined and redeployed. Lock-screen alerts exist on that build (opt-in,
> proven on one Android phone). Paid, unaccepted tickets `JB-1117-EYTUWW`, `JB-1117-JVP44J` and
> `JB-1118-A32V7N` are waiting in *To accept*; clear them in "Before the meeting" step 5.

## Before the meeting (10 minutes)

1. **Pick a time inside trading hours.** Staging refuses checkout outside them: Mon to Tue
   09:00 to 20:00, Wed to Thu 09:00 to 21:00, Fri to Sat 09:00 to 00:00, Sunday closed.
   Breakfast dishes are refused after 12:00.
2. **Laptop as the till computer:** sign in at `/admin/login` with the till login
   (`till@example.com`), open Orders, then Kitchen screen.
3. **Second phone as the chef's phone:** sign in with `chef@example.com`, open the kitchen
   screen.
4. On both: tap **Enable sound**, then **Test alert**. You must hear the beeps. Volume up,
   iPhone ring switch on ring.
5. **Clear old test tickets.** At 09:50 on 17 November staging had two paid orders waiting in
   *To accept* (`JB-1117-KVGEU3`, `JB-1117-VEJS26`), one accepted and one ready. Move each
   through to **Collected** so the screen starts empty and the 20-second reminder stops.
6. Pill at the top of the kitchen screen says **Live**.
7. Your own phone (the "guest"): open https://jimmys-staging.vercel.app/order and leave it
   on the menu.

## The demo

**Open with:** "This is Jimmy's own ordering link for collection. Guests order and pay on
your site, and the ticket lands on your till computer and the chef's phone."

1. **Order (guest phone).** Scroll to Burgers, tap **Add** on Beef Burger (R90), tap the
   bar at the bottom: **1 item, R90 · Checkout**.
   Say: the menu, prices and hours are Jimmy's own and are checked by the server.
   Do not say "customise": there are no sauce or side options yet.

2. **Pay (guest phone).** Checkout already shows the next collection slot. Fill in a name,
   phone and an `@example.com` email. Point at the *Before you pay* box (address, time,
   total). Tap **Pay R90 with Payfast**.
   On the Payfast page, say before they read it: "this is Payfast's test environment".
   It shows a yellow sandbox banner and a play-money wallet balance in the millions, and the
   merchant name is blank. Tap **Complete Payment**.
   The phone returns to the tracking page: **Payment received. Waiting for Jimmy's to
   accept your order.**

3. **Kitchen (laptop and chef's phone).** The order chimes and appears gold under
   **To accept**, with a running clock, on both screens.
   Say: it only appears once Payfast has confirmed the money; an unpaid order never
   reaches the kitchen.

4. **Accept and ready (laptop, then guest phone).** Under *Accept and promise a time*, tap
   a time. Show the chef's phone updating too. Tap **Start preparing**, then **Mark ready**.
   On the guest phone the tracking page changes to **Ready to collect** with *Kitchen
   expects it ready* and the time picked. It re-checks every 15 seconds; tap
   **Check status** if you do not want to wait. Then **Collected** on the laptop.
   Say: if two people tap the same order, the first tap counts.

5. **Busy shift controls (laptop).** Open **Ordering** in the staff console: show
   **Pause online orders** and the per-dish **Sold out** switch. Resume before leaving.
   Then say: "At month end there is a report of completed orders for both of us to check
   against Payfast and the till. The data is in place; the screen for it is being built
   before launch." **Do not try to open a report: there is no report screen on staging.**

6. **Optional: how delivery would work (guest phone, then laptop).** Only if the owner
   asks about delivery. Open with: "This is how delivery would work. The suburbs, fees and
   rider are examples; prices are to be agreed once we have tested a route."
   On checkout tap **Delivery**, pick **Riversdale**, enter a street address. The order
   shows the delivery fee as its own line, labelled *Example delivery fee for this
   preview, to be agreed*. Pay with Payfast as before.
   On the laptop the ticket shows the address and fee. After **Mark ready**, show
   **Send to rider** (opens WhatsApp with the reference, address and items; do not send
   it), then **Out for delivery**: the guest phone says *Out for delivery*. Then
   **Delivered**.
   If asked "what if you are out of the area": choose *My suburb is not listed*. The page
   says so plainly and offers **Collect instead, keep my cart**.
   If asked "what if the rider fails": a manager taps **Delivery failed** and the payment
   goes to refund pending, refunded from the Payfast dashboard.

**Close with** the pilot summary (Claude Doc) and the launch checklist.

## Do not say

- Any sales, savings or order-volume figure that is not Jimmy's own.
- That phones get lock-screen alerts: the kitchen screen must be open and in front.
- Any delivery price, rider, courier or coverage as agreed. Everything in step 6 is an example.

## Walk on staging, 2026-11-17 (Claude, Playwright)

| Step | Result | Evidence |
| --- | --- | --- |
| 1 Order, 390 px | Passed | Added Beef Burger R90; checkout bar showed "1 item R90 · Checkout" |
| 2 Pay, 390 px | Passed | Order `JB-1117-VEJS26`; Payfast sandbox ITN recorded COMPLETE (pf id 3523673) 2 s after *Complete Payment*; tracking showed "Payment received" |
| 3 Kitchen, 1440 px + phone | **Not walked** | No staff password available to Claude; creating a temporary staff login was refused by the permission check. Kitchen route is deployed and redirects to the staff login at 1440 px |
| 4 Accept and ready | **Guest half only** | Tracking for existing ready order `JB-1117-KTSTA2` at 390 px showed "Ready to collect", "Kitchen expects it ready 09:15". The staff taps were not walked |
| 5 Order report | **Failed as originally scripted** | No report screen exists. `collection_commission_report()` is a staff-only database function with no UI or export. Script changed to the Ordering screen; that screen was not walked either |

Original step 5 ("open the order report and show how the month reconciles") came from
`Restaurant_Direct_Jimmys_Build_Plan.md` section 4.
