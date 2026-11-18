# Restaurant Direct, Jimmy's pilot: Phase 0 findings and plan

Date: 2026-11-16. Read-only pass. Nothing was changed in the repo (this file is the only
write), in Supabase, in Vercel or in n8n. The approval gates on
`20260915130000_harden_public_writes.sql` and `supabase/seed/settings.jimmys.sql` are untouched.

Status of this document: a plan awaiting Christiaan's approval. Nothing below is built.

Legend: **VERIFIED** means checked today against the named system. **UNVERIFIED** means it
could not be checked, with the reason. Priorities: **P0** blocks the owner demo, **P1** blocks
a live pilot, **P2** later. `baseline.sql` is short for
`supabase/migrations/20260915000000_restaurant_direct_baseline.sql`.

---

## 1. What is true today

### Repo

| Fact | Evidence |
|---|---|
| Branch `master`, HEAD `a6ab728` "Add remaining approved menu photography", level with `origin/master` | `git status -sb`, `git log` |
| Working tree clean apart from two untracked files: `Restaurant_Direct_Jimmys_Build_Plan.md`, `Images/ai-menu/CODEX-BRIEF.md` | `git status --short` |
| Test suite green: 85 of 85 pass | `npm test` run today |
| No payment code of any kind. The only matches for "payment" are copy saying the request is not a payment receipt | `src/pages/Order.tsx:650`, `:711`; `src/core/config/copy.ts:132`; `src/pages/admin/AdminOrders.tsx:37` |
| No Edge Functions, no service worker, no web manifest, no sound, no push | `git ls-files`, grep; live `list_edge_functions` returned none |

### Vercel (VERIFIED)

| Fact | Evidence |
|---|---|
| Production deployment of project `jimmys-burger-bar` is `dpl_6qw2yBEGTVSFWQyRfXtgPTsNkGTX`, state READY, commit `a6ab728`, created 2026-09-29. **Deployed commit equals local HEAD.** | Vercel deployments list |
| Only domain is `jimmys-burger-bar.vercel.app`. No custom domain is attached | Vercel project domains |
| Environment variable names: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, **Production target only**. `VITE_TENANT` is not set (legacy exemption, `scripts/check-build.mjs:53`) | Vercel env list (values not read) |
| Preview deployments have no environment variables. The one branch preview (`restaurant-direct/phase-5-provisioning`) is in state ERROR | Vercel deployments list |
| A second project, `restaurant-direct-demo`, builds from the same repo and is also on `a6ab728` | Vercel projects list |
| A push to `master` redeploys both projects | `docs/NEW-RESTAURANT.md:129` and the two deployment histories |

### Supabase, Jimmy's project (VERIFIED)

**Migrations applied:** 26 entries, from `20260903125422 phase1_2_bookings_orders_customers`
to `20260929103922 trading_hours_and_late_reviews`. `harden_public_writes` is **not** in the list.

**`supabase/snapshot/compare.sql`:** 10 rows. Every one is explained by the unapplied
hardening migration, nothing else has drifted:

| Kind | Object | Problem |
|---|---|---|
| column_grant, table_grant | `bookings anon` | anon still holds table-wide INSERT |
| function | `create_order(...)` | live version has no rate limit or field bounds |
| function, 2x function_exec, trigger | `sanitise_booking_insert()`, `bookings.bookings_sanitise` | missing |
| 2x function_exec | `set_updated_at()` | anon and authenticated can still execute |
| table | `orders` | missing index `orders_created_at_idx` |

**`supabase/verify.sql`:** 11 ok, 6 failing:

| Check | Result |
|---|---|
| phone country code setting | missing (code falls back to 27) |
| trading hours setting | **missing: orders and bookings are not checked against opening hours** |
| the public has no table-wide privileges | fails: `bookings:INSERT` |
| the public can only insert booking form columns | fails |
| the public can only call create_order and lookup_request | fails: also `set_updated_at` |
| future tables and functions start closed | fails: defaults open to anon, authenticated and PUBLIC |

