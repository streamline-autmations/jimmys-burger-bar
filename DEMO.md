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
  details on this page", and "Reset demo records".
- The staff console is already signed in as a fictional staff member.
- Phone, email, WhatsApp, maps and social links do nothing and say so.
- Records live in the browser. A reload keeps them; **Reset demo records** restores the
  seed. A new day re-seeds automatically, so "today" is never empty.
- Orders placed in one window appear in another window's staff console at once, in the
  same browser profile.

## The 60 to 75 second walkthrough

Set up two windows side by side before the call: the customer site sized like a phone,
and the staff console on **Kitchen queue**. Press **Reset demo records** first.

| Time | Customer window | Staff window | Say |
|---|---|---|---|
| 0:00 | Home page, scroll once | | "Their own site, their own brand, built for phones." |
| 0:08 | **Order online**, add two burgers, **Checkout** | | "Guests order straight from you, no marketplace commission." |
| 0:18 | Controls → **Fill guest details**, adjust the time, **Place order** | | "They pick a collection time, and every price is checked by the server." |
| 0:28 | Confirmation with the reference | The order appears in the queue | "It lands in the kitchen instantly." |
| 0:34 | | **Accept order → Start preparing → Mark ready → Complete order** | "One tap per stage. The guest can follow it on the tracking page." |
| 0:50 | | **Bookings**: confirm Megan Placeholder's 18:30 | "Table requests come in the same way." |
| 1:00 | | **Guests** → Thabo Example | "Every guest builds a history: what they ordered, when they visited." |
| 1:08 | | **Today** | "Today's service at a glance. That's Restaurant Direct." |

If a click goes wrong, use the jump points rather than navigating back through the site.

## What is real and what is not

Real: Jimmy's design, menu and prices, and the product behaviour (the demo adapter
follows the same rules as the database: status order, price checks, breakfast cut-off,
safe retries). Fictional: every person, contact detail, order and booking.
