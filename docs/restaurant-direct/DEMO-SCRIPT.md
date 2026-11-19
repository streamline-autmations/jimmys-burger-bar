# Owner demo: two minutes on staging

Site: https://jimmys-staging.vercel.app (staging, noindex, Payfast **sandbox**: no real money).
Kitchen screen: https://jimmys-staging.vercel.app/admin/kitchen

Checked against staging on 2026-11-17 (deploy `dpl_8CN4hptEgEbvf1KzMMumU22xczr7`, commit
`235637d`). What was walked and what was not is listed at the end. If staging is redeployed,
walk it again before the meeting.

> **Staging state (2026-11-19):** the guest app (`restaurant-direct/app-shell`) is on staging
> (deploy `dpl_AFgZTGsqJmWT11x362VSkMz3SPyx`), but the **Report** screen and "Order this
> again" on the tracking page are newer and are only on staging once this branch is
> redeployed there. Until then, skip step 7 and say the report is "built and coming with the
> next update". Delivery (step 8) needs kitchen-push and delivery-preview combined first
> (see `MVP-STATUS.md`).

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
7. Your own phone (the "guest"): open https://jimmys-staging.vercel.app/order and add it to
   the Home Screen (Chrome on Android: menu, *Install app*; iPhone: Share, *Add to Home
   Screen*). Open it from the icon: it starts on the menu with Menu / Cart / My orders tabs.
   Place and collect one order on it beforehand, so **My orders** has something to reorder.

## The demo

Ordered to sell: the guest's app, the kitchen, the "ready" alert, the repeat order, then the
money.

**Open with:** "This is Jimmy's own app. Guests order and pay here, and the ticket lands on
your till computer and the chef's phone."

1. **The app (guest phone).** Open it from the Home Screen icon: it starts on the menu.
   Say: no app store, no marketplace, Jimmy's own menu and prices, checked by the server.
   Do not say "customise": there are no sauce or side options yet.

2. **Order and pay (guest phone).** Tap **Add** on Beef Burger (R90), then the **Cart** tab.
   Name, phone and email are filled in from the earlier order on this phone. Point at the
   *Before you pay* box (time, total). Tap **Pay R90 with Payfast**.
   On the Payfast page, say before they read it: "this is Payfast's test environment".
   It shows a yellow sandbox banner and a play-money balance in the millions, and the
   merchant name is blank. Tap **Complete Payment**. The phone returns to tracking:
   **Payment received. Waiting for Jimmy's to accept your order.**
   Tap **Tell me when it is ready** and allow notifications.

3. **Kitchen (laptop and chef's phone).** The order chimes and appears gold under
   **To accept**, with a running clock, on both screens.
   Say: it only appears once Payfast has confirmed the money; an unpaid order never reaches
   the kitchen.

4. **Accept and ready (laptop).** Under *Accept and promise a time*, tap a time; the chef's
   phone updates too. Tap **Start preparing**, then **Mark ready**.
   Say: if two people tap the same order, the first tap counts.

5. **The ready alert (guest phone).** The phone gets "ready to collect" as a notification,
   and the tracking page shows **Ready to collect** with the promised time.
   Say: nobody has to phone to ask if it's ready.
   If no notification arrives, show the tracking page instead (it re-checks every
   15 seconds; **Check status** to force it). Arrival on a real phone is not yet proven
   (TaskHub 3818e0e1), so rehearse this on the phone you will use. On iPhone it only works
   from the Home Screen icon, iOS 16.4 or later. Then **Collected** on the laptop.

6. **Reorder (guest phone).** Open **My orders**: the order shows *Collected*. Tap
   **Order again**: the cart refills at today's prices, details already filled in.
   Say: next Friday their usual is two taps away, and Jimmy's pays no app for it.
   Do not place it.

7. **Month end (laptop).** In the staff console open **Report**: completed orders for the
   month, their value (food less refunds, which is what our fee is worked out from), and
   **Download CSV** for checking against Payfast and the till. "Commission kept" appears
   only if a comparison rate is set for Jimmy's; it is not set, so do not quote one.
   Then **Ordering**: **Pause online orders** and the per-dish **Sold out** switch. Resume
   before leaving.

8. **Optional: how delivery would work (guest phone, then laptop).** Only if the owner
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
- That the kitchen gets lock-screen alerts on every phone. They are opt-in per device and
  were proven on one Android phone only; keep the kitchen screen open and in front.
- That the guest's ready alert works on every phone, until it has arrived on a real
  iPhone and Android (TaskHub 3818e0e1).
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
