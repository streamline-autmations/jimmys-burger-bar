# Restaurant Direct — client setup

> **Status (2026-09-09): this describes the CURRENT state, which is not yet a
> config-driven product.** A new restaurant today is a fork plus real component
> edits. The plan to fix that is Phase 2 (config-driven core) and Phase 5
> (provisioning kit) — see `~/.claude/plans/restaurant-direct-v1-productisation.md`.
> Until those land, treat the "component edits required" section below as the honest
> cost of a new client, and do not promise a config-only launch.
>
> This file previously described the "Copper Tap" pub template it was forked from.
> That was stale and wrong; it has been replaced.

## What Restaurant Direct actually is

A mobile-first restaurant site with:

- Menu and drinks discovery driven by `src/config.ts`
- Collection ordering: session cart, customer details, requested collection time,
  atomic `create_order` RPC, order reference, branded PDF receipt
- Direct table booking, constrained to real trading hours, with a PDF slip
- A staff console at `/admin/*`: dashboard, orders queue, bookings, guest directory
- Order statuses `new → accepted → preparing → ready → completed | cancelled`;
  booking statuses `pending → confirmed | cancelled`
- Email notification to the owner and the customer, via a Supabase `pg_net` call to
  an n8n webhook
- A daily review-request job (`pg_cron` → `send_review_requests()`)

## Per-client infrastructure

Each restaurant needs its own:

1. **Supabase project.** Tables `bookings`, `orders`, `order_items`, `customers`;
   the `create_order` RPC; the customer-upsert triggers; the notification triggers;
   the review cron job. **The schema is not yet in this repo as migrations** — that
   is Phase 5. Today it is reproduced by hand.
2. **n8n workflows.** Two webhooks (booking, order) plus the review-request workflow.
   **The webhook URLs are currently hardcoded string literals inside the SQL function
   bodies** (`create_order`, `notify_booking_webhook`, `send_review_requests`), so
   each new client requires editing those functions. Phase 1 moves them to a settings
   table.
3. **Vercel project**, git-linked, with `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_PUBLISHABLE_KEY` set in the dashboard. Vite bakes env vars in at
   build time, so a missing var does not fail the build — it silently ships a broken
   client.
4. **A staff account**, created manually in the Supabase dashboard. Public signup must
   be **disabled** (Authentication → Sign In / Providers → Email → "Allow new users to
   sign up" off).

## Config swap — `src/config.ts`

Covers: `theme.colors`, `theme.fonts`, `venue` (name, contact, address, hours,
maps/reviews links, rating), `nav.links`, `ordering` (prefix, fulfilment notes,
non-alcoholic list), `specials`, `menu.categories`, `drinks.categories`,
`testimonials`, `socials`.

Traps to know about:

- **Hours are parsed out of display strings** and require an **en-dash** with zero
  padding: `"09:00 – 20:00"`. A hyphen, or `"9:00"`, silently returns "closed" and
  disables both booking and ordering for that day.
- **Prices are display strings** (`"R120"`), parsed by regex and formatted as rands.
  There is no currency setting.
- **Menu items have no stable id.** Carts key on the item name, so renaming an item
  silently drops it from a customer's restored cart.
- Changing `theme.fonts` sets a CSS variable but does **not** load the font — the
  Google Fonts `@import` is hardcoded at `src/index.css:1`.

## Component edits still required per client (the honest list)

These are NOT config today:

- `src/pages/Home.tsx` — references config twice. Every heading, eyebrow, stat label,
  story paragraph and alt string is literal JSX, including a hardcoded
  "Open Monday to Saturday".
- `index.html` — title, meta description, OG/Twitter tags, canonical domain,
  `theme-color`, and the entire pre-paint boot animation colour scheme.
- `src/components/Marquee.tsx` — five hardcoded claims.
- `src/components/BurgerAssembly.tsx` — the homepage hero. Needs five pixel-registered
  transparent burger layers in a fixed stacking order. A non-burger restaurant has no
  equivalent asset and no fallback.
- `src/index.css` — three CSS masks use `burger-complete.webp`; the font `@import`.
- `src/components/Doodle.tsx` — 17 food/drink line drawings, mapped by literal
  category name.
- The three PDF generators — hardcoded `NAVY`/`GOLD` arrays, the venue name, and a
  duplicated hardcoded street address.
- `public/favicon.svg` — a hand-drawn "J".
- `src/components/Footer.tsx` — the agency credit.
- Timezone (`Africa/Johannesburg`) and the literal `+02:00` offset appear in five
  places; "SAST" appears in visible copy.

## Verify before calling a build done

`npm run check` → `npm run build` → `npm test` → a real browser pass at **1440px and
390px**. Code that should look right is not done.
