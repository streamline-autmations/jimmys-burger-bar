# Restaurant Direct V1 audit

Audit date: 7 September 2026. Local implementation review only. No production records, notifications, services, schema, RLS, deployments or account settings were changed.

## Current working capabilities

- Public menu discovery, session-scoped cart, collection-first order requests, existing table/delivery request modes, atomic typed `create_order` RPC, order reference, downloadable PDF and WhatsApp follow-up.
- Booking requests on Visit, configured trading-hour validation, insert-only booking submission, stored UUID reference and pending-request PDF.
- Supabase-authenticated staff overview, booking/order status management and structured customer records. Responsive navigation and record cards were already present in the newer admin commit inspected during this pass.
- Notification and review-request automation are described in SESSION_CONTEXT.md as database/n8n workflows. Their live execution, content, access controls and recipients were NOT verified in this audit.

## Findings by priority

### P0: critical or privacy-sensitive

| Finding | Outcome |
| --- | --- |
| Browser sends prices/totals and statuses; no local SQL migration proves authoritative server validation or restricted RPC grants. Auth guard proves a session, not staff authorization. | External security verification required before operational handoff. Do not assume the generated types prove RLS. No schema/policy changes made. |
| Order requests could be sent repeatedly, with a new small random reference on every retry, including ambiguous network failures. | In-flight lock, larger reference space, conservative uncertain-response handling and tab-scoped prior-reference checkpoint added. Full idempotency across devices requires backend work. |
| Address autocomplete sent customer-entered addresses to Nominatim while typing. | Removed external lookup. Manual address entry retained. No external address service substituted. |
| Staff could overwrite another staff member's status or report success for an update affecting zero rows. | Compare-and-set against prior status; require one returned ID; show conflict/recovery feedback. Server enforcement still needs independent verification. |

### P1: operations and usability

| Finding | Outcome |
| --- | --- |
| Orders accepted past times, closed hours and late breakfast requests; booking times used duplicated hours/browser dates. | Shared validation derives from config hours, uses SAST, excludes closing instant, rejects invalid/past times and Sundays without inventing event dates. Breakfast requests respect the existing until-12 note. |
| Booking confirmation showed a random reference never saved to the database. | Use the actual stored UUID; reuse attempt UUID on retry, including tab refresh. |
| Confirmation/PDF copy implied acceptance or payment; collection said ready immediately. | State saved request versus acceptance, pending table confirmation and not proof of payment. |
| Staff could jump arbitrarily between statuses, including reopening terminal records. | Explicit next-step buttons; cancellation/completion confirmation; no terminal reopen in this UI. |
| The newest 200 records mixed active work and history and could bury old open orders. | Server-side queue/date views, load-more affordance, open orders oldest-first, search/status counts with explicit loaded-record scope. |
| Refresh, stale/error and filtered-empty states were weak. | Shared read lifecycle, superseded-read protection, preserved prior snapshot, manual refresh/last-updated and error recovery. No automatic polling introduced. |
| Wide order details and repeated status controls increased scanning effort. | Reuse existing order cards at every width, add requested date, email and readable next actions. Preserve newer mobile shell. |
| Cart disappeared on refresh, quantities were weakly bounded, money formatting rounded cents away. | Restore only item quantities from tab storage, reprice from current config, bound whole quantities, preserve cents, allow checkout quantity edits. Contact details are not persisted. |
| PDFs could overflow a page for larger carts. | Order item pagination, space reservation for totals and PDF compression added (about 8.7 MB down to 0.8 MB for the branded receipt); pending wording corrected; menu PDF blue changed to navy. |
| Customer interaction count was labelled as visits, implying attended visits. | Label interactions and last interaction accurately. |
| A 390px dashboard panel overflowed. | Wrap panel headings and constrain grid children. |

### P2: focused polish and remaining gaps

- Completed: larger touch controls, linked customer labels, visible keyboard focus, navy/gold status and error palette, remove stale WhatsApp-only/demo/wait-time comments, align booking feature flag with routed implementation.
- Completed: lazy-load admin, ordering, Visit and Food & Drinks. Baseline main application chunk 1,101.55 kB (286.02 kB gzip); after splitting and excluding the development-only element locator from production, 562.43 kB (190.67 kB gzip), roughly 49% smaller raw and 33% smaller gzip. PDF code was already lazy. Source-map analysis identifies Supabase, GSAP, React Router and motion as major contributors. Remaining warning is retained honestly.
- Remaining: formal per-field linked error summaries; auth-network timeout/recovery; full receipt text wrapping for unusually long contact/address fields; server-side full-directory search and pagination for larger installations.
- Menu PDF has hard-coded kitchen extras not represented in config. Confirm provenance with Christiaan before editing confirmed prices or moving those items into config.
- Menu variant choices (sauces, patty choice, etc.) need a restaurant-approved specification. Do not assume notes or new modifiers solve fulfilment.

