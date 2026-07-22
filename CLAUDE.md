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

It is deployed and facing real customers, so it is **LIVE mode**, not DEMO.

> **Explicit skill override:** `demo-site-builder` is personal-scoped and therefore active
> in this repo. Its Step 3 instructs generating *"3 fake-but-realistic testimonials (SA
> names, specific outcomes)"* and picsum placeholder images. **That instruction does NOT
> apply here and must be ignored.** It is written for pitch mockups that never get
> published. This site is published.

Concretely:

- **No invented content of any kind.** No fabricated testimonials, no invented review
  counts, no made-up years-in-business, no generated food photography passed off as theirs.
- **Every price, hour, dish and quote comes from Jimmy's.** If something is missing, leave a
  clearly marked `PLACEHOLDER` comment and tell Christiaan. Do not fill the gap.
- **Food photography must be real photographs of Jimmy's own food.** Generated or stock food
  misrepresents what a customer will actually be served, and this is a restaurant whose
  customers will physically arrive expecting that plate.

> **2026-07-22 client override on the rule above:** Christiaan explicitly approved
> generating AI food imagery/video (via Higgsfield) for the Crav-tier visual upgrade,
> with the misrepresentation risk stated and understood, until real photography can be
> arranged. Any AI-generated food asset added under this override MUST be logged in the
> table below so it can be swapped out when a real shoot happens. The rule above is not
> deleted because it remains the target state.

### Known outstanding content issues (do not ship more of these)

| Issue | Where | Status |
|---|---|---|
| 3 fabricated testimonials | `config.ts` → `testimonials`, rendered `Home.tsx` | **Resolved 2026-07-22.** Replaced with verbatim Google reviews (Nicole Delport, Linda Terblanche, Eugene Prins) supplied by Christiaan. Listing is now 4.7★ / 64 reviews; config updated to match. |
| Hero video is AI-generated | `public/videos/hero-burger-cinematic.mp4` (active), `hero-burger-loop.mp4` (old, kept for rollback) | **Covered by the 2026-07-22 override.** Both derived from Jimmy's real hero shot via image-to-video (v2: Seedance 2.0, push-in/ease-out loop + steam). Poster `images/hero-burger-poster.jpg` is the video's first frame (AI-derived, same asset). Replace with real footage when available. |
| Trading hours unconfirmed | `config.ts` → `venue.hours` | **Resolved 2026-07-22.** Real hours from Christiaan: Mon–Tue 09:00–20:00, Wed–Thu 09:00–21:00, Fri–Sat 09:00–00:00, Sun closed. Note: Coffee & Cars still runs one Sunday a month — they open for the event. |
| Email is invented | `config.ts` → `venue.email` | **Resolved 2026-07-22.** Real inbox: `jimmysburgerbar1@gmail.com`. |

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

## Motion system: the "stamp" world (expanded 2026-07-22)

The signature is still the stamp — Jimmy's brand is a poster wall with jagged golden
starburst price stickers slapped on top, and posters/stickers still land with overshoot
(`stampChild` / `stampContainer` / `stampSticker` in `src/lib/motion.ts`). But on
2026-07-22 Christiaan directed a full motion expansion (reference: cravburgers.shop),
so the site is no longer "one signature, everything else still." The current system:

- **Stamp (signature, unchanged):** posters and price stickers land with scale overshoot
  and settle crooked. Still the ONLY overshoot on the site.
- **Entrances translate again:** `fadeInUp` / `riseChild` are opacity + y rise (the
  earlier opacity-only doctrine was deliberately reversed at client direction — do not
  "restore" it without asking Christiaan).
- **Word-mask headings:** `<RevealHeading>` — words rise out of per-word overflow masks.
  Used on major section headings and page titles.
- **Image settle:** `imageSettle` — imgs arrive oversized, settle to scale 1. Apply to the
  `<img>` inside an overflow-hidden wrapper, never the wrapper (rings/tilts would clip).
- **Route curtain (v2):** two layers in `App.tsx` — a gold accent edge leads, the navy
  curtain follows, and the real logo (`/images/logo.png`) stamps onto the curtain with
  `STAMP_EASE` while the page changes. Reveal is the reverse order so every wipe
  flashes gold between ink and page. `ScrollToTop` is delayed 430ms to hide the jump.
- **Marquee band** (`<Marquee>`): infinite gold strip under the hero, CSS-only. Content
  must stay factual (menu/specials/address) — no invented claims.
- **Starburst spin:** the jagged SVG rotates slowly (24s) behind static price text.
- **Rail lean:** poster rails skew with drag velocity (`useRailSkew`, GSAP on track only).
- **Drinks band drift:** ±40px scroll parallax, oversized wrapper.
- **The pinned Smash showcase** (`<SmashStory>`): **currently UNMOUNTED** — built
  2026-07-22, then pulled from Home the same day at client direction ("nice touch but
  doesn't fit, remove for now"). The component is kept in `src/components/SmashStory.tsx`
  for a future placement. If remounting: it is a ~1.8-screen GSAP pin+scrub scene
  (giant filled/outlined Baloo type, real burger photo settling to a sticker tilt, R100
  starburst stamp, full-bleed `bg-primary`). GSAP owns everything inside it; no Framer
  in that tree. **Gotcha:** the route transition wrapper is `display:flex`, which makes
  ScrollTrigger silently auto-disable pin spacing — `pinSpacing: true` must stay
  explicit or later sections scroll straight over the pinned scene.
- **Ink doodles** (`<Doodle>`): hand-drawn stroke SVG food/drink sketches in royal blue,
  used as faint watermarks on menu/drinks panels (mapped per category) and scattered in
  section backgrounds at ≤8% opacity. Chalkboard voice, never above ~13% opacity, never
  a substitute for real photography.

**Reviewer presentation rule:** review cards use Google-style INITIAL avatars plus a
"Posted on Google" chip. Never attach internet/stock photos to real named reviewers —
that fabricates identity, same class of violation as invented testimonials.

Coherence rules that keep this from becoming slop: everything derives from the
poster/sticker world; ONE easing curve (`EASE`) for all entrances; overshoot stays
exclusive to the stamp; infinite loops are CSS-only, subtle, and pause under
`prefers-reduced-motion`; `MotionConfig reducedMotion="user"` guards all Framer
transforms globally.

**Secondary physics, same world (added 2026-07-22, Crav-tier interaction pass):**

- The horizontal poster rails lean slightly with drag velocity and settle upright
  (`src/lib/useRailSkew.ts`, GSAP `quickTo` on skewX). This is sticker physics extending
  the stamp, not a second signature. The skew is applied to the rail **track only** —
  never the cards, because Framer owns each card's inline transform (see gotcha below).
- The drinks band video drifts ±40px against scroll (Framer `useScroll`, same pattern as
  the hero). Its wrapper is oversized (`-inset-y-12`) so the drift never exposes an edge.
- Lenis is now driven by `gsap.ticker` with `ScrollTrigger.update` synced on its scroll
  event (`src/lib/useLenis.ts`) so any future ScrollTrigger work reads accurate positions.
  Do not reintroduce a separate `requestAnimationFrame` loop for Lenis.

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
  in `/public` — never hot-link a CDN. Phones get a dedicated 9:16 centre-crop of the same
  clip (`hero.videoMobile` / `posterMobile`, chosen once at mount in `Home.tsx`) — the
  16:9 file under `object-cover` on a portrait screen loses the composition entirely and
  wastes mobile data (portrait crop is ~0.6MB vs 1.9MB).
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
