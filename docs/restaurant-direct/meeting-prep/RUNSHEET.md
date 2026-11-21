# Owner meeting run sheet (Sat 21 Nov 2026)

Internal. Pairs with `Jimmys-meeting-prep.pdf` (talk track, pricing, objections) and
`../DEMO-SCRIPT.md` (staging version). This sheet is the **demo site** version, walked
and timed on 2026-11-20.

## Shape of the meeting

1. **Part 1, Jimmy's live site (3-5 min, their pace).** Hand them the laptop or phone and let
   them scroll. Nothing to click for them except the menu.
2. **Part 2, the demo (2 min, your pace).** "Now let me show you what happens behind it when
   a customer orders." Switch to the demo site: order, then the kitchen screen.
3. Money table, questions.

| | Part 1: live site | Part 2: demo site |
|---|---|---|
| URL | https://jimmys-burger-bar.vercel.app | https://restaurant-direct-demo.vercel.app |
| What it is | Jimmy's real public site | Same design, made-up customers and orders |
| Checked 2026-11-20 | Loads in about 1.4s (desktop) and 0.8s (phone). Home, Food & Drinks, Visit and Order all return 200 with no console errors at 1440 and 390 | Full order-to-kitchen run passed (see below) |

Say once, when you switch: "This next one is a demo with made-up customers so I can run it
fast. It's the same product, with your menu."

**Never place an order on the live site.** Its `/order` page is real: it writes to Jimmy's
production database and emails the real inbox. If the owner wants to try ordering, hand them the
demo site, not the live one.

## Laptop (1440x900)

Use **two separate windows**, not one crowded tab row, so switching is one click:

- **Window A, live site.** Fresh window (the intro plays once per browser session, so a window
  you already opened today will skip it). Tab 1 `https://jimmys-burger-bar.vercel.app`. Open
  it just before the meeting so the intro plays for them.
- **Window B, demo.** Browser zoom **75%** (see "Known snag"). Tabs left to right:
  1. `/admin/kitchen` (staff side). Click **Enable sound**.
  2. `/order` (customer side). Controls, **Reset demo records**, then **Show as installed
     app**. Phone-narrow window, or use the phone for this.
  3. `/admin/report` (spare, for month end).
- Prep PDF open in a third window for the money table. Do not show it on screen.

Phone: live site open in one tab, demo `/order` in another (**Show as installed app**), battery
above 50%, Do Not Disturb on, brightness up, screen timeout off.

## Part 1 prompts (live site, they scroll)

Let them drive. If they stall, point at: the hero burger and 4.7 stars (64 Google reviews),
the menu (**View the menu**), the Friday specials, Coffee & Cars, and the **Visit** page with
hours. Don't narrate each one. Then: "Customers are already ordering from a link like this.
Let me show you what you'd see on your side."

Content to avoid dwelling on: the food photos are largely AI-generated stand-ins until a real
shoot (CLAUDE.md log). If they ask, say so plainly.

## Part 2: the run (about 2 minutes, then stop talking)

| # | Do | Say (one line) |
|---|---|---|
| 1 | Customer: menu opens on **Breakfast**. Tap **Burgers** | "Jimmy's own app. Guests add it to the home screen." |
| 2 | **Add** Smash Burger (R110) and Beef Burger (R100) | "Your menu, your prices, checked by the server." |
| 3 | **View cart**, then **Checkout** | "No marketplace in between." |
| 4 | Controls, **Fill guest details on this page**, **Place order** | "The order and the customer are yours." |
| 5 | Guest email card appears. Switch to the kitchen tab | "It lands on the till computer and the chef's phone straight away." |
| 6 | Kitchen: tap a time, **Start preparing**, **Mark ready** | "One tap per stage, and the guest sees the promised time." |
| 7 | Customer: **Track this order**, **Tell me when it is ready**, then the ready alert | "Nobody phones to ask if it's ready." (Demo alert is simulated.) |
| 8 | Kitchen: **Collected**. Customer: **My orders**, **Order again** | "Their usual is two taps away, and no app takes a cut." |
| 9 | Controls, **Order report**, **Download CSV** | "Month end: every order, with a file for the bookkeeper." |
| 10 | Controls, **The week in numbers** | "That's commission you keep." Then go to the money table. |

Order of steps 1-3 differs from the old script: the cart is now **View cart, then Checkout**,
and **Fill guest details** only works on the checkout page (it says "Open the order, booking or
tracking page first" anywhere else).

If a click goes wrong, use Controls, **Jump to**, rather than going back.

## Known snag: the new order lands off-screen

Walked at 1440x900: after Reset, the two seeded orders (Pieter Botha, Sam Naidoo) sit at the
top of **To accept** and the new order lands below them, outside the visible screen (its
reference was at y=908 on a 900px-high window). You will say "it appears" and the owner will
see nothing. Fix on the day, either:

- browser zoom 75% on the kitchen tab, or
- accept Pieter and Sam first, during step 5 ("these are two earlier orders").

## Do not say / do not tap

- **Customise** under each dish is in the demo but not on Jimmy's live site yet. Don't tap it.
- No "commission kept" figure as Jimmy's. The 25% is the demo's assumption.
- Ready alert on a real phone is not proven (TaskHub 3818e0e1). Say "simulated here".
- Nothing about delivery prices as agreed. R39/R49 is provisional.
- Breakfast is refused after 12:00. Add burgers, not breakfast.

## 30 minutes before

- [ ] Demo site loads on laptop and phone, on the venue/meeting wifi **and** on phone data.
- [ ] Reset demo records, run steps 1-10 once, Reset again.
- [ ] Sound on, volume up. Laptop charger in, sleep off, notifications silenced.
- [ ] Screen-share or HDMI tested if you are presenting on a TV.
- [ ] PDF with the money table open, not displayed.
- [ ] Their Mr D statement ask written on a note.
- [ ] Fallback: if wifi dies, tether the laptop to your phone. If the site is down, talk
      through `dist-demo` with `npm run preview:demo` (needs the repo on the laptop).
