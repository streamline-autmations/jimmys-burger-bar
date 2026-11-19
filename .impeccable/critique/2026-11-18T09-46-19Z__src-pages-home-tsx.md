---
target: homepage
total_score: 19
max_score: 36
na_heuristics: 7
p0_count: 0
p1_count: 4
target_identity: "file:/mnt/c/Users/chris/Desktop/Streamline/jimmys-burger-bar/src/pages/Home.tsx"
target_fingerprint: "sha256:4438bf3f72275e99059982209fe20500afa395eec1e1072d5b1556ed58232934"
target_path: /mnt/c/Users/chris/Desktop/Streamline/jimmys-burger-bar/src/pages/Home.tsx
timestamp: 2026-11-18T09-46-19Z
slug: src-pages-home-tsx
---
Method: dual-agent (A: design review · B: detector + browser). Both rendered a production build; the dev server errored.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 2 | No open-now / today's hours above the footer; 3.1-3.6s inert intro on every hard load |
| 2 | Match System / Real World | 3 | Poster wall + SA voice land; "Your table's waiting" promises a table no button offers |
| 3 | User Control and Freedom | 2 | Intro unskippable; Escape doesn't close menu overlay; pinned gallery takes ~2 screens of wheel |
| 4 | Consistency and Standards | 2 | Order Online / Start an order / Order duplicates; Beef and Chicken panels both go to /menu |
| 5 | Error Prevention | 2 | Specials posters dated 2025; "Open Monday to Saturday" with no times |
| 6 | Recognition Rather Than Recall | 2 | Booking hidden behind "Visit"; hours only in footer; posters not tappable |
| 7 | Flexibility and Efficiency | n/a | Persuade surface |
| 8 | Aesthetic and Minimalist Design | 3 | Strong; some redundancy (rating x3, 7 links to one Google URL, closing photo repeats gallery) |
| 9 | Error Recovery | 2 | Can't verify a dated special or hours without calling, and calling isn't one tap |
| 10 | Help and Documentation | 1 | Phone/email are plain spans; no WhatsApp link on home |
| **Total** | | **19/36** | **Acceptable (53%)** |

## Design Specificity Verdict
Mostly specific, with a generic middle. Specials rail (real poster artwork, stamp tilt, drag lean), starburst stickers, Coffee & Cars checker divider, flat-top ticket and local copy could only be Jimmy's. FoodChoice (two hover-lift panels), Story (about + 3-stat row with logo as image), wave dividers and a script-kicker-over-Baloo formula on nearly every section read as template rhythm.

Deterministic scan: CLI 0 findings over 34 files (tsx is text-match only, undercount). Browser full-page: 33 findings at 1440, 36 at 390. True: low-contrast x13 from opacity steps on locked tokens, 9px "Local regular" label (2.1:1), kicker-above-heading on hero/FoodChoice/Story, minor stragglers. False positives: cream-palette (locked paper token), marquee (client-directed), stripes (heat halo), grid (poster-wall texture), buried-raster (burger build layers), nested-cards (poster-wall panel, borderline). Overlay injected only in a headless session; no user-visible overlay.

## Priority Issues
1. [P1] "Book a Table" is gone from the homepage. Hero, closing and menu overlay all push ordering (sections.ts:19, :131; Navbar.tsx:160) while closing copy says "Your table's waiting". Fix: closing primary = Book a Table, overlay single CTA = Book a Table; or, if ordering is now the primary action, update CLAUDE.md's CTA rule and the closing copy. Command: /impeccable clarify
2. [P1] No one-tap contact and no hours at the decision point. Footer phone/email are spans, no wa.me link, closing card shows days without times. Fix: tel:/mailto:/wa.me links; today's hours / open-now from the existing hours helper in the closing card. Command: /impeccable harden
3. [P1] Menu overlay is not a dialog. No Escape, Tab escapes to hidden content, no role=dialog/aria-modal (Navbar.tsx:97-176). Fix: dialog semantics, inert page behind, Escape, initial focus. Command: /impeccable audit
4. [P1] Specials look stale. Posters carry July-October 2025 dates next to "One rotates in every Friday"; posters not tappable. Fix: current posters or crop dates, mark this Friday's, link each. Command: /impeccable clarify
5. [P2] Contrast failures from opacity steps. ink/55-/70 and paper/40 fail 4.5:1 (EventSection:73 3.7, ClosingSection:16 4.1, StorySection:26-34 3.6, ReviewsSection:43 2.1 at 9px, :56 3.1, :101 2.7, Footer:83 3.6, GoogleBadge:48 4.0). Fix: floor muted text at ink/75 on paper, ink/85 on gold; 9px label to 11px. Command: /impeccable polish

## Persona Red Flags
Jordan: must guess "Visit" means booking; 2025-dated "Friday Special"; Beef Burgers lands at top of /menu; hours only in footer.
Riley: Escape does nothing on overlay, Tab escapes behind it; hard refresh replays inert intro; "Open Monday to Saturday" vs Sunday Coffee & Cars; "64+" vs "64"; ~15px cream strip at right of pinned gallery at 1440 (headless, verify).
Casey: intro replays on every WhatsApp tap; menu toggle top-right and auto-hides; no call/WhatsApp from home; targets under 44px (Get directions 29px, All specials 24-30px, Posted on Google ~18px); hero CTA below fold at 375x667 (top=746).

## Minor Observations
- Content rule: "Local regular" (sections.ts:101) and "64+" (StorySection:29) are claims the Google listing doesn't support. Use "Google review" and "64".
- Eyebrows/kickers on 8 sections against the ~1 per 3 guardrail.
- Gallery images alt="" (GallerySection:108).
- Closing photo duplicates the last gallery photo.
- Navbar logo nearly vanishes on navy; footer's gold ring chip solves it.
- ~180px dead navy above gallery heading at 1440.
- Story image is logo collateral, not the place; use a real interior photo.
- Story stat hover goes gold on paper (1.96:1).
- Dev server: index.css 500s in dev because the Tailwind content glob pulls src/demo into the dev graph and trips the demo guard (vite-plugin-demo.ts:58).

## Questions to Consider
- If customers come from WhatsApp, why is the homepage the one place you can't WhatsApp Jimmy's?
- Would once-per-session or tap-to-skip honour "intro plays for everyone" while sparing regulars?
- Who uploads this Friday's poster, and what does the rail show when nobody does?
