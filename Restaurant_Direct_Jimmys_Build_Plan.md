# Restaurant Direct — Jimmy’s pilot and rollout plan

**Streamline Automations · Build handoff · 16 November 2026**

## Decision

Ship one working collection-order flow at Jimmy’s using the existing site and staff console. Make the customer checkout mobile-first. Make the existing staff console work as a kitchen screen on the POS computer and as a staff web app on the chef’s phone. Use one shared codebase and provision an isolated Supabase project and Vercel deployment per restaurant through the existing tenant kit. Reassess consolidation after a second deployment exposes an actual maintenance or cost problem.

For the owner meeting, bring a staging demo with an end-to-end sandbox payment, a kitchen ticket and staff status changes. Treat that as proof of functionality. The proposed paid pilot is a separate decision. Jimmy’s has its own POS, so the kitchen screen starts alongside it. Staff record the already-paid sale in the till using the agreed payment method and record the order reference for reconciliation.

## 1. What the repository already gives us

| Area | What I found | What needs doing |
|---|---|---|
| Public site | React/Vite, existing Jimmy’s brand, tenant config, digital menu, cart, booking and tracking routes | Make the order path fast and obvious and keep the site’s visual identity |
| Collection checkout | The current order page saves a request through the existing adapter and shows a reference. It explicitly describes the result as a request | Add payment and explain requested, paid and accepted states separately |
| Admin | The responsive `/admin` console has an order queue, ticket view, booking tools, customer views and staff authentication. Current shared refresh code defaults to a 30-second poll while visible and refreshes on reconnect. The live data adapter inspected has no subscription implementation | Reuse the queue for a kitchen-focused mode. Add authenticated live updates, foreground sound, reconnect recovery and optional background phone alerts |
| Notifications | The documented database-to-n8n flow runs asynchronously via pg_net. The repo has order, booking and review workflows documented | Verify actual destinations and failures. Send actionable alerts for paid orders and add reliable retry/deduplication where needed |
| Tenant setup | `new-tenant`, `check-tenant`, `tenant:sql`, a separate demo build and a provisioning runbook are already in the repo | Turn the runbook into a repeatable release checklist with secure per-restaurant configuration and a measured second-tenant rehearsal |
| Live readiness | The attached handoff reports that live trading-hours settings and a hardening migration were pending. The repo describes a trading-hours trigger that depends on runtime settings | Verify applied migrations, server-side settings, actual enabled modes, staff access, ownership, workflow recipients and cron before changing anything in production |

**Evidence limits.** I reviewed the provided handoff and files on the GitHub default branch. I did not verify the deployed version or query the live Supabase, n8n or Vercel environments. The pasted handoff and repo docs disagree on some privacy, analytics and review status, and the current code supersedes the handoff’s manual-refresh claim. Ask Codex to verify those in Phase 0. Existing approved notification routing stays in place until Christiaan separately approves a production cutover.

## 2. Product and technical design

### Customer website and ordering web app

- Keep the existing restaurant homepage, menu, visit and tracking pages. Put one clear **Order for collection** action on the mobile homepage and menu. Direct links from Google, Instagram and QR codes should land in the ordering journey.
- Flow: browse menu → add and customise food → review cart → choose collection time → provide contact details → pay on Payfast → see payment and order status → collect.
- Guest checkout. Ask for details essential to fulfil the order and explain why they’re collected. Show the collection address, trading hours, availability, time and final amount before payment. Offer the next valid slot when appropriate. Preserve the cart on failed or interrupted checkout and make WhatsApp a clear fallback. A WhatsApp handoff must say what it does and should never represent itself as a paid order.
- Reuse the existing menu and database pricing logic. Agree authoritative item prices, modifiers, cutoff times and availability with Jimmy’s. Validate them at submission. Ship a way to pause online orders and mark key items unavailable on a busy shift. Keep full menu management in the existing setup workflow until repeated use justifies an editor.
- Keep the checkout quick on mobile. Avoid heavy homepage animation in the menu, cart and checkout path. Test on a real iPhone and Android, including a slow connection and a partially completed payment. Use a small funnel: menu view, cart started, checkout started, verified payment, order completed. Measure from server truth where possible and exclude contact details from analytics.
- Enable Home Screen installation for customers as an optional improvement. Keep the same link usable in a browser. Native Android and iOS releases are later stages after repeat ordering or a concrete in-app need. Reuse the same backend if those releases happen.

### Payments and commission