### Later: explicitly outside focused V1

No POS integration, stock management, kitchen display infrastructure, loyalty points, advanced CRM, staff-role product, menu CMS, table-allocation engine, multi-branch management, payments, driver tracking or analytics installation.

## Improvements completed in this pass

The tables above describe the implemented work. Production data paths remain typed Supabase reads and writes. Generated database types are untouched. No production fixture switch, fake customers, analytics or marketing campaign control was added.

The 21st/frontend/UI skills informed the review. Existing project primitives and the newly committed admin shell were reused. No 21st search/generation or external review was invoked because this task explicitly prohibited contacting external services.

## Remaining operational risks and handoff requirements

1. Verify RLS, anonymous RPC privileges, account creation restrictions and authoritative price/quantity/time/status validation in an isolated backend first. Client validation is not a security boundary. Review possible anonymous `upsert_customer` access and review-job permissions.
2. Prove idempotency and notification delivery under timeouts/retries, validate email contents, and establish failure monitoring. A saved request is not proof of email delivery or staff acceptance. Status changes do not claim to notify customers.
3. SESSION_CONTEXT says pilot owner notifications go to Christiaan rather than the restaurant inbox. Confirm the handoff decision explicitly. No recipient changed here.
4. Confirm delivery availability/area/fees and table-service process before promoting those modes. They remain existing request modes with caveats; collection is the primary offer. No fulfilment guarantees were invented.
5. Sunday Coffee & Cars dates are not configured. Customers must contact staff; no invented availability or allocation engine.
6. Request forms keep optional marketing consent false and explain operational use. This short explanation is not a complete privacy policy or legal assurance. Obtain approved processing notice covering responsible party/contact, purposes, recipients/operators, retention, access/correction/deletion channels and transfers. Separately decide optional marketing consent, withdrawal and suppression, consent evidence/versioning and whether/how review requests may be sent. Audit the existing review job before handoff. No tracking added.
7. Agree a small analytics vocabulary later: menu_view, booking_started, booking_completed, order_started, order_completed, whatsapp_clicked, directions_clicked. Decide provider, notice and consent requirements before installation.
8. Tab storage holds cart quantities and request references only. Contact fields deliberately remain in memory. Browser storage disabled, another device or a new tab can bypass frontend duplicate protection. Refresh after either submission shows the prior reference and asks the customer to check with staff before explicitly starting another request. It does not reconstruct contact details or a downloadable receipt.
9. Search/counts are explicitly scoped to loaded records. Supabase server row caps may still limit load-more at high volumes; use backend pagination before scaling. Manual refresh is intentional; staff must refresh during service.
10. Large animation bundle remains; avoid a dependency rewrite solely to silence the warning. CDN fonts were blocked in isolated browser checks, so screenshots use fallback fonts.

## Safe demonstration and verification fixtures

`tests/browser-fixtures.js` is a Playwright CLI script, outside the app import graph and build. It installs route interception in a disposable localhost browser, mocks Supabase auth/reads/writes, blocks every other external request and makes outbound contact links inert. Fictional names use example.com and blank phone contacts. Every screen carries a visible Demo data banner. It cannot be activated by a production URL, build flag or query parameter.

Start the local server on port 5177, open `about:blank` with `playwright-cli -s=jimmys-audit open about:blank --browser=chromium`, then run `playwright-cli -s=jimmys-audit run-code --filename=tests/browser-fixtures.js`. Close this disposable session after recording. Never browse the production site in it or seed Supabase. Restart fixtures for fresh state. This simulates the interface only, not backend integration.

Run business logic tests with `node tests/operations.test.mjs`; the script uses the existing TypeScript compiler and Node test runner, with no added framework.

## Recommended video journey

