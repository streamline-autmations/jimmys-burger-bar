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
>
> **Same-day extension:** Christiaan asked for AI-generation prompts (to run himself via
> ChatGPT) for two non-food images — a Coffee & Cars event photo and a story-section
> interior/ambience shot. Same override logic applies: this depicts the physical venue
> and a recurring real event, not literal food a customer will be served, so the misrepresentation
> risk is lower than food but not zero (a customer could still expect the depicted space
> or scene). Log any resulting image here when it's added.

### Known outstanding content issues (do not ship more of these)

| Issue | Where | Status |
|---|---|---|
| 3 fabricated testimonials | `config.ts` → `testimonials`, rendered `Home.tsx` | **Resolved 2026-07-22.** Replaced with verbatim Google reviews (Nicole Delport, Linda Terblanche, Eugene Prins) supplied by Christiaan. Listing is now 4.7★ / 64 reviews; config updated to match. |
| Hero video is AI-generated | `public/videos/hero-burger-cinematic.mp4` (active), `hero-burger-loop.mp4` (old, kept for rollback) | **Covered by the 2026-07-22 override.** Both derived from Jimmy's real hero shot via image-to-video (v2: Seedance 2.0, push-in/ease-out loop + steam). Poster `images/hero-burger-poster.jpg` is the video's first frame (AI-derived, same asset). Replace with real footage when available. |
| Trading hours unconfirmed | `config.ts` → `venue.hours` | **Resolved 2026-07-22.** Real hours from Christiaan: Mon–Tue 09:00–20:00, Wed–Thu 09:00–21:00, Fri–Sat 09:00–00:00, Sun closed. Note: Coffee & Cars still runs one Sunday a month — they open for the event. |
| Email is invented | `config.ts` → `venue.email` | **Resolved 2026-07-22.** Real inbox: `jimmysburgerbar1@gmail.com`. |

---

## Brand tokens — client-directed three-colour system (2026-07-28)

Christiaan explicitly simplified the website UI to deep navy, white and golden yellow.
The original logo artwork remains untouched, but sections and controls must not
re-introduce the old royal or periwinkle blues.

```
primary   #172544  deep navy     — primary actions and headings
secondary #F2A93B  golden yellow — legacy alias; never a blue tint
ink       #172544  deep navy     — text and dark section backgrounds
paper     #FFFDF7  warm white    — page background
surface   #FFFFFF  clean white   — panels and cards
accent    #F2A93B  golden yellow — stickers, highlights and colour sections
```

Fonts: **Baloo 2** (display), **Quicksand** (body), **Pacifico** (script). Also from their
real brand collateral. Loaded via Google Fonts in `src/index.css`.

> **Token semantics are LIGHT-theme here.** `paper` is a light page background and `ink` is a
> dark text colour. This is the opposite of the Copper Tap template it was forked from, where
> the same token names meant a dark theme. Do not carry dark-theme assumptions across.

> Jimmy's original logo files still contain their source artwork colours. Do not recolour
> the raster logo; the three-colour restriction applies to the surrounding website UI.

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
- **Ink doodles** (`<Doodle>`): hand-drawn stroke SVG food/drink sketches in deep navy,
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

### Desktop motion layer (lg+, added 2026-09-11)

Christiaan asked for desktop to reach mobile's level or beyond, with mobile left exactly
as it was. Everything here is gated on `DESKTOP_QUERY` (`src/lib/useDesktop.ts`, equal to
Tailwind `lg`) and on reduced motion being off; phones take the original code paths.

- **Intro logo handoff** (`BrandIntro.tsx`): the lockup is scaled for the canvas, and at the
  peel the logo travels into the navbar logo slot (`[data-nav-logo]`) instead of fading.
  The navbar's own logo is hidden by `html[data-intro-handoff]` until it lands. The target
  is measured at peel time; if the bar is off-screen it falls back to the phone exit.
- **No scrollbar jump:** `html[data-intro-active]` reserves `scrollbar-gutter` and paints the
  canvas ink, so the page is the same width during and after the intro. Removing it brings
  back a ~7px sideways jump at the reveal AND misaligns the logo handoff.
- **Hero entrance is gated** on the intro (`useIntroDone` in `introGate.ts`): headline words
  rise from masks, "Done right." writes on via clip-path, then body and CTAs. It used to
  play unseen behind the curtain. Also a scroll-out parallax (copy lifts and fades, burger
  lags and shrinks), and the burger follows the cursor across the whole hero
  (`BurgerAssembly` `trackRef`).
- **Gallery pins** and vertical scroll walks the rail sideways (GSAP ScrollTrigger in
  `GallerySection.tsx`; `pinSpacing: true` stays explicit, same flex-wrapper gotcha as
  SmashStory). The lean comes from scroll velocity. Reduced-motion desktop gets an unpinned,
  draggable rail.
- **Specials rail** is mouse-draggable (`useDragScroll`) with prev/next buttons: a mouse wheel
  cannot scroll an overflow-x rail, so the fifth poster was unreachable on desktop.
- **Closing photo** bleeds to the right viewport edge on lg (absolute, 52% width).
- **Route curtain** logo and tagline are sized up on lg.

**Gotcha (WSL):** this repo lives on `/mnt/c`, where Vite's file watcher receives no change
events, so a plain `npm run dev` silently keeps serving stale modules after edits. Start
it with `CHOKIDAR_USEPOLLING=true`, or verify against `npm run build && npx vite preview`.

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

- **Navbar (rebuilt 2026-07-22):** minimal bar (logo + menu toggle only, every breakpoint,
  no inline links or CTA buttons) that auto-hides on scroll-down and returns on scroll-up
  at ALL widths — the old desktop-only restriction was removed at client direction. All
  navigation lives in a full-screen overlay: blurred real-photo backdrop + a navy card
  that stamps in with `STAMP_EASE`. "Book a Table" is the only CTA, inside the overlay
  only (never in the persistent bar) — this still satisfies the CTA-dedup rule below.
  The overlay is portaled to `document.body` because the nav's `backdrop-filter` traps
  `fixed` descendants.
- **Hero layout (fixed 2026-07-22):** badge row and heading block used to be independently
  positioned (`absolute top-24` vs `flex items-end` on the section) and collided on short
  mobile viewports. Now both live as siblings in one `flex-col` with a flexible spacer
  between them — structurally cannot overlap regardless of viewport height or copy length.
  Do not go back to independent absolute/anchored positioning for hero content.
- **Section dividers** (`SectionDivider.tsx`): `WaveDivider` and `CheckerDivider`, both
  SVG top-edges. Two live on Home as a client-requested comparison: wave between Friday
  specials and Crowd favourites (subtle — backgrounds are close in value), checker
  between the drinks band and Story (dramatic — ink to surface is a big jump). The
  checker is the on-brand pick (bends the existing Coffee & Cars racing motif); the wave
  is a generic reference-site pattern with no basis in Jimmy's actual brand. Awaiting
  client's pick between the two before calling this settled.
- Home page is ~490 lines; the featured-tile component is defined at the top of the file.

## Verify before calling anything done

`npm run check` (tsc) → `npm run build` → then a real browser pass with Playwright MCP at
**1440px AND 390px**. Code that should look right is not done.

## Commands

- `npm run dev` — dev server (Vite, port 5173)
- `npm run check` — tsc
- `npm run build` — production build