- Start with **Payfast hosted checkout on Jimmy’s own merchant account**. Jimmy’s receives funds, pays processing fees and handles authorised refunds. Streamline invoices independently from the reconciled completed-order report. Keep merchant secrets server-side in per-restaurant configuration.
- Reuse server-calculated order/item snapshots. Store monetary amounts in integer cents or a consistent exact numeric representation. Save a pending order/payment attempt with unique references before sending the customer to Payfast. Validate restaurant, mode, hours, availability, totals and references before payment starts. Treat a browser return as navigation. Change payment state after the server receives and validates Payfast’s ITN against its documented checks, expected reference, amount and provider transaction ID. Match retries to the original attempt. Handle duplicate, delayed and out-of-order notifications idempotently.
- Separate payment from fulfilment. Suggested payment states are unpaid/pending, paid, failed or expired, refund pending, refunded, with partial refunds represented separately. Fulfilment uses existing transitions where possible: new → accepted → preparing → ready → completed, with controlled cancellation. A paid order becomes actionable once. “Payment received” can precede “Jimmy’s accepted your order.” If a late payment arrives after expiry or cancellation, flag it for review and refund if required, with no accidental kitchen order. Customer copy must distinguish both states.
- Pilot refunds can be initiated by Jimmy’s manager in the merchant dashboard. Record reviewer, timestamp, amount and reference, reconcile to Payfast and show a pending state until confirmed. Avoid sending refunds twice. Agree who deals with paid orders that cannot be fulfilled and during which hours.
- Build a simple export or report that shows completed orders, food subtotal, delivery, refunds, payment and fulfilment states and monthly commission base. Calculate from completed direct food sales net of agreed refund adjustments, excluding delivery and tips. Agree whether food VAT is in the base before quoting. Keep new reporting separate from the admin’s existing dashboard totals, which currently summarise order values excluding cancelled rows, not verified revenue. Reconcile per-order records with Payfast and the till before using the report for billing.

### Restaurant admin on two devices

| Device or role | Pilot setup | Done when |
|---|---|---|
| POS computer | Pin the authenticated `/admin` orders view in Chrome/Edge as a dedicated window or desktop shortcut. Keep the existing POS usable next to it. Add a large-text kitchen queue, visible connection state and an **Enable sound / Test alert** button. Keep the orders screen visible during service or use a spare tablet if it would interfere with the till | New paid orders appear on the actual device during a test shift. Staff can accept, set or confirm an ETA, move through statuses and return to the POS |
| Chef’s phone | Use the same console in a mobile kitchen view with a named staff login. Add to Home Screen. Add opt-in Web Push if those phones and their browser setup support it. On iPhone, test the installed Home Screen web app and explicit permission | The chef sees the same queue and status on both devices. A locked-phone push works on the target device if enabled. If it fails, use the agreed foreground kitchen screen as primary and a separate staff fallback |
| Owner/manager | Give manager access to reconciliation, refunds workflow, hours/availability controls and staff management as required. Keep kitchen access focused on order details and statuses. Enforce permissions in Supabase/server-side. Reuse the existing auth and MFA approach, adjusting actual roles only after checking what policies currently enforce | Two staff users cannot overwrite one another’s action silently. An unauthorised login cannot read orders or perform updates. Access can be removed from a departed staff member |

Use authenticated Supabase Realtime with a tenant-appropriate access policy. Treat the event as a signal to re-fetch authoritative state. Re-fetch on reconnect, wake and focus, with the existing polling as fallback. Make acknowledgement/status changes atomic or conditional on the expected current status. If both devices see the same order, each shows its latest state and the kitchen only fulfils it once. An unaccepted paid order needs a visible timer and a named staff escalation route. Agree the fallback route during the rehearsal. Email is a backup channel. Verify recipient changes separately. Avoid storing sensitive staff data or order details in service-worker caches and lock-screen notification text.

### Delivery

- Launch collection first. Keep any existing delivery or table-order UI behind independently controlled tenant flags and enforce the enabled modes on the server. Preserve bookings as their own workflow.
- Design delivery as an extension of the same checkout. Attach a fulfilment record with restaurant, address, service zone, quoted fee, delivery window, dispatcher, provider reference and delivery status. Validate the address against the approved zone and operating hours before taking money. If the route is unavailable, show collection. If delivery fails after payment, follow the agreed refund or conversion procedure with the customer’s approval.
- For the first delivery rehearsal, use one short zone and manually dispatch to a verified rider or courier. Get all-in VAT-inclusive quotes for 3 km and 5 km, peak availability, wait fees and failed-drop terms. Earlier target prices were **R39 up to 3 km and R49 up to 5 km**, conditional on rider costs around **R35/R45 or less**. Keep rates provisional until real quotes and a Friday test. Commission applies to food under the proposed pricing. Checkout shows the delivery fee separately. Add API dispatch and tracking after the manual route proves reliable.

