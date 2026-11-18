# Restaurant Direct MVP status: Jimmy's collection ordering

**Verdict: MVP NOT done.** On staging, the core path works end to end today: a guest pays
on the Payfast sandbox, the order becomes paid within a second, and a lock-screen push goes
out once. What is missing: no single branch holds the whole MVP; the branch the staging site
runs (kitchen-push) carries a checkout-breaking bug in its Payfast function source; the
order report screen does not exist; and the kitchen half, the refund path and real-phone
checkout were not walked end to end.

Checked 2026-11-18, 08:20 to 08:40 SAST, by Claude (Opus 5.5) with a read-only Codex
(gpt-6.1-sol, high) bug hunt in parallel. No code fixed, nothing committed, pushed, merged
or deployed. Production was only read.

"MVP" here means the bar in `Restaurant_Direct_Jimmys_Build_Plan.md` sections 3 and 4:
Phases 1 to 3 evidence on staging, plus the two-minute owner demo. Phase 4 (live pilot) is
not part of the MVP and is tracked in `LAUNCH-CHECKLIST.md`.

## 1. Branch map

Linear stack on top of `master`, splitting into two at the tip. Nothing below `master` is merged.

| Branch | Tip | Ahead of master | Contains | Notes |
|---|---|---:|---|---|
| `master` | a6ab728 | 0 | Live site | Production Vercel `jimmys-burger-bar` serves a6ab728 |
| `restaurant-direct/collection-payments` | bd7e342 | 3 | Payfast backend, pay-first checkout, ordering controls | |
| `restaurant-direct/kitchen-screen` | 235637d | 4 | + kitchen screen, staff-only live signal | |
| `restaurant-direct/tenant-rehearsal` = `kitchen-live` | 05e2132 | 5 | + second-tenant rehearsal | **Has bug B1.** This worktree. `kitchen-live` worktree at `/tmp/jimmys-rehearsal-release` is marked prunable |
| `restaurant-direct/kitchen-push` | 301e4e7 | 10 | + opt-in lock-screen push | **Has bug B1.** Staging site runs 378e61c (tip minus a docs-only commit) |
| `restaurant-direct/delivery-preview` | f7579ca | 7 | + delivery preview, **and the B1 fix** | Does **not** contain kitchen-push |
| `phase-0-cleanup`, `phase-3-v1-gaps`, `phase-5-provisioning` | | 0 | | Already in master |

Deployed state:

| Where | What runs | Source |
|---|---|---|
| Staging site `jimmys-staging.vercel.app` | `kitchen-push` 378e61c, deploy `dpl_BHwXCZcicpSvvEvmqVByfuNfkCSo` | Vercel |
| Staging DB `cagcpwlzqpolojpgewtw` | 11 migrations including **both** `kitchen_push` and `delivery_preview(_status_transition)` | Supabase |
| Staging `payfast` function | v7. Works (checkout passed today), so it was not built from the B1 branches. Its deploy time is 20 s before the delivery-preview site deploy, so it was probably built from delivery-preview (timing-based guess) | Supabase |
| Staging `kitchen-push` function | v3 | Supabase |
| Production DB | 26 migrations, last `trading_hours_and_late_reviews`. No payment, kitchen, push or hardening migration. No `trading_hours` setting. No Edge Functions | Supabase, read only |

So staging is a mixture: site from one branch, database and payment function partly from
another. The deployed site has no delivery option (checked at 390 px).

## 2. Requirement table

Status key: **Verified** = done by hand today on staging; **Tests** = covered only by the
automated suite; **Earlier** = evidence from 17 Nov data or docs, not repeated today;
**Not done** = no evidence.

