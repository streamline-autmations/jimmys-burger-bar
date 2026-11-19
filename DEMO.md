# Restaurant Direct sales demo

A build of this site with Jimmy's design and **entirely fictional** guests, orders and
bookings, for showing prospects the whole product in about a minute. Nothing is sent to
Jimmy's and no real database is involved.

## Build and run

```bash
npm run build:demo        # outputs dist-demo/, runs the demo build check
npm run preview:demo      # serve it locally
```

It is gated at build time. `npm run build` (every restaurant's production build) cannot
contain demo code: `vite-plugin-demo.ts` refuses to load `src/demo/`, and
`scripts/check-build.mjs` fails the build if demo markers appear in `dist/`, or if the
demo build references Supabase.

## Hosting

The demo deploys as **its own Vercel project**, never on a restaurant's domain.

| Setting | Value |
|---|---|
| Repository | `streamline-autmations/jimmys-burger-bar` |
| Project name | `restaurant-direct-demo` |
| Build command | `npm run build:demo` |
| Output directory | `dist-demo` |
| Environment variables | **none**. Do not add Supabase keys. |

## On screen

- A navy **Demo** strip is fixed to the bottom of every screen, public and staff.
- **Controls** (right of the strip) opens the presenter panel: jump points (including
  **Kitchen screen** and **Order report**), "Fill guest details on this page", "Show as
  installed app", "The week in numbers" and "Reset demo records".
- "Fill guest details" picks the soonest collection time, about 30 minutes out, so the
  ticket lands at the top of the queue. With breakfast in the cart it stays before the
  breakfast cut-off, moving to the next open day if it has to. The panel closes itself.
- **Email cards** show the emails the real product sends, at the moment it sends them:
  the guest's confirmation on the customer side, the restaurant's copy in the staff
  console, and, when an order is completed, the Google review request queued for the next
  20:00 run. Steps that send nothing (confirming a booking, accepting an order) show
  nothing.
- **Today** opens with the order value strip: today, the last 7 days, the average order,
  and the commission a 25% delivery app would have taken on those orders. The real
  console shows the same strip; the commission figure appears only where a restaurant's
  config sets `reporting.appCommissionRate`.
- **Order report** (`/admin/report`) shows completed orders by month: count, order value
  (food less refunds, the figure the Restaurant Direct fee is worked out from) and the
  commission kept at the comparison rate, with a CSV download. The real console shows it on
  pay-first restaurants, from `collection_commission_report()`.
- **The week in numbers** is the closing screen: commission kept over 7 days, orders,
  guests, tables and review requests. It shows no Restaurant Direct price; quote that
  yourself.
- The staff console is already signed in as a fictional staff member.
- Phone, email, WhatsApp, maps and social links do nothing and say so.
- Records live in the browser. A reload keeps them; **Reset demo records** restores the
  seed. A new day re-seeds automatically, so "today" is never empty. The seed is a live
  queue plus about a week of orders on trading days, the same week every reset that day.
  Guests have ordinary names, but every email is `@example.com` and every phone
  `+27 00 000 00xx`.
- Orders placed in one window appear in another window's staff console at once, in the
  same browser profile.

## The two-minute walkthrough

Ordered to sell: the guest's app first, the kitchen, the moment the guest's phone says
"ready", the repeat order, and the money last.

Set up two windows side by side before the call. Press **Reset demo records** first.

- **Customer window**, sized like a phone: Controls → **Show as installed app**. It opens on
  the menu with the Menu / Cart / My orders tabs.
- **Staff window**: Controls → **Kitchen screen**, then tap **Enable sound**.

| Time | Customer window (app view) | Staff window | Say |
|---|---|---|---|
| 0:00 | The menu | | "This is Jimmy's own app. Guests add it to their home screen, and it opens on the menu." |
| 0:08 | **Add** Smash Burger and Beef Burger, then the **Cart** tab | | "Their menu, their prices, checked by the server." |
| 0:18 | Controls → **Fill guest details on this page**, **Place order** | | "No marketplace in between. The order and the guest are Jimmy's." |
| 0:28 | Guest email card, then **Track this order** → **Tell me when it is ready** | The order chimes in under *To accept* | "It lands in the kitchen instantly, and the guest gets a confirmation." |
| 0:40 | | Tap a time to accept, then **Start preparing**, **Mark ready** | "One tap per stage, with a promised time the guest can see." |
| 0:52 | The *Simulated* alert: "Your order at Jimmy's is ready" | | "The guest's phone tells them it's ready, so nobody phones to ask." |
| 1:00 | | **Collected** | "Tonight they're asked for a Google review, automatically." |
| 1:08 | **My orders** → **Order again**: the cart refills at today's prices | | "Next Friday their usual is two taps away. Repeat business, with no app taking a cut." |
| 1:22 | | Controls → **Order report** | "Month end: every completed order, its value, and the commission kept. **Download CSV** for the bookkeeper." |
| 1:42 | | Controls → **The week in numbers** | "That's commission you keep. That's Restaurant Direct." |

If there is time, or they ask: **Bookings** (confirm Megan Smith's 18:30), **Guests** →
Thabo Nkosi (every guest builds a history), and **Today** (the day at a glance).

About the ready alert: the demo shows it on screen and never asks the browser for
permission. On a real phone it arrives as a notification once the guest has tapped **Tell me
when it is ready**: Chrome on Android, or on iPhone only once the app is on the Home Screen
(iOS 16.4 or later). Arrival on a real phone is not yet proven (TaskHub 3818e0e1), so do not
promise it until it is.

The report's "Commission kept" uses the demo's 25% comparison rate, which is an assumption
and not any app's actual fee. Say so if asked. Its order value counts completed orders only,
so it is lower than the 7-day figure on **Today**, which counts every order not cancelled.

After 20:00 the review card says "tomorrow evening": the real nightly job has already run,
and picks the order up the next night.

If a click goes wrong, use the jump points rather than navigating back through the site.

## Recording the staff console (1920x1080)

Press **Reset demo records** first, then record at 100% zoom. Every selection is in the
URL (`?order=` / `?booking=`), so a reload keeps the same ticket open.

1. **New order, inspect, accept.** Start on **Today** (`/admin`). Under *Orders to accept*,
   click **Review** on Pieter Botha. The Orders page opens with his ticket: collection time,
   items with photos, total, and the five-step progress rail. Click **Accept order**. The
   badge and rail move to Accepted and a note confirms it; nothing else on screen moves.
2. **Pending table request, inspect, confirm.** From **Today**, click **Review** on Megan
   Smith's 18:30 request. Her ticket shows date, time, party of 4, inside seating and
   her note. Click **Confirm booking**; the rail moves from Requested to Confirmed.

To follow a guest from the customer site instead: place an order as Thabo Nkosi (see the
walkthrough above), then open **Orders** in the staff window and select his row.

## What is real and what is not

Real: Jimmy's design, menu and prices, and the product behaviour (the demo adapter
follows the same rules as the database: status order, price checks, breakfast cut-off,
safe retries). Fictional: every person, contact detail, order and booking.
