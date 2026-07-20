# The Copper Tap — Pub & Grill Website Template

## What this is
The **pub & grill template** for Streamline Automations' restaurant funnel:
free site → R499/mo retainer → systems upsell (R10k-R35k). Full playbook:
`C:\Users\User\Downloads\Restaurant-Funnel-Playbook.md`. Sibling template
(light, family-restaurant variant, includes the dormant online-ordering
system used as an upsell): `C:\Users\User\Documents\trae_projects\restaurant_demo`.

"The Copper Tap" is a **fictional demo brand** — the showcase. Real client
builds are made by duplicating this folder and editing `src/config.ts` only
(see CLIENT-SETUP.md for the checklist). Prospect list: `..\PROSPECTS.md`.

## Architecture rules (don't break these)
- `src/config.ts` is the single source of truth: brand colors/fonts flow
  through CSS variables (ThemeProvider → index.css defaults → tailwind.config).
  A standard client build must never require component edits.
- Token semantics are DARK-theme: `paper` = page bg, `surface` = cards,
  `ink` = light TEXT color, `primary` = one copper accent, `secondary` =
  lighter tint of the same hue. One accent per site.
- Feature flags in `config.features`: `ordering`/`reservations`/`scrollVideo`
  are paid upsells, OFF by default. Ordering implementation lives in the
  restaurant_demo sibling, ported in only when a client pays.
- Hero supports `type: "video" | "image"` — video heroes hot-link Pexels CDN
  mp4s for demos; for live client sites download the file into /public.
- Motion: single easing curve in `src/lib/motion.ts` (EASE), entry-only
  animations, no infinite loops. Mobile-first: most traffic is phones.

## Design guardrails (from taste skills, enforced this project)
- No em-dashes anywhere in visible copy. No eyebrow-label spam (max ~1 per
  3 sections). No 3-equal-card cliché rows. Dark theme locked site-wide.
- Fraunces / Instrument Serif are banned fonts; current pairing is
  Bricolage Grotesque (display) + Instrument Sans (body).
- CTA intent is deduplicated: "Book a Table" (WhatsApp deep-link) is THE
  conversion action, everywhere.
- Verify Unsplash image content visually (contact-sheet in browser) — IDs
  routinely render something else entirely.

## Known gotchas
- The navbar uses backdrop-blur, which traps `fixed` descendants — the
  mobile menu overlay is portaled to document.body for this reason.
- Verify with `npm run check` + `npm run build`, then a real browser pass
  (Playwright MCP) at 1440px AND 390px on every page before calling done.

## Commands
- `npm run dev` — dev server; `npm run check` — tsc; `npm run build` — prod.