### Reproduce it for new restaurants

- Follow the existing design: **one repo, build-time tenant configuration, one restaurant’s deployment and isolated data per project**. Reuse the menu, checkout, tracking, payments, staff console and automated checks. Customise brand, domain, menu, fulfilment rules and credentials. Keep secrets and private webhook settings out of tracked files and public Vite variables.
- Separate provisioned data from code changes. Use the existing tenant scripts, a manifest of required inputs, an approved menu export and a versioned deployment checklist. Have one person onboard a second fictional restaurant end to end and log the actual time. Aim for **half a day after assets and merchant access are ready**, as a hypothesis to validate.
- Keep the existing isolated demo. Add a second tenant fixture that proves ordering, credentials, status alerts and manifests are independent. Confirm a Jimmy’s user and publishable API access cannot read another restaurant’s orders. Use compatible migrations and test a rollback or a flag-off path. Document how to hold a release back for other tenants, because the current shared production branch can redeploy multiple projects.
- Keep checkout, authoritative payment and order records outside n8n. Use n8n for async emails, escalation or reporting. Avoid a permanent workflow fork per restaurant. Start with the existing workflow pattern and extract reusable templates or a shared handler when the second tenant proves the payload is stable. Verify that any hosted commercial use fits the n8n licence and your provider plan.
- Before upgrading the $7 n8n host, watch CPU, memory, disk, workflow run times and backlog during a controlled staging test. Existing client workflows share that instance. Test that a delayed or failed notification leaves the paid order visible in the kitchen and retryable. Upgrade or move notification workloads when the measured bottleneck calls for it.
- Measure actual Supabase compute and hosting per restaurant, n8n CPU/memory and failures at peak, onboarding time and ongoing support. Compare the cost of isolated projects and separate deployments with the engineering cost of shared data only once this is live at more than one restaurant.

## 3. Build sequence and acceptance tests

| Phase | What to deliver | Evidence it is done |
|---|---|---|
| **0 — Verify history and live state** | Read current code, docs and migrations. Check deployed commit, feature flags, auth/RLS, notification destination and review/privacy status using available read-only access. Identify actual POS OS/browser, chef’s phone and available staging/sandbox | Written repo-versus-live matrix, top blockers and one scoped implementation plan. Live assumptions explicitly marked |
| **1 — Complete collection on staging** | Reuse menu/cart/order flow. Improve mobile entry and checkout. Add server-side collection availability/pausing, separate payment state, Payfast sandbox and commissionable-order report | Good path works on iPhone and Android. Closed hours, unavailable item, payment mismatch, failed checkout, repeated submit, duplicate ITN, late ITN and refund/reconciliation cases pass. A valid payment creates one kitchen ticket |
| **2 — Make it usable in the kitchen** | Reuse responsive admin and add live queue, audible foreground alert, role controls, phone quick access and recovery. Enable background phone notifications if the device test passes | A paid test order appears on two devices. Broadcast interruption, stale data, logout, duplicate alerts, simultaneous status updates and lost internet are tested. Staff can finish an order and reconcile it to the till |
| **3 — Rehearse a second restaurant and finish demo** | Run tenant scaffolding with fictional content, separate credentials and flags. Prepare Jimmy’s demo and proposal. Confirm measured onboarding time | No cross-tenant settings or data. Updated runbook. Staging walkthrough uses a sandbox payment and fictional customer data. Video/pitch claims match what works |
| **4 — Owner approval and limited live pilot** | Agree commercial terms and workflows. Decide who receives live alerts, who works the queue, who refunds and how direct sales are tallied. Address the previously gated migrations/settings with an explicit deployment plan and owner approval for going live | Staff trial passes on actual hardware. Approved menu, hours and staff accounts. Privacy and review handling decided. First controlled live collection order and appropriate refund or ledger reconciliation confirmed. Clear switch to pause checkout if service is disrupted |
| **5 — Delivery and rollout** | Confirm rider coverage, route costs and customer prices. Test one route and manual dispatch. Extend to a second paying restaurant when margins and support time support it | Test order arrives in acceptable condition/time at the quoted fee. Track delivery completion and issues. New tenant uses the same code and achieves a viable contribution after its costs |