Settings keys present: `timezone`, `webhook.booking`, `webhook.order`, `webhook.review`. The
regenerated settings file has not been applied, as CLAUDE.md says.

**RLS and grants on the four tables asked about:**

| Table | RLS | Policies | anon | authenticated |
|---|---|---|---|---|
| `orders` | on | staff read, staff update (`is_staff()`) | none | select, insert, update |
| `bookings` | on | public insert (`check true`), staff read, staff update | **insert (table-wide)** | select, insert, update |
| `customers` | on | staff read | none | select |
| `menu_items` | on | none (reached only through `create_order`) | none | none |

**Staff and roles:** `staff` has `user_id, email, role, created_at` with a check for
`owner | manager | staff` (`baseline.sql:102-107`). Live: **1 auth user, 1 staff row, role
`owner`, domain gmail.com**. `is_staff()` is a plain membership test (`baseline.sql:257`), so
the role column is stored but **enforced nowhere**, in the database or in the UI. Zero users
have a verified two-factor authenticator and none of the 4 sessions is aal2.

**Realtime:** publication `supabase_realtime` exists with **no tables**. `orders` is not in it.

**Other live facts:** 50 menu items, all available. Cron job `jimmys-review-requests`
(`0 18 * * *`) active, 73 runs, all succeeded, last on 2026-11-15. 4 orders, 2 bookings,
2 customers, all on gmail.com addresses. Order statuses: 3 `new`, 1 `preparing`. Two of the
four are delivery orders. **The newest order (2026-10-22, collection) has sat in `new` for
25 days.** Advisors: leaked password protection is off; `pg_net` sits in the `public` schema;
`rls_auto_enable()` is executable by anon as SECURITY DEFINER (a platform helper that
`verify.sql` deliberately skips).

UNVERIFIED: whether public sign-up is switched off (an Auth dashboard setting, not readable
through SQL). Whether those 4 orders are tests or real guests (no way to tell from the data).

### n8n

| Fact | Status |
|---|---|
| Three workflows exist and are active: "Jimmy's — Order Notifications" (`qjJKQIaKTP1O4sMb`), "Jimmy's — Booking Notifications" (`tZ1QYuSsvBExNgfv`), "Jimmy's — Review Request" (`bSsF0uBdpmNX1QuL`). None edited since 2026-09-04 | VERIFIED (workflow search) |
| All three database webhooks point at host `dockerfile-1n82.onrender.com` | VERIFIED (live `app_settings`, paths not printed) |
| Last order webhook (2026-10-22) was answered with HTTP 200 | VERIFIED (`notification_log` joined to `net._http_response`) |
| Recipients | **UNVERIFIED.** The n8n connector refuses all three: "Workflow is not available in MCP". The Gmail connector also failed to authenticate, so inbox evidence was not available either. The 2026-09-04 handoff says owner copies go to a gmail.com address belonging to Christiaan, not to Jimmy's inbox, sent through a shared Streamline SMTP credential (gmail.com) |
| Recent failures | **UNVERIFIED** for the same reason. On the database side there is 1 logged send since logging began on 2026-09-09 and it succeeded. Bookings: none since logging began |

