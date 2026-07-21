# Jimmy's Burger Bar — Meyerton

## What this is

The website for **Jimmy's Burger Bar, 57 Loch Street, Meyerton, Gauteng** — a real,
trading business. Built by Streamline Automations off the pub & grill template
(`..\pub_demo`, "The Copper Tap"), but it is **no longer that template** and the Copper
Tap's tokens do not apply here. If you are looking for the fictional dark pub, it lives in
`pub_demo` — this is not it.

Owner-facing contact: WhatsApp `+27 64 534 6143`. Socials: Facebook + Instagram
(`@jimmys_burgerbar`) — both real and linked in `config.ts`.

---

## THIS SITE IS LIVE — content rules are strict

It is deployed and facing real customers, so it is **LIVE mode**, not DEMO:

- **No invented content of any kind.** No fabricated testimonials, no invented review
  counts, no made-up years-in-business, no generated food photography passed off as theirs.
- **Every price, hour, dish and quote comes from Jimmy's.** If something is missing, leave a
  clearly marked `PLACEHOLDER` comment and tell Christiaan. Do not fill the gap.
- **Food photography must be real photographs of Jimmy's own food.** Generated or stock food
  misrepresents what a customer will actually be served, and this is a restaurant whose
  customers will physically arrive expecting that plate.

### Known outstanding content issues (do not ship more of these)

| Issue | Where | Status |
|---|---|---|
| 3 fabricated testimonials | `config.ts` → `testimonials`, rendered `Home.tsx` | **Unresolved.** They are invented. Jimmy's has 4.6★ / 54 real Google reviews — pull verbatim ones and replace. |
| Hero video is AI-generated | `public/videos/hero-burger-loop.mp4` | Derived from their real hero shot via image-to-video. Replace with real footage when available. |
| Trading hours unconfirmed | `config.ts` → `venue.hours` | **Unconfirmed.** Wrong hours send customers to a closed door. Confirm with Jimmy's. |
| Email is invented | `config.ts` → `venue.email` | `hello@jimmysburgerbar.co.za` is a placeholder. |

---

## Brand tokens — client-locked, do NOT rotate or "improve"

These are lifted from Jimmy's **real** collateral: their printed in-store menu, their
Instagram specials posters, and their logo (brand work by Ameli van Zyl). They are not a
design choice we get to revisit.

```
primary   #1D4E94  royal blue    — menu headers, poster type
secondary #7C8FCB  periwinkle    — the script "Jimmy's" in the logo
ink       #1E2A4E  deep navy     — TEXT colour and dark section backgrounds
paper     #D3DFE6  powder blue   — page background (their menu paper)
surface   #F2F7F9  ice white     — panels and cards
accent    #F2A93B  golden yellow — the "ONLY R120" starburst stickers
```

Fonts: **Baloo 2** (display), **Quicksand** (body), **Pacifico** (script). Also from their
real brand collateral. Loaded via Google Fonts in `src/index.css`.

> **Token semantics are LIGHT-theme here.** `paper` is a light page background and `ink` is a
> dark text colour. This is the opposite of the Copper Tap template it was forked from, where
> the same token names meant a dark theme. Do not carry dark-theme assumptions across.

> Note: Jimmy's **signage** is black + gold, which differs from the blue/yellow of their
> posters and menu. The site follows the poster/menu palette deliberately — it is the more
> developed and more current of their two brand expressions. Do not "fix" this to match the sign.

---

## Motion signature: "stamp"

The site has **one** signature movement, and it is derived from the subject: Jimmy's brand is
a poster wall with jagged golden starburst price stickers slapped on top.

- **Posters and price stickers land.** Scale overshoot that settles, plus the card animating
  to its resting tilt so it lands crooked — the way a sticker actually goes on.
  See `stampChild` / `stampContainer` / `stampSticker` in `src/lib/motion.ts`.
- **Everything else holds still.** `fadeInUp` and `riseChild` are **opacity-only**. The name
  `fadeInUp` is historical (~35 call sites); it no longer translates. **Do not add `y` back.**
- Reason: what makes a site look AI-generated is not bad motion, it is *undifferentiated*
  motion — every element entering identically. One element moving with intent and the rest
  calm reads as designed.

If you add a new section, use `fadeInUp`. The stamp is reserved for posters and price stickers.

**Gotcha:** the poster cards' tilt lives in the Framer variant, **not** a Tailwind
`rotate-[]` class. Framer writes an inline `transform` which clobbers Tailwind's transform
chain and flattens the cards. Keep the tilt in the variant.

---

## Architecture

- **`src/config.ts` is the single source of truth** — brand colours, fonts, menu, drinks,
  specials, venue details. Colours flow through CSS variables
  (ThemeProvider → `index.css` defaults → `tailwind.config`). Content changes must never
  require component edits.
- **Feature flags** in `config.features`: `ordering` / `reservations` / `scrollVideo` are
  paid upsells, **OFF** by default. The ordering implementation lives in the
  `restaurant_demo` sibling and is ported in only when a client pays.
- **Hero** supports `type: "video" | "image"`. For a live client site the file must be local
  in `/public` — never hot-link a CDN.
- Motion presets live in `src/lib/motion.ts`. One easing curve. Entry-only, no infinite loops.
- Mobile-first: most traffic is phones arriving from a WhatsApp link.

### Images

- `public/images/gallery/` — **15 real photographs** from Jimmy's Instagram, curated and
  renamed. These are the good ones. Use them.
- `Images/` — the raw 46-photo Instagram dump they were selected from. Source material, not
  wired into the app.
- `public/images/specials/` — Jimmy's **real** Instagram poster artwork. These are the star of
  the specials section; let the artwork carry it rather than restyling over it.

---

## Design guardrails

- No em-dashes anywhere in visible copy.
- No eyebrow-label spam (max ~1 per 3 sections).
- No 3-equal-card cliché rows.
- CTA intent is deduplicated: **"Book a Table"** (WhatsApp deep-link) is THE conversion
  action, everywhere.
- `Fraunces` and `Instrument Serif` are banned display fonts.

---

## Known gotchas

- The navbar uses `backdrop-blur`, which traps `fixed` descendants — the mobile menu overlay
  is portaled to `document.body` for this reason.
- Home page is ~490 lines; the featured-tile component is defined at the top of the file.

## Verify before calling anything done

`npm run check` (tsc) → `npm run build` → then a real browser pass with Playwright MCP at
**1440px AND 390px**. Code that should look right is not done.

## Commands

- `npm run dev` — dev server (Vite, port 5173)
- `npm run check` — tsc
- `npm run build` — production build
