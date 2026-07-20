# Client Setup Checklist (Pub & Grill template)

How to spin up a new pub/bar & grill site from this template. Every step is a
config/asset swap — no component code should need to change for a standard build.

## 1. Duplicate the project
Copy this folder to a new directory named for the client (e.g. `horse-and-river`).

## 2. Edit `src/config.ts`
- `theme.colors` — primary accent + secondary tint (same hue family works best on
  the dark theme), plus paper (page bg), surface (cards), ink (text). Dark theme
  is the template's identity; keep paper/surface dark and ink light.
- `theme.fonts` — swap Google Fonts if needed. Update the `@import` at the top of
  `src/index.css` to match.
- `venue` — name, suffix ("Pub & Grill" / "Sports Bar" / etc), tagline, phone,
  whatsapp (digits only), email, address, maps embed, hours, established year.
- `venue.hero` — `type: "video"` with a looping mp4 + poster, or `type: "image"`
  for clients without footage (poster is used alone). `ambienceVideo` powers the
  drinks band on the home page.
- `nav.links` — trim as needed. Keep it to 5 items so mobile + desktop stay clean.
- `specials` — happyHour + the weekly lineup. This is the section owners care
  about most; get real details from them.
- `menu.categories` / `drinks.categories` — the client's real food and drinks.
  Drinks items are text-only by design (board style), food items need images.
- `testimonials`, `socials` — real content once available.

## 3. Swap images & video
- Hero video: a 10-20s loop (bar pour, grill, ambience). Free sources: Pexels,
  Coverr. Keep 1080p, under ~15MB. Poster image required either way.
- Food photos: client's own if usable, otherwise curated stock at `?w=600&q=80`.

## 4. Update branding assets
- `public/favicon.svg`, `index.html` `<title>` + meta description + theme-color.

## 5. Deploy
- `npm install`
- `npm run check` and `npm run build` — both must pass clean.
- Deploy via Vercel; each client gets their own project + domain.

## Upsells
This template ships without online ordering or a reservations system — those are
paid upsells. The full ordering implementation (cart, order page, WhatsApp
checkout) lives in the sibling `restaurant_demo` template and can be ported in
when a client pays for it. `features.reservations` and `features.scrollVideo`
are placeholders for future systems.