Before production, verify the deployed hardening migration and Jimmy’s settings against the current database. The existing handoff specifically records an approval gate for `20260915130000_harden_public_writes.sql` and `settings.jimmys.sql`. Run equivalent checks on staging first and do not apply them live under this brief alone. Use an isolated preview, sandbox transactions and test inboxes. Record the deployment ID, schema version, proof of successful run and how you will disable new checkout without hiding already-paid orders.

## 4. What to take to Jimmy’s owner

**Open with:** “I’d like Jimmy’s to have its own online ordering link for collection. Customers can order and pay in a few taps. Your kitchen sees the ticket on the till computer and the chef’s phone, and you can send customers back to the same link every time.”

**Demo in about two minutes**

1. Open the mobile menu from the ordering link and add a burger or meal.
2. Pick collection, see the price and pay using the sandbox.
3. Show the paid order and amount on the kitchen screen and the phone.
4. Accept it and mark it ready. Show the customer’s tracking update.
5. Open the order report and show how the restaurant and Streamline can reconcile the month.

**Proposed commercial terms for discussion:** R0 upfront, **R999/month or 15% of completed direct food sales, whichever is higher**, with a 90-day review. This is the most recent working recommendation, subject to agreement. Jimmy’s pays Payfast through its own account and handles fulfilment and refunds. Collection is the first launch. Agree delivery scope and pricing separately once tested.

**Owner value.** The first offer gives regulars a direct collection link from Jimmy’s existing channels. Choose an actual basket and show the checkout on both channels, including any customer delivery fee. Base the comparison on the branch’s own Mr D order records. The direct option will be most useful where customers already know Jimmy’s and want to collect. Estimate platform savings only on comparable orders and quote them after accounting for payment and delivery costs.

**Ask the owner to confirm**

- Last 30 days of phone/WhatsApp collection count and food sales. Mr D order emails showed about R10k–R12.6k/month in accepted food orders over two months, which indicates existing marketplace activity. Direct collection volume and completed settlement totals are separate figures.
- Who will accept orders, how they prefer to handle busy periods, who can refund, and which POS payment method they’ll use.
- Whether the POS PC can run a browser window alongside the till. What phone the chef uses, who needs a login and who is the backup.
- Current menu, hours, kitchen capacity, how they will make ordering visible on Google/Instagram and in-store, and whether they already have a driver.
- Whether they approve the pilot price and how commission is defined and reconciled.

**Measure:** completed direct orders, food sales, average basket, median time to acknowledge, missed orders, refunds, delivery complaints if applicable, support hours and onboarding/setup time. At R276 per food order, R15k/month is around 55 orders and earns R2,250 at 15% before Streamline costs. Use **R15k/month direct and roughly one support hour per month** as initial rollout targets, then recalculate from the actual cost per tenant. Use pilot data for results claims after Jimmy’s approves the case study.

## 5. Copy-paste prompts

### Prompt A — Run this first in the Jimmy’s repo chat

> Act as the senior engineer preparing Jimmy’s Burger Bar for the first paid collection pilot of Restaurant Direct. Read AGENTS.md, CLAUDE.md, docs/NEW-RESTAURANT.md, docs/NOTIFICATIONS.md, RESTAURANT_DIRECT_AUDIT.md, DEMO.md and the current code, tests and migrations. Inspect Git status and HEAD without changing files. Verify live Vercel, Supabase and n8n state using read-only access where available. Record inaccessible checks as unverified. Inspect current order and booking submission, menu pricing and timing, admin polling/Realtime, staff auth/roles, customer tracking, notifications, payment code if any, review/privacy and feature flags. Reconcile the stale handoff with the actual repo. Treat production branch pushes as deploys. Preserve approved email routing and the approval gates on the Jimmy’s hardening migration and settings. No live writes or secret disclosure. Return a table with capability, repo evidence and file/line, staging/live evidence, gap, priority and proposed files to touch. Include what exists today, exactly what is required for a two-device owner demo, unresolved product decisions and the smallest first implementation slice. Stop after the plan for approval under the repo working rules.

### Prompt B — Give Codex after approving the collection implementation plan