1. Display the Demo data indicator and explain the demonstration is isolated.
2. Briefly show the public menu, add a collection order, adjust quantities and choose a requested time.
3. Show saved-request confirmation/reference and PDF. Explain that the restaurant still confirms timing.
4. Open staff Today, inspect the open queue, search an order and progress accepted → preparing → ready → completed, showing the final confirmation safeguard.
5. Open an upcoming booking, inspect party/time/notes, confirm it and show contact actions without sending messages.
6. Show the customer interaction record and finish at the phone-sized staff dashboard. Explain future review follow-up as an external workflow awaiting handoff checks, not as a verified live action in this recording.

## Reusable-client / onboarding checklist

- Confirm venue identity, hours/time zone, event exceptions, actual menu prices/options, collection process and contact details.
- Agree enabled request modes and disable unsupported modes for each client.
- Provision an isolated backend and administrator; audit least privilege and anonymous writes before launch.
- Verify server totals, idempotency, status transitions, retention and backups.
- Confirm restaurant notification recipients, email sender, rendered messages, delivery/error monitoring and review-request rules.
- Approve processing notice and any separate marketing opt-in/withdrawal process; decide analytics explicitly.
- Train staff on pending requests, acceptance, ready/completed meaning, customer contact, refresh, conflicts and end-of-day checks.
- Test mobile/tablet/desktop, keyboard, slow/offline states and PDFs using isolated fixtures, then perform an explicitly authorised staging integration test.
- Confirm deployment environment variables and owner handoff without exposing secrets.

## Verification record

- `npm run check`, `npm run build`, `npm run lint`; baseline lint was clean. Seven Node/TypeScript business-logic tests passed.
- All four admin routes checked at 390, 820 and 1440px with no horizontal overflow. Public ordering/checkout and booking inspected at 390 and 1440px. Mobile dashboard wrapping was corrected after visual inspection.
- Isolated browser tests exercised search, status progression, terminal confirmation/dismissal, booking confirmation, refresh loading/error/empty/populated states, concurrent status conflict, and keyboard focus.
- Customer tests exercised invalid email and trading time, Sunday rejection, cart persistence, single-request double-click handling, simulated successful order/booking inserts, pending confirmation, receipt downloads and uncertain-order refresh protection. No production writes or notifications occurred.
- Compressed PDF validation: 30 burger lines and R3000 retained across two pages; booking PDF contains pending/not-confirmed wording. Both downloaded through the browser. Dedicated PDF visual rendering was not available locally; long arbitrary address/contact wrapping remains a limitation.
- Public reduced-motion check: Lenis absent and zero running infinite animations. Normal public startup completes; unauthenticated admin redirects to login. Separate normal browser context contains no fixture banner or controls. Fixture strings absent from production JS.
- External fonts were intentionally blocked, so screenshots use fallback fonts. These checks do not establish production RLS, email delivery or live availability.
- Existing unrelated `.gitignore`, browser artifacts, AGENTS.md and ongoing BrandIntro/BurgerAssembly/route-hold changes were preserved. No commit, push or deployment.

## Files changed in this pass

- Public routing/build/styles: `src/App.tsx` (lazy boundaries only), `vite.config.ts`, `src/index.css`.
- Customer workflows/config: `src/config.ts`, `src/pages/Order.tsx`, `src/pages/Booking.tsx`.
- Shared customer logic: `src/lib/cartStore.ts`, `src/lib/tradingHours.ts`, `src/lib/sessionDraft.ts`, `src/lib/orderMessage.ts`, `src/lib/supabase.ts` (comment only).
- PDFs: `src/lib/generateOrderReceipt.ts`, `src/lib/generateBookingConfirmation.ts`, `src/lib/generateMenuPdf.ts`.
- Staff UI: `src/pages/admin/AdminOrders.tsx`, `AdminBookings.tsx`, `AdminCustomers.tsx`, `AdminDashboard.tsx`, `AdminGuard.tsx`, `AdminLayout.tsx`, `AdminLogin.tsx`, `AdminStates.tsx`, `AdminStatusBadge.tsx`, `AdminPageHeader.tsx`, `adminUtils.ts`.
- New staff helpers: `src/pages/admin/useAdminResource.ts`, `AdminRefresh.tsx`, `operations.ts`.
- Verification/documentation: `tests/operations.test.mjs`, `tests/browser-fixtures.js`, `RESTAURANT_DIRECT_AUDIT.md`.

Browser screenshots/downloads are local QA artifacts, not application assets. Existing untracked browser directories must not be staged with the product changes.