| # | Requirement (build plan) | Status | Evidence |
|---|---|---|---|
| 1 | Mobile guest checkout: menu, cart, time, details, pay, tracking | **Verified** (390 px Chromium, not a real phone) | Order `JB-1118-A32V7N`, R90. Checkout offered "Today, 09:00", no Sunday. *Before you pay* box showed address, time, R90 |
| 2 | Pay on Payfast sandbox; payment state from server notification only | **Verified** | Checkout event 08:29:41, ITN COMPLETE 08:30:12 (pf 3525888), `paid_at` 08:30:12. Tracking: "Payment received. Waiting for Jimmy's to accept your order." |
| 3 | Real iPhone and Android checkout, slow connection | **Not done** | |
| 4 | Closed hours refused | **Verified** | Sunday 12:00 → `requested time is outside trading hours` |
| 5 | Unavailable item / cut-off refused | **Verified** (cut-off); **Tests** (sold-out switch) | Breakfast Bun at 14:30 → `menu item not served at that time` |
| 6 | Price taken from server, not browser | **Verified** | Beef Burger at R1 → `menu price changed: Beef Burger` |
| 7 | Repeated submit / repeated checkout | **Verified** (paid case); **Tests** (pending case) | Repeat checkout of paid order → 400 `PAYMENT_NOT_PENDING` |
| 8 | Forged notification and foreign origin refused | **Verified** | Forged ITN → 400 `BAD_SIGNATURE`; checkout from another origin → 403 `BAD_ORIGIN` |
| 9 | Duplicate, late, out-of-order ITN; amount mismatch; expiry | **Tests** | `tests/payments.test.mjs` (7 tests). Expiry cron `restaurant-direct-payment-expiry` active on staging; no expired order exists there yet |
| 10 | A valid payment creates exactly one kitchen ticket | **Verified** (data); kitchen UI not seen | One `order_push` row, delivered 1, 0.6 s after payment; one `notification_log` row, written at payment time, none at order creation |
| 11 | Unpaid order cannot be fulfilled, even bypassing the UI | **Verified** | As `till@example.com` (rolled-back transaction): accept on failed-payment `JB-1117-SMX498` → `PAYMENT_REQUIRED` |
| 12 | Two devices cannot silently overwrite each other | **Verified** (database layer); **Tests** (UI message) | Same transaction: accept → 1 row; stale second update from `new` → 0 rows |
| 13 | Paid order on two devices with chime, accept with ETA, preparing, ready, collected | **Earlier**, not re-walked | No staff password available to Claude. Staging data shows accepted/ready/completed orders with ETAs from 17 Nov and a chef login at 17:19 SAST |
| 14 | Logged-out user cannot read orders or join the live signal | **Verified** | Publishable key: 10 tables → `42501 permission denied`; private `staff:orders` → `Unauthorized`; `/admin/kitchen` → `/admin/login` at 1440 px |
| 15 | Lock-screen push to the chef's phone | **Verified** (sent); arrival on the device not seen by Claude | `order_push.delivered = 1`, 1 subscription on staging. Android 10 / Chrome device proven per commit 378e61c |
| 16 | Lost internet, reconnect, stale data | **Tests** | "a failing or timed-out live signal never loses the order"; STAFF-SETUP offline section |
| 17 | Pause online orders | **Tests** | Not walked: switching it is a settings write, outside this pass's rules |
| 18 | Refund recorded and reconciled | **Tests** only | Staging has no owner/manager login, so `record_payment_refund` cannot run there (B5). `JB-1117-EQGAJ9` sits in `refund_pending` with nothing recorded |
| 19 | Completed-order / commission report | **Not done** (screen) | `collection_commission_report()` and its test exist; no screen or export. Task ab0d2779 |
| 20 | Order email to restaurant | **Verified as off on staging** | The one email check: `notification_log` says `skipped: webhook.order not configured`. Production routing untouched and not tested |
| 21 | Second-tenant rehearsal, no shared settings | **Earlier** | `REHEARSAL.md`: 34.1 min, local fixture only; real project isolation not proven |
| 22 | Owner demo script and launch checklist | **Exist**, untracked | `DEMO-SCRIPT.md`, `LAUNCH-CHECKLIST.md` (untracked in this worktree). Demo step 5 has no screen; step 6 cannot run on current staging (B3) |
| 23 | Production untouched, approval gates closed | **Verified** | See branch map. `harden_public_writes`, `settings.jimmys.sql`, payment/kitchen migrations all absent on production |

## 3. Automated test results

Run 2026-11-18 on each branch tip in its own worktree. All exit 0.

| Command | tenant-rehearsal 05e2132 | kitchen-push 301e4e7 | delivery-preview f7579ca |
|---|---|---|---|
| `npm run check` | pass | pass | pass |
| `npm test` | **116/116** | **125/125** | **126/126** |
| `npm run build` (includes production `check-build`) | pass, 26 files | pass | pass |
| `npm run build:demo` (demo `check-build`, Supabase-free) | pass, 24 files | pass | pass |
| `npm run check-tenant -- jimmys` | "passes every launch check" | pass | pass |
| `git diff --check master...HEAD` | clean | clean | clean |

Not run: `deno check` (Deno is not installed in WSL) and `npm run db:fingerprint` (it
rewrites the snapshot; the fingerprint test inside `npm test` passed instead).

**Gap:** all suites pass on branches that carry B1. No test runs the Payfast handler
(`supabase/functions/payfast/index.ts`); tests import only `verification.mjs`, and
`tests/tenants.test.mjs` reads `index.ts` as text.

`REHEARSAL.md` reports 125/125 for tenant-rehearsal; that count included kitchen-push tests
present in the shared worktree at the time. The committed branch has 116.