> Using the approved Phase 0 plan and the Restaurant Direct handoff, implement the collection-only staging path in the existing Jimmy’s repo. Work on an isolated branch/preview. Reuse the existing tenant resolver, tenant config, design and order/track/admin components. Add or complete mobile guest checkout, server-side restaurant/mode/hours/menu/price validation and a pause control. Implement signed server-side payment creation with Payfast hosted sandbox checkout and verified ITN processing using current official docs. Keep restaurant secrets server-side. Persist exact order and payment amounts and separate payment from fulfilment. Handle duplicate submits, replayed or delayed ITNs, bad totals/signatures, provider retries, decline/expiry, late payment, and refund reconciliation. Payfast return must show verified status or waiting, and only a valid paid order becomes actionable in the kitchen. Keep existing bookings operational. Add a basic completed-order/commission report or export with food, delivery, refunds and status recorded separately. Keep the restaurant’s real brand and preserve its design requirements. Run existing checks plus focused regressions, then verify the full checkout and tracking on representative mobile and desktop browsers. Return code changes, test evidence, unresolved live tasks and rollback steps. Keep test traffic in staging/sandbox and leave production migrations and recipients alone.

### Prompt C — Give Codex for the POS computer and phone

> Extend the existing /admin orders UI for the kitchen. Inspect useAdminResource and the live data adapter first. Reuse the existing 30-second visible refresh and add authenticated live updates scoped to authorised staff. Fetch authoritative data on event, reconnect and visibility change. Show connection status, time since last successful refresh, distinct new/acknowledged orders, large actions for accept/creating ETA, preparing, ready and completed, foreground sound/test control and an unacknowledged-order escalation path. Keep writes atomic when two devices act at once. Make staff installation straightforward on the POS browser and phones, using a Home Screen web app where supported. Add background Web Push only if it can be validated on the intended device setup. Use generic lock-screen text and avoid caching private order data. Use named accounts and verify role behaviour server-side. Test a staged paid order on two devices, duplicate events, denied notification permission, locked phone behaviour, reconnect and simultaneous acceptance. Provide a one-page staff installation and shift checklist.

### Prompt D — Give Codex to rehearse replication and produce the owner demo

> Rehearse onboarding a second fictional restaurant using the existing tenant scripts, isolated environment and demo data. Measure setup time and list all manual steps, duplicate n8n work and likely per-tenant costs. Verify separate domains/config, data, staff, payment settings, notification destinations and feature flags. Document controlled rollout and rollback, including the production branch fan-out. Keep the current authorised Jimmy’s public branding and content. Prepare a two-minute Jimmy’s staging demo for the owner, one editable pilot summary and a one-page live launch checklist. Use sandbox payments, clearly marked fictional demo data and approval-dependent prices. Show the full order and staff flow and avoid claiming sales results. Leave delivery behind a flag until the restaurant has approved coverage and real pricing.

### Prompt E — Give Codex after the delivery pilot terms are agreed

> Extend the proven checkout using Jimmy’s approved delivery zone, fee, hours, minimum order if applicable, dispatcher and manual rider handoff. Price delivery server-side and present it before payment. Persist the delivery quote and collection/delivery mode alongside the order. Add a dispatch action and concise delivery statuses and preserve the collection path. On unavailable coverage or dispatcher failure, offer collection when practical or route paid cases to the agreed refund process. Test cutoff, out-of-zone, duplicate dispatch, no rider, delay, cancellation and successful drop-off. Confirm with a real supervised test before expanding the area. Keep platform commission based on the approved food subtotal and record delivery charges and fees separately.

## References

- [Current tenant provisioning runbook](https://github.com/streamline-autmations/jimmys-burger-bar/blob/master/docs/NEW-RESTAURANT.md)
- [Current checkout implementation](https://github.com/streamline-autmations/jimmys-burger-bar/blob/master/src/pages/Order.tsx)
- [Current staff refresh implementation](https://github.com/streamline-autmations/jimmys-burger-bar/blob/master/src/pages/admin/useAdminResource.ts)
- [Repository notifications guide](https://github.com/streamline-autmations/jimmys-burger-bar/blob/master/docs/NOTIFICATIONS.md)
- [Payfast developer documentation](https://developers.payfast.co.za/docs/itn-instant-transaction-notification/)
- [Payfast merchant refunds](https://payfast.io/features/merchant-refund/)
- [Supabase Realtime database subscriptions](https://supabase.com/docs/guides/realtime/subscribing-to-database-changes)
- [Chrome web app installation](https://support.google.com/chrome/answer/9658361)
- [WebKit iOS Home Screen Web Push requirements](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)
- [n8n licence guidance](https://support.n8n.io/article/can-i-use-your-license-for-my-use-case)
