# Collection payment API, staging Slice 1

**Staging status, 2026-11-17.** Applied to the staging project `cagcpwlzqpolojpgewtw` only:
all five migrations, `settings.jimmys-staging.sql`, `menu.jimmys-staging.sql`, and the
`payfast` function (version 4). The site is at https://jimmys-staging.vercel.app (noindex).
It does not deploy on push: redeploy the branch to the `jimmys-staging` Vercel project by hand.
Nothing here has touched production. PHASE0 section 4 governs architecture.

Proven on staging: order saved, signed checkout fields issued, hand-off to the Payfast
sandbox, and every refusal (closed hours, sold out, paused, tampered price, repeated
submit, forged notification). **Not yet proven: a real Payfast notification.** The sandbox
refused the hand-off because the stored `PAYFAST_MERCHANT_ID` is not an 8-digit ID. The
paid, failed and late-payment paths were exercised by calling `mark_order_paid` in SQL,
which is the database half only. Until a sandbox payment completes, the notification
source check (sender address is one Payfast's hosts resolve to) is untested against a
real sender.

Found by running on the real runtime, fixed in this branch: `Buffer` is not a global in
the Edge runtime, so every notification crashed with a 503 (Node tests could not see it);
the gateway sends `x-forwarded-for` as "sender, sender, edge", so the single-address check
refused everyone; `~` was not escaped and notification values were trimmed in the
signature string (Codex review, `B3-review.md`).

One Edge Function `payfast`, gateway JWT verification off (`supabase/config.toml`).
It refuses all projects except `cagcpwlzqpolojpgewtw` and all modes except sandbox.
Its checkout and ITN handlers supply their own authentication/verification.

`POST /functions/v1/payfast/checkout` (the brief's create-payment endpoint)
accepts JSON `{ "restaurant": "jimmys-staging", "reference": "JB-MMDD-XXXXXX",
"contact": "guest@example.com" }`. First save through existing `create_order`, using
its browser-generated reference and unchanged reference+email retry contract.
Contact is the order email. Never send an amount. Origin must match the server's
`payments.site_url`. OPTIONS supports that exact origin only.
Response: `{ action, method: "POST", fields, expires_at }`. Submit every field, in
returned order, to action using a hosted HTML form. The Payfast-required merchant key
is a checkout form field; passphrase and service role key never leave the server.
Never log form fields. The return/cancel URL is `/track`; the later UI must preserve
reference/contact locally. Browser redirects do not acknowledge payment.
Repeated checkout returns the same reference and deadline; a single checkout event
records the pending attempt. Per PHASE0, no separate attempts table is introduced.

`POST /functions/v1/payfast/itn` accepts Payfast form-urlencoded fields, max 16 KiB.
Checks all posted fields in original order (including empty fields) in the signature,
with the env passphrase, constant-time comparison and PHP URL encoding. Duplicate
keys are refused. Source must match IPv4 addresses resolved from the four Payfast
domains. Merchant ID, stored reference and exact cents must match. Transaction ID
must be numeric, status COMPLETE or CANCELLED. A TLS POST of the unsigned parameter
string to the sandbox validation URL must return exactly VALID. Only then can the
service-role RPC record the event and change payment truth atomically.

Documentation retrieved 2026-11-16 from the current JavaScript-backed documentation:
[signature](https://developers.payfast.co.za/docs#step_2_signature),
[ITN checks, payload and responses](https://developers.payfast.co.za/docs#step_4_confirm_payment).
That ITN section covers each signature, valid source/domain, amount and server validation
check. Exact amount equality is intentionally stricter than its one-cent tolerance example.
The server validation endpoint is `https://sandbox.payfast.co.za/eng/query/validate`.

Responses use `{error: CODE}`: BAD_SIGNATURE, BAD_SOURCE, BAD_MERCHANT, BAD_REFERENCE,
AMOUNT_MISMATCH, INVALID_AMOUNT, INVALID_STATUS, INVALID_PAYLOAD, BAD_ORIGIN,
PAYMENTS_DISABLED, PAYMENT_TENANT_MODE, PAYMENT_NOT_FOUND, PAYMENT_NOT_PENDING,
PAYMENT_COLLECTION_ONLY, PAYMENT_HOURS_UNCONFIGURED, PAYMENT_TIME_REQUIRED,
PAYMENT_CLOSED, PAYMENT_UNAVAILABLE, ORDERING_PAUSED, SERVER_CONFIGURATION,
STAGING_ONLY, SANDBOX_ONLY, SERVER_VALIDATION_FAILED. Validation failures return 400
(origin failures 403), wrong method 405, unknown route 404. Transient DB/network
failures return 503 TEMPORARY_FAILURE so Payfast can retry. ITNs return 200 only
after committed recording, including duplicate acknowledgements. No secret/error
objects are logged or returned.

Payment states: not_required (default), pending, paid, failed, expired, refund_pending,
refunded. Fulfilment states stay unchanged. pending expires in 30 minutes; a five-minute
cron is generated only for the staging payment tenant. COMPLETE after expiry,
cancellation or failure records paid but cancelled and payment_review_required. It
never emits a kitchen notification. Repeated or out-of-order notifications cannot
downgrade success. A different paid transaction on an already paid order is recorded
and flagged for reconciliation without a second ticket. Transaction ownership is unique
across orders, event statuses are deduplicated, and writes take an order lock.

`ordering.paused = true` refuses new payment creation and new payment-enabled orders.
It permits settlement of an already issued checkout. Do not disable payments.provider
to pause the shop. The server requires trading_hours to be configured when enabled.
Existing price/item validation stays in create_order and checkout rechecks availability.
The active/today staff queries and Today counts filter paid/not_required only when
ordering.payment is payfast. A server trigger blocks fulfilment of unpaid orders,
even if a client bypasses the queue. Realtime only signals a re-read; polling stays.
Flag-off queries never name new columns, allowing the existing production schema.

Staff-only `collection_commission_report()` returns completed collection (and, since the
delivery preview, delivery) orders: reference, restaurant-local month, food_subtotal,
delivery (the fee, zero for collection), confirmed refunds,
payment/fulfilment state and commission_base. Base is food total less confirmed
refunds, floored at zero. Cancelled orders are excluded and fully refunded rows have
zero base. No rate, minimum invoice or VAT adjustment is assumed. This is reconciliation
input pending commercial approval, not an approved invoice calculation.

**Delivery preview (staging only, migration `20261117150000_delivery_preview.sql`).** A
tenant with `ordering.deliveryPreview` gets a generated `delivery.zone` setting (suburbs
per fee band, delivery hours, optional minimum). Guests order through
`create_delivery_order`, which passes the suburb to the unchanged `create_order`; the
payment trigger refuses an unlisted suburb (DELIVERY_OUT_OF_ZONE), a time outside
delivery hours (DELIVERY_CLOSED) or a small order (DELIVERY_MINIMUM), then stores the
zone's fee in `orders.delivery_fee` and adds it to `total`. Any fee a client sends is
overwritten. `begin_payment` re-checks zone and hours (PAYMENT_DELIVERY_*), so Payfast
charges and the ITN check verifies food + fee with no change of their own. A delivery
moves ready → `out_for_delivery` → completed (a check constraint keeps that status off
other orders). A manager's `mark_delivery_failed(order_id)` cancels a paid delivery and
sets refund_pending with an audit event; the refund itself still goes through the
dashboard and `record_payment_refund`. The commission report now covers delivery orders,
with food (`total - delivery_fee`) and `delivery` in separate columns; the base is food
less confirmed refunds, refunds taken off food first. All fees are examples, to be agreed.

`record_payment_refund(reference, refund_id, amount, confirmed, reviewer)` is service-role
only, records evidence of a dashboard refund and never sends money. Reviewer must be
an owner/manager. Pending/confirmed events preserve partial amounts, actor and time;
retries are no-ops, changed amounts are refused, sums cannot exceed the order total.
No UI or automatic refund API is provided.

Sender address rule (measured on staging 2026-11-17 with spoofed requests): the gateway
discards a client-supplied `x-forwarded-for` and sends "sender, sender, edge"; Cloudflare
sets `cf-connecting-ip` and rejects requests that supply one. The function trusts the
first forwarded address only when it equals `cf-connecting-ip`. Anything else, a missing
header or a DNS failure fails closed. Re-measure before reusing this on another host.

Still to do on staging: correct the merchant ID secret, complete one sandbox payment and
read its notification in the function logs, create two staff logins, rehearse
payment/expiry/refund on two devices. Staging webhooks and review emails are off. Do not
change n8n. Never apply 20260915130000_harden_public_writes.sql or settings.jimmys.sql to
production under this task. No live enablement or production deploy is authorised.

Local verification: `npm run check`, `npm test` (111 tests), `npm run build`,
`npm run db:fingerprint`, and `deno check supabase/functions/payfast/index.ts`.
Payment tests cover paid once, duplicate/out-of-order ITNs, changed totals, expiry,
explicit cancellation, provider-ID reuse, repeated checkout, pause (including settings
regeneration), partial/full refunds, access controls and flag-off compatibility without
the gated migration. Fixture tests cover signature/encoding/order, source, merchant,
reference, exact amount and server confirmation failures. Home, menu, cart, checkout,
return and tracking were checked on staging at 1440, 768 and 390 pixels on 2026-11-17.