To close this, switch on "Available in MCP" for the three workflows (a setting change, so it
is Christiaan's to make) and Phase 0 can be completed with a read-only pass.

### Where the documents disagree (code and live state win)

| Source | Claim | Reality |
|---|---|---|
| `RESTAURANT_DIRECT_AUDIT.md` (2026-09-07) | "No automatic polling introduced", manual refresh | Stale. 30 second poll while visible, plus refresh on focus and reconnect (`useAdminResource.ts:13`, `:50-73`) |
| `RESTAURANT_DIRECT_AUDIT.md` | No proof of server-side price or status validation | Stale. `create_order` prices from `menu_items` (`baseline.sql:457-568`), status transitions are enforced by trigger (`:298`), and both were confirmed live |
| `SESSION_CONTEXT.md` (2026-09-04) | Any logged-in user can read and update everything | Stale. Policies now require `is_staff()` |
| `SESSION_CONTEXT.md` | Privacy and analytics "not started" | Still true. No privacy page, no analytics |
| Build plan, section 1 | "The live data adapter has no subscription implementation" | Correct, but the seam already exists: `DataAdapter.subscribe?` (`types.ts:152`), consumed at `useAdminResource.ts:76-81`, implemented only by the demo (`src/demo/adapter.ts:293`) |
| Build plan, section 2 | "Reuse the existing auth and MFA approach" | MFA is optional and unused: the guard only challenges accounts that already enrolled (`AdminGuard.tsx:42-45`), and nobody has |
| `CLAUDE.md`, Architecture | `ordering` and `reservations` are "OFF by default" | Stale for Jimmy's: both are `true` (`src/tenants/jimmys/config.ts:24-26`) |
| `CLAUDE.md` | Demo must never run on "jimmysburgerbar.co.za" | That domain is not attached to any project. The live site is the vercel.app address only |
| `docs/NEW-RESTAURANT.md:158` | Review emails pick orders by UTC date | Stale since migration `20260929120000` (48 hour window), which is applied live |
| `docs/NOTIFICATIONS.md:30` | Example reference `JB-7F3A9C21D4E5B6A0` | Stale format. Live references are `JB-MMDD-XXXXXX` |
| `CLAUDE.md` on the hardening migration and settings file | Not applied | Correct, confirmed today |

---

## 2. Capability matrix

| Capability | Repo evidence (file:line) | Live evidence | Gap | Priority | Files to touch |
|---|---|---|---|---|---|
| **Checkout** | Cart, guest form, slot validation, retry contract: `src/pages/Order.tsx:264` (send), `:312` (revalidate at submit), `:119-126` (uncertain stays uncertain); `src/core/data/supabaseAdapter.ts:14-50`; `src/core/data/submission.ts`. Server pricing, cut-offs and idempotent retry: `baseline.sql:457-568`. Hours trigger: `20260929120000…sql:57-85`. Copy says "you pay when you collect" (`Order.tsx:650`) | Deployed at `a6ab728`. `create_order` live is the pre-hardening version. Hours trigger is live but inert (no `trading_hours` setting) | Result is a request, not a paid order. All three fulfilment modes are on (`tenants/jimmys/config.ts:165`) and the server accepts any of them (`baseline.sql:60`), while the pilot is collection only. No minimum lead time. Unavailable items fail only at submit | P0 for the pay step, P1 for mode enforcement | `src/pages/Order.tsx`, `src/core/config/types.ts`, `src/core/config/copy.ts`, `src/core/data/types.ts`, `supabaseAdapter.ts`, `src/demo/adapter.ts`, new migration |
| **Payment** | None | No Edge Functions. `orders` has no payment column | Everything: signed checkout creation, ITN verification, payment state, expiry, late payment handling, refund record | P0 | new `supabase/functions/payfast/index.ts`, new migration, `Order.tsx`, `Track.tsx`, `src/lib/database.types.ts`, `tests/database.test.mjs`, `supabase/snapshot/*` (regenerated) |
| **Kitchen live updates** | 30s poll, focus and reconnect refresh: `src/pages/admin/useAdminResource.ts:13`, `:50-73`. Subscription seam: `types.ts:152`, `useAdminResource.ts:76-81`. Compare-and-set status writes: `supabaseAdapter.ts:225-235`. Server transition rules: `baseline.sql:298-328`. Queue and ticket: `AdminOrders.tsx:190-200`, `AdminWorkspace.tsx` | `supabase_realtime` has no tables. No realtime policies | No Supabase implementation of `subscribe`. No connection indicator. No large-text kitchen view | P0 for the subscribe call and publication, P1 for the rest | `supabaseAdapter.ts`, new migration (`alter publication`), later `AdminOrders.tsx`, `AdminRefresh.tsx` |
| **Alerts** | Email through pg_net and n8n, fired inside `create_order` at save time (`baseline.sql:553`), logged in `notification_log`, no retry. Booking trigger `baseline.sql:403` | Webhooks set, last send 200. Recipients UNVERIFIED | No sound, no push, no unaccepted-order timer or escalation. The email fires at creation, which for pay-first would announce unpaid orders. No retry of a failed send | P0 to move the send to "paid", P1 for sound and timer, P2 for push | new migration (move the send out of `create_order`), later `AdminOrders.tsx`, `AdminLayout.tsx`, a service worker and manifest if push passes the device test |
| **Roles** | `staff.role` with check constraint (`baseline.sql:102-107`). `is_staff()` membership only (`:257`). Policies `:718-734`. Login copy assumes one account (`AdminLogin.tsx:46`). Optional TOTP (`AdminMfa.tsx:28-75`, `AdminGuard.tsx:42-45`) | 1 staff row (`owner`), 0 MFA factors, 0 aal2 sessions | Roles are not enforced anywhere. A kitchen login would read every customer record. No staff management screen (add and remove is SQL). Departed-staff removal is manual | P1 | new migration (role helper, per-role policies), `AdminLayout.tsx`, `AdminApp.tsx`, `AdminGuard.tsx`, `tests/database.test.mjs` |
| **Pause and availability** | `menu_items.available` is enforced at submit (`baseline.sql:141`, `:508`). Build-time switch only: `features.ordering` (`Order.tsx:356`). Refusal text "temporarily unavailable" is already classified (`submission.ts:76`) | 50 of 50 items available. No pause setting | No runtime pause. No staff control for an item. The menu seed sets `available = true` for everything in config (`src/core/menu/orderable.ts:87`), so a manual switch-off is wiped at the next menu change. The public menu is build-time config and cannot show "sold out" | P1 (a pause switch is a go-live condition in the plan) | new migration (pause setting, staff RPCs, one anon read RPC), `orderable.ts`, `supabase/verify.sql` (check 53 list), `Order.tsx`, `FoodDrinks.tsx`, an admin control |
| **Reporting** | Today and 7-day **order value**, explicitly not takings: `src/core/data/sales.ts:18-46`, `types.ts:85-95`, `supabaseAdapter.ts:204`, `AdminDashboard.tsx:84-100`. Optional comparison rate `types.ts:202-209` | 4 orders, none completed | No completed-order or commission report, no export, nothing tied to verified payment or refunds | P1 (P0 only if demo step 5 stays in the script) | new admin page, `supabaseAdapter.ts`, `types.ts`, `demo/adapter.ts`, `AdminApp.tsx`, `AdminLayout.tsx` |
| **Tenant provisioning** | `scripts/new-tenant.mjs`, `scripts/check-tenant.mjs`, `scripts/tenant-sql.mjs`, `scripts/lib/tenant-settings.mjs:104-109`, `scripts/check-build.mjs:54-112` (build refuses a Supabase URL that is not the tenant's own), `docs/NEW-RESTAURANT.md`, `tests/tenants.test.mjs`, `tests/database.test.mjs` (PGlite) | Two Vercel projects on one repo. Baseline proven equal to live on 2026-09-15; today only the hardening delta differs | No staging tenant. No payment settings in the tenant file. No Edge Function deploy step or secrets list in the runbook. PGlite harness has no stand-in for an ITN. Master fan-out means a merge deploys every project | P0 for a staging tenant, P1 for the runbook | `src/config.ts`, new `src/tenants/jimmys-staging/config.ts`, new `supabase/tenants/jimmys-staging.json`, `tenant.schema.json`, `tenant-settings.mjs`, `scripts/lib/check-tenant.mjs`, `docs/NEW-RESTAURANT.md` |
| **Review and privacy** | Nightly review job: `20260929120000…sql:88-133`. Consent is hard-coded false: `Order.tsx:325`, `Booking.tsx:173`. One sentence of notice at `Order.tsx:650`. No privacy route (`App.tsx:146-155`). No analytics | Cron active, 73 clean runs. 1 booking review request sent, 0 order requests. 0 customers with marketing consent | No privacy notice page. Review emails go to every completed order and confirmed booking with no opt-in or opt-out. No retention rule. No funnel analytics | P1 (decision first, see section 7) | new page and route, `Order.tsx`, `Booking.tsx`, `Footer.tsx`, possibly the review function |
| **Customer tracking** (supporting) | `src/pages/Track.tsx:77` (lookup by reference plus contact), steps `:17-21`. `lookup_request` `baseline.sql:570-631` | Deployed. anon may execute | Manual "Check status" only, no refresh. No payment state. `lookup_request` has no rate limit | P0 for payment state and auto-refresh | `Track.tsx`, new migration (`lookup_request` returns payment state) |
| **Order entry** (supporting) | "Order Online" in the hero and closing sections (`tenants/jimmys/sections.ts:19`, `:131`), menu page (`FoodDrinks.tsx:258`), nav overlay (`Navbar.tsx:142`, `:160`), footer (`Footer.tsx:44`) | Live | Already one tap from home and menu. Label says "Order Online", plan wants "Order for collection". Copy only | P2 | `tenants/jimmys/sections.ts`, `copy.ts` |

---

## 3. Top blockers

1. **There is no staging environment.** One production database, one production site and the
   fictional demo. Preview builds have no environment variables. Nothing in Phase 1 can be
   exercised safely until a staging Supabase project, a staging Vercel project and Payfast
   sandbox credentials exist (section 5).
2. **Payments do not exist in any form.** No server code path, no payment state, no function
   runtime in use. This is the whole of the first slice.
3. **The hardening gate sits in front of production payments.** A payments migration has to
   redefine `create_order` (the email send must move from "saved" to "paid"). The unapplied
   hardening migration also redefines `create_order`, and migrations build on each other in
   order. Staging is unaffected because it is built from scratch with all three. Jimmy's
   production cannot receive the payments migration until the hardening migration is approved
   and applied, or explicitly superseded. Until then, live anon can still insert a booking
   marked `confirmed` and can call `create_order` without limit.
4. **The database is not checking trading hours live.** The trigger is installed, the setting
   is not, so any time is accepted. This is behind the same approval gate.
5. **Nobody at Jimmy's can use the console, and nobody is working the queue.** One owner
   login on a gmail.com address, no second factor, roles unenforced, and four orders that
   never moved past `new` or `preparing`, the latest 25 days old. If the 22 October order was
   a real guest, it was missed.
6. **Notification recipients cannot be confirmed.** n8n blocks read access to all three
   workflows. The handoff says owner emails go to Christiaan, not to the restaurant.
7. **Delivery and table orders are live and unpoliced** while the pilot is collection only.
   Half of the orders in the database are delivery requests.
8. **No privacy notice, and review emails go out without consent.** A go-live decision, not
   a build problem.
9. **Target devices are unknown.** Push, sound and Home Screen install all depend on the POS
   machine's OS and browser and on the chef's phone.
10. **No stable public address.** Payfast return and notify URLs, QR codes and the Google and
    Instagram links should not be built on a vercel.app name that will change.

---

## 4. Decisions

### 4.1 Where payment code runs: Supabase Edge Functions, one per project

One function, `payfast`, with two routes, deployed to each restaurant's own Supabase project.

- `POST /payfast/checkout`: takes the order reference and the contact used. Loads the order
  with the service key, confirms it is still awaiting payment, and returns the signed Payfast
  form fields. The amount comes from `orders.total`, never from the browser.
- `POST /payfast/itn`: JWT check off (Payfast cannot send one). Verifies signature, source,
  merchant, reference and exact amount, confirms with Payfast server to server, then records
  the event and marks the order paid through one SQL function.

Why here and not Vercel functions or n8n:

- **Isolation matches the product.** A restaurant is a Supabase project. Its merchant secrets
  then live beside its data and nowhere else. A Vercel function would need the service key
  copied into Vercel, a second place to leak and a second place to rotate.
- **The site stays a static build.** `vercel.json` is a single SPA rewrite and the demo build
  is checked to contain no Supabase reference (`check-build.mjs`). Neither changes.
- **The plan rules out n8n for payment records,** and a shared instance with 180 workflows is
  the wrong home for a money path.
- **The secret never enters a `VITE_` variable or a tracked file.** Function secrets by name:
  `PAYFAST_MERCHANT_ID`, `PAYFAST_MERCHANT_KEY`, `PAYFAST_PASSPHRASE`, `PAYFAST_MODE`.

Rejected: signing in Postgres with `pgcrypto`. It would save one route but puts the
passphrase in a table that travels with every backup, and the ITN still needs an HTTP
endpoint, so the function exists either way.

UNVERIFIED: the exact Payfast field list, signature rule and ITN source check were not
fetched in this pass. They must be taken from the current Payfast documentation at build
time, not from memory.

### 4.2 Payment state: two columns on `orders` plus one append-only events table

| Piece | Shape | Why |
|---|---|---|
| `orders.payment_status` | `not_required` (default) \| `pending` \| `paid` \| `failed` \| `expired` \| `refund_pending` \| `refunded` | The queue, the status trigger, tracking and the report all need the current answer in one indexed place. A default of `not_required` means every existing row and every tenant without payments behaves exactly as today |
| `orders.paid_at` | timestamptz, null | Acknowledgement timer and reconciliation |
| `payment_events` | `id, order_id, provider, provider_payment_id, kind (payment \| refund), status, amount, raw jsonb, recorded_by, created_at`, unique on `(provider, provider_payment_id, status)` | Evidence and idempotency. A replayed ITN hits the unique key and becomes a no-op. Partial refunds are rows, not states. Manual refunds record who and when. RLS: staff read (manager and owner once roles exist), no public access, written only by the function |

Not a separate "payment attempts" table: with hosted checkout the order reference is the
merchant reference, and each customer attempt is told apart by Payfast's own transaction id
in the events table. Not columns alone: they cannot hold duplicates, out-of-order
notifications, partial refunds or the raw record needed to reconcile against Payfast.

Money stays `numeric(10,2)`, which is exact, and is compared for equality with the ITN
amount. A conversion to cents would touch every table, function and test for no gain.

### 4.3 Keeping unpaid orders out of the kitchen: three small guards, payment kept separate from fulfilment

Fulfilment status keeps its existing five steps. Payment is not added as a sixth status,
because that would rewrite the transition trigger, tracking steps, filters and types, and
the plan asks for the two to be separate.

1. **The queue filters.** `listOrders` active and today views add
   `payment_status in ('paid', 'not_required')`. The Today counts get the same filter.
2. **The database refuses.** The existing status trigger rejects `new → accepted` unless the
   order is `paid` or `not_required`. A modified client or a second screen cannot accept an
   unpaid order.
3. **Nothing announces it early.** The order email leaves `create_order` and is sent by the
   one function that marks an order paid (`pending → paid` where status is still `new`).
   That update is conditional, so it succeeds once, and the kitchen ticket, the email and
   the realtime signal all hang off that single success. Tenants without payments keep the
   send at save time.

Staff screens treat a realtime event only as a reason to re-read, so an unpaid insert
causes a refresh that shows nothing new.

Expiry: a `pg_cron` job every five minutes sets `pending` orders older than the agreed
window to `expired` and `cancelled`. A payment that lands after that is recorded as `paid`
on a cancelled order. It never reaches the queue (cancelled orders are not active) and it
appears in a "paid but cancelled, needs refund" list for the manager.

### 4.4 The off switch: a server setting per project, mirrored by a build flag

| Layer | Flag | Off means |
|---|---|---|
| Database (authority) | `app_settings` key `payments.provider`, generated by `npm run tenant:sql` from a new optional `payments` block in `supabase/tenants/<slug>.json`. Absent by default | `create_order` saves with `payment_status = 'not_required'` and sends the email at once, byte for byte today's behaviour. The function's checkout route refuses |
| Site (presentation) | `ordering.payment: 'on_collection' \| 'payfast'` in the tenant config, default `on_collection` | No pay step, today's confirmation screen and copy |
| Guard | `check-tenant` fails when the two disagree | A site cannot promise payment the server will not take, or the reverse |

Because each restaurant is its own Supabase project, a missing row is a complete off state
for that restaurant. The migration is additive, so it can be applied to every project
without changing behaviour anywhere the setting is absent. Secrets are never in the tenant
file, only the provider name and `sandbox` or `live`.

Staging is a **`jimmys-staging` tenant**: a config that spreads Jimmy's and turns payments
on (the same pattern as `src/demo/config.ts`), with its own
`supabase/tenants/jimmys-staging.json`. This is required, not cosmetic:
`check-build.mjs:54-88` fails any Vercel build whose Supabase URL is not the one in that
tenant's file, so a staging project cannot build as `jimmys`. It also proves the flag: the
`jimmys` tenant stays off while `jimmys-staging` is on, from the same commit.

---

## 5. Before Phase 1: what Christiaan must supply or create

**Staging Supabase project**
- [ ] A new project in the Streamline organisation (suggested name `jimmys-staging`, region as production). UNVERIFIED: whether the organisation's plan has room for another active project.
- [ ] Send the project ref (goes in `supabase/tenants/jimmys-staging.json`).
- [ ] Add a project-scoped MCP connection for it, as was done for `jimmys-supabase`, so migrations and the function can be applied from a session.
- [ ] Auth settings as the runbook says: public sign-up off, leaked password protection on.
- [ ] Two staff logins for the two-device demo (for example a till login and a chef login). Fictional addresses are fine.

**Staging Vercel project**
- [ ] New project from the same repo (suggested name `jimmys-staging`), production branch set to the Phase 1 working branch, not `master`, so a merge to master cannot publish half-built payment code and staging cannot publish to production.
- [ ] Environment variable names, Production and Preview: `VITE_TENANT`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`. Values from the staging project, entered in the dashboard.
- [ ] No client domain. It will carry a noindex tag.

**Payfast sandbox**
- [ ] A sandbox account at sandbox.payfast.co.za with a passphrase set.
- [ ] Merchant ID, merchant key and passphrase entered directly as Edge Function secrets on the **staging** Supabase project under the four names in 4.1. Do not paste them into chat, the repo or Vercel.

**Devices** (ask Jimmy's)
- [ ] POS computer: operating system and version, browser and version, whether a second window or a spare tablet is acceptable beside the till, whether it has speakers, whether it sleeps or locks.
- [ ] Chef's phone: make and model, OS version, default browser, whether it can install a Home Screen web app. iPhone needs iOS 16.4 or later for web push.
- [ ] The restaurant's connection: wifi or mobile data in the kitchen.

**Housekeeping that unblocks verification**
- [ ] Turn on "Available in MCP" for the three Jimmy's n8n workflows, so recipients and failures can be read.
- [ ] Say whether the four orders and two bookings in production are tests, and in particular the 22 October order.
- [ ] A test inbox for staging notifications, or agreement that staging runs with webhooks off for the first slice.

---

## 6. Smallest first slice for a two-device owner demo

Goal: on staging, a phone pays in the Payfast sandbox, one ticket appears on two logged-in
devices within a couple of seconds, staff accept and mark ready, and the customer's tracking
page follows. Fictional guest, sandbox money, no production change.

| # | Change | Files |
|---|---|---|
| 1 | Staging tenant: config spread, infra file, registration, noindex | `src/tenants/jimmys-staging/config.ts`, `supabase/tenants/jimmys-staging.json`, `src/config.ts`, `vite-plugin-tenant-html.ts` |
| 2 | One migration: `payment_status`, `paid_at`, `payment_events`; `create_order` reads `payments.provider`; `mark_order_paid()` (service role only) carrying the order email; status trigger guard; `lookup_request` returns payment state; expiry job; `orders` added to `supabase_realtime` | new `supabase/migrations/<ts>_payments.sql`, regenerated `supabase/snapshot/*`, `src/lib/database.types.ts` |
| 3 | Edge Function `payfast` with `checkout` and `itn` routes | new `supabase/functions/payfast/index.ts` |
| 4 | Checkout: when the tenant takes payment, after a saved order fetch the signed fields and hand off to Payfast. Return lands on tracking. Copy separates "payment received" from "accepted" | `src/pages/Order.tsx`, `src/core/config/types.ts`, `src/core/config/copy.ts`, `src/core/data/types.ts`, `supabaseAdapter.ts`, `src/demo/adapter.ts` (type parity only) |
| 5 | Tracking: payment line, and re-check every few seconds while a result is on screen | `src/pages/Track.tsx` |
| 6 | Queue: paid-only filter, "Paid" on the ticket, `subscribe` implemented with a realtime channel on `orders` (the hook already consumes it and polling stays as fallback) | `supabaseAdapter.ts`, `AdminOrders.tsx` |
| 7 | Settings generator and tenant check learn the optional `payments` block | `scripts/lib/tenant-settings.mjs`, `scripts/lib/check-tenant.mjs`, `supabase/tenants/tenant.schema.json` |
| 8 | Tests in the existing PGlite harness: flag off is unchanged; pending order cannot be accepted; mark paid works once; duplicate event is a no-op; wrong amount refused; late payment on an expired order stays out of the queue | `tests/database.test.mjs`, `tests/operations.test.mjs` |

Deliberately not in this slice: sound, timer and escalation, push, large-text kitchen mode,
roles, pause and item availability, the commission report, refunds UI, privacy page, any
change to production. Demo step 5 ("open the order report") needs the report, which is the
next slice; either build it second or drop step 5 from the first showing.

Order of work after the slice: (a) report and export, (b) pause switch and item
availability, (c) kitchen mode with sound, connection state and unaccepted timer, (d) roles,
(e) push if the device test passes, (f) second-tenant rehearsal.

---

## 7. Open product decisions for Christiaan

1. **Hardening migration and settings file.** Approve and schedule them before the pilot, or
   decide what replaces them. Payments cannot reach production ahead of this (blocker 3).
2. **The existing production rows.** Tests or real? If tests, approve deleting them before
   the pilot so reports start clean. If the 22 October order was real, it needs a follow-up.
3. **Collection only.** Turn delivery and table off on the live site now, and enforce
   enabled modes on the server? Recommended: yes to both.
4. **Pay-first only, or pay-first alongside pay on collection?** Recommended: pay-first only
   for online orders in the pilot, with WhatsApp as the unpaid fallback and labelled as such.
5. **Payment window.** How long an unpaid order holds before it expires (suggested 30
   minutes), and confirmation that a late payment is flagged for refund and never cooked.
6. **Acceptance.** Does a paid order still need a manual accept? How long may it sit before
   escalation, and to whom, by what channel?
7. **Collection timing.** Minimum lead time, whether to offer "next available" instead of a
   free time field, and any cap on orders per slot.
8. **Refunds.** Who may refund, within which hours, and who records it. Confirm Jimmy's
   does it in the Payfast dashboard for the pilot.
9. **Commission base.** VAT inclusive or exclusive, how refunds and cancellations net off,
   and whether the R999 or 15% comparison is per calendar month.
10. **Who gets the order email at pilot.** Jimmy's inbox, Christiaan, or both. The sending
    address is still a Streamline Gmail account.
11. **Logins and roles.** Which people need access, whether the kitchen may see customer
    records, and whether two-factor is mandatory for owner and manager.
12. **Pause.** Who may pause ordering, and whether "sold out" per item is needed for week
    one or only the whole-shop pause.
13. **Privacy and review emails.** Sign off a privacy notice, and decide whether review
    requests continue during the pilot without an opt-in.
14. **Menu options.** Sauces, patty and side choices have no approved specification (open
    since the September audit). Sell the pilot menu without them, or get the list first?
15. **Public address.** Which domain the ordering link, QR codes and Payfast URLs use.
16. **Staging cost.** A second Supabase project per pilot restaurant, if the plan charges for it.

---

## 8. What this pass did not cover

- n8n recipients, node contents and execution failures (connector access disabled per workflow).
- Inbox confirmation of any notification (Gmail connector failed to authenticate).
- Supabase Auth dashboard settings other than what the advisors report.
- Current Payfast documentation.
- A browser pass of the live site. Nothing visual was changed, so none was due.
- `AdminWorkspace.tsx`, `AdminBookings.tsx`, `Booking.tsx` and the demo modules were located by search, not read line by line.