## 4. Hands-on results (staging, 2026-11-18)

Test data used: name `MVP Test Guest` / `MVP Probe`, `mvp-test-1@example.com`,
`mvp-probe@example.com`, `+27 00 000 0031/0032`. One order saved (`JB-1118-A32V7N`, paid, R90,
status `new`). All refusal probes saved nothing (0 rows checked afterwards). The two staff
updates ran inside a transaction that always rolls back; both orders were unchanged afterwards.

| Step | Result |
|---|---|
| Order page at 390 px, add Beef Burger, bar "1 item R90 · Checkout" | Pass |
| Checkout: next slot, Sunday omitted, no Delivery option, *Before you pay* box | Pass (no Delivery: see B3) |
| Pay R90, Payfast sandbox page with sandbox banner, Complete Payment | Pass |
| Return to `/track?ref=JB-1118-A32V7N`: "Payment received", PAID sticker | Pass; the status card starts below the first screen (observation O1) |
| Order pending before payment, `payment_expires_at` 30 min ahead | Pass (expires 08:59) |
| Push and email side effects | Push delivered to 1 device; email skipped (no webhook on staging) |
| Probes: closed day, cut-off, price, repeat checkout, origin, forged ITN, anon reads, anon channel | All refused as expected (section 2) |
| Staff accept on failed-payment order; stale second-device update | Refused / 0 rows |
| `/admin/kitchen` logged out at 1440 px | Redirects to `/admin/login` |
| Kitchen screen, two devices, accept/ready/collected, tracking update | **Not walked** (no staff password) |
| Pause, sold-out, refund, failed/cancelled payment in the UI | **Not walked** |

Browser console: one `400` on `auth/v1/token?grant_type=refresh_token` at page load (a stale
session in the test browser, no visible effect).

## 5. Bugs found

| ID | Sev | Where | Defect | Reproduction | Source |
|---|---|---|---|---|---|
| B1 | **P1** | `supabase/functions/payfast/index.ts:34` on `tenant-rehearsal`, `kitchen-live`, `kitchen-push` | `settingsMap['payments.site_url','payments.secret_names']` is a comma expression: it reads the secret-names JSON as the site URL, `new URL()` throws, every checkout and OPTIONS returns 503 `TEMPORARY_FAILURE` | Deploy the `payfast` function from any of those branches, then POST `/functions/v1/payfast/checkout` with a valid pending reference → 503. Fixed on `delivery-preview` (f7579ca, commit message says so). Staging works today only because its function was not built from these branches | Codex; confirmed by `git show` on all five branches |
| B2 | P2 | `src/pages/admin/AdminApp.tsx:50`, `src/core/data/supabaseAdapter.ts:299` | Kitchen route is not gated on the payment flag (unlike Ordering on line 51), and accepting always sends `eta`. Production has no `orders.eta` (`20261117120000_kitchen_eta.sql` not applied). Since a merge to `master` deploys production, merging before that migration leaves `/admin/kitchen` unable to accept: `42703 column "eta" ... does not exist` | Merge any kitchen branch to master with production schema unchanged; sign in; Orders → Kitchen screen; tap a time → error, retries keep failing. The plain Orders page path was not checked | Codex; confirmed in code and production migration list |
| B3 | P2 | Branch layout, staging | No branch has both kitchen-push and delivery-preview. Staging site = kitchen-push 378e61c, staging DB has both branches' migrations, the payfast function is from neither tip's line. Demo step 6 (delivery) cannot be shown: checkout has no Delivery choice | Open `/order` on staging, add an item, Checkout → only collection | Claude |
| B4 | P3 | Staging data | Four staging orders carry a real phone number and non-`@example.com` emails (`JB-1117-EYTUWW`, `-JVP44J`, `-NP9P4F`, `-KVGEU3`), against the test-data rule. Probably Christiaan's own device test. Not deleted (outside this pass) | `select order_no from orders where email not like '%@example.com'` on staging | Claude |
| B5 | P3 | Staging setup | Only `staff`-role logins exist (`till@`, `chef@`). `record_payment_refund` requires an owner/manager reviewer (`collection_payments.sql:196`), so the refund rehearsal cannot happen on staging | `select role from staff` → only `staff` | Claude |
| O1 | obs. | `/track` after Payfast return, 390 px | The lookup form fills the first screen; the "Payment received" card starts about 650 px down. The guest has to scroll to see that payment went through | Pay on staging at 390 px and look at the first screen | Claude |

