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
- **Controls** (right of the strip) opens the presenter panel: jump points, "Fill guest
  details on this page", "The week in numbers" and "Reset demo records".
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

## The 75 to 90 second walkthrough

Set up two windows side by side before the call: the customer site sized like a phone,
and the staff console on **Kitchen queue**. Press **Reset demo records** first.

| Time | Customer window | Staff window | Say |
|---|---|---|---|
| 0:00 | Home page, scroll once | | "Their own site, their own brand, built for phones." |
| 0:08 | **Order online**, add two burgers, **Checkout** | | "Guests order straight from you, no marketplace commission." |
| 0:18 | Controls → **Fill guest details**, **Place order** | | "They pick a collection time, and every price is checked by the server." |
| 0:28 | Confirmation, guest email card | The order appears in the queue, restaurant email card | "It lands in the kitchen instantly, and both of you get an email." |
| 0:34 | | **Accept order → Start preparing → Mark ready → Complete order** (confirm the last) | "One tap per stage. The guest can follow it on the tracking page." |
| 0:48 | | Review request card | "Tonight they're asked for a Google review, automatically." |
| 0:55 | | **Bookings**: confirm Megan Smith's 18:30 | "Table requests come in the same way." |
| 1:02 | | **Guests** → Thabo Nkosi | "Every guest builds a history: what they ordered, when they visited." |
| 1:08 | | **Today** | "Today's service at a glance, and what came in direct." |
| 1:15 | | Controls → **The week in numbers** | "That's commission you keep. That's Restaurant Direct." |

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