| B6 | **P1** | `src/pages/admin/operations.ts:4`, `AdminKitchen.tsx:102` on `delivery-preview` | The rider step (`ready → out_for_delivery`) is offered on every tenant. Live Jimmy's takes delivery orders (production has two open) and its database refuses that step, so after a merge staff could not close a live delivery | On the pre-November schema: move a delivery order to ready, tap the next action → `illegal order status transition: ready -> out_for_delivery` | Codex merge review; confirmed in code and production data |

### Fix status (2026-11-18, later the same day)

On a new local worktree `../jimmys-burger-bar-mvp-release`, branch `restaurant-direct/mvp-release`
(from kitchen-push, with delivery-preview merged in). **Uncommitted, not pushed, not deployed.**

| Bug | State on mvp-release |
|---|---|
| B1 | Fixed by the merge (delivery-preview's fix). New test `payfast handler reads each setting by a single key`; checked that it flags the kitchen-push source |
| B2 | `advanceOrderStatus` sends `eta` only when the tenant is pay-first (`supabaseAdapter.ts`), following the existing "flag-off queries never name new columns" rule. No test (adapter has no unit seam) |
| B3 | kitchen-push + delivery-preview merged; 4 conflicts resolved keeping both sides; snapshot regenerated with `npm run db:fingerprint` |
| B6 | `deliveryRun` in `src/core/tenant.ts`; every `nextStatuses` caller and the kitchen's rider buttons use it. New test |

Checks on mvp-release: `npm run check`, `npm run build`, `npm run build:demo` pass; `npm test` 137/137, none
skipped; `check-tenant -- jimmys` passes. Codex read-only review of the merge: B6 was its only finding. Codex re-check of the B6 fix: no defects
(live and demo keep delivery tickets without the rider step; staging keeps it).
Not yet done: commit, redeploy staging (site plus both functions) and walk TEST-PLAN.md again.

Codex also confirmed B3-review.md's two defects (tilde encoding, trimmed ITN values) are fixed.
Full Codex output: `CODEX-MVP-HUNT.md`. Its scope was `master...tenant-rehearsal` only;
kitchen-push and delivery-preview commits were not hunted.

## 6. What is left

MVP (needed before calling the owner demo done):

1. Fix B1 on the kitchen-push line (cherry-pick the one-line fix from f7579ca) and add a test
   that runs the checkout handler, so a broken handler fails `npm test`.
2. Combine kitchen-push and delivery-preview into one release branch, check the migration order
   and the fingerprint, redeploy staging (site **and** both functions) from it, and walk the
   demo again (B3).
3. Walk the kitchen half on two real devices with the till and chef logins: chime, accept with
   time, preparing, ready, collected, guest tracking update, simultaneous tap (TaskHub e8a0f4d2).
4. Build the order report screen/export (TaskHub ab0d2779).
5. Add a manager login on staging and rehearse one refund end to end (B5).
6. Checkout on a real iPhone and Android, including a slow connection.
7. Before any demo: clear waiting paid tickets on staging (`JB-1117-EYTUWW`, `JB-1117-JVP44J`,
   `JB-1118-A32V7N` are paid and unaccepted, so the 20-second reminder will sound) and decide
   about B4.
8. Commit the untracked docs (`PHASE0.md`, `DEMO-SCRIPT.md`, `LAUNCH-CHECKLIST.md`,
   `MVP-STATUS.md`, `TEST-PLAN.md`, `CODEX-MVP-HUNT.md`, the build plan) and the
   `PAYMENTS.md` edit to a branch.

After MVP (Phase 4, owner-approved, see `LAUNCH-CHECKLIST.md`):

9. Release plan that avoids B2: apply the payment and kitchen migrations to production before
   the merge to master, or gate the kitchen route on `payFirst`.
10. Gated production changes, each approved separately: `harden_public_writes`,
    `settings.jimmys.sql`, the four payment/kitchen migrations, push migration.
11. Payfast function production enablement (code change, Codex review, deploy), live merchant
    secrets, order-email recipient, lock-screen push on the chef's actual phone (TaskHub 9ea9f480).
12. Delivery stays behind its flag until zone, fees and rider are agreed (TaskHub 263d6f5a).

## 7. Side effects of this pass

- One paid sandbox order on staging (`JB-1118-A32V7N`), sitting unaccepted in *To accept*.
- One lock-screen push was sent to the single subscribed staff device on staging. If that is
  Christiaan's phone, it buzzed at 08:30.
- Zero rows from the refusal probes. No settings, migrations, secrets or n8n touched.
- Files written: `MVP-STATUS.md`, `TEST-PLAN.md`, `CODEX-MVP-HUNT.md` (Codex), and a staging-state
  note at the top of `DEMO-SCRIPT.md`. Playwright snapshots went to the gitignored `.playwright-mcp/`.
