# Automatic messages for Jimmy's: plan

## Email rollout on 20 November 2026

Jimmy’s approved the branded emails and requested accepted, preparing and ready updates by email. The order and booking receipt workflows now render the shared templates. Staff copies use the existing recipient, Christiaan’s inbox. New status emails go to the saved guest address. Production uses the existing collection schema. Pay-first receipts, refund events and the delivery dispatch step are available with the corresponding payment and delivery features.

| Moment | Guest email |
|---|---|
| Order received | Request receipt, or payment receipt when the payment record is verified |
| Kitchen accepts or starts preparing | Acceptance with the saved ETA if present, then a preparation update |
| Kitchen marks ready | Collection instructions, table-order wording or ready-for-dispatch wording according to the order type |
| Delivery leaves, order completes or an eligible order is cancelled | The matching status and tracking reference |
| Refund pending or recorded | The amount on that individual refund event |
| Table booking requested, confirmed or cancelled | The matching booking details. The initial request still awaits confirmation. |
| Nightly review invitation | The Google review link and a working opt-out that stops future review invitations |

Run `npm run emails:preview` and open `notification-previews.local/index.html` for 18 examples. Each example has HTML, dark preview and plain text. Mail clients that honor the dark-mode rules show navy, warm white and gold. In-client color overrides can change the result.

The staging rehearsal delivered guest and staff receipts and the accepted, preparing, ready and completed sequence to Christiaan. The review preference form was exercised from its link through database suppression. Browser checks covered all 18 examples in both modes at 390px and 1440px. For configuration, recovery and workflow regeneration see [the notification runbook](../NOTIFICATIONS.md#branded-emails).

## Original planning notes

Sections 1 through 10 below are the pre-rollout research and channel proposal. The rollout above supersedes the original email matrix and workflow-access findings. WhatsApp is still a separate phase.

How to read the evidence tags used below:

- **VERIFIED (code)**: read in this repo today.
- **VERIFIED (Meta)**: read on Meta's own developer page today.
- **SECONDARY**: from a vendor or news article, not Meta or the provider. Treat as a guide only.
- **UNVERIFIED**: could not be checked. Needs an answer before it is relied on.

---

## 1. What is sent today

### 1.1 From the code (VERIFIED)

The database queues three kinds of JSON posts to n8n through `pg_net`. A failed send never blocks an order
or booking, and each send is logged in `notification_log` (`docs/NOTIFICATIONS.md`).

| Event | Trigger | Where in the code | Goes to |
|---|---|---|---|
| Order | Saved by `create_order` (orders that need no online payment), or at payment time by `mark_order_paid` (Payfast orders). `create_order` skips its own send when `payments.provider = payfast`. | `baseline.sql:548`, `20261116120000_collection_payments.sql:58,140` | `webhook.order` |
| Booking | `AFTER INSERT` on `bookings`, so only the **request** | `baseline.sql:403,693` | `webhook.booking` |
| Review request | Nightly `pg_cron` job at 20:00 local. Orders completed in the last 48 h, bookings confirmed and 2 h past their time. Once per order or booking. | `20260929120000_trading_hours_and_late_reviews.sql` | `webhook.review` |

The three webhooks point at `https://dockerfile-1n82.onrender.com/webhook/jimmys-order`, `-booking` and
`-review-request` (`supabase/tenants/jimmys.json`).

**There is no database send for any status change.** Accepted, preparing, ready, out for delivery, completed,
cancelled, refunded, and booking confirmed or cancelled all change a row and send nothing. The only guest-facing
signals for those are the `/track` page and the web-push alert below.

Other signals that are not email or WhatsApp (VERIFIED, code):

- **Guest web push** at `ready`, and at `out_for_delivery` for delivery (`20261119120000_guest_order_push.sql`).
  Opt-in per order on `/track`. No payload: the lock screen shows generic text. **Staging only today.**
- **Kitchen web push** on payment (`20261117140000_kitchen_push.sql`). **Staging only today.**
- **WhatsApp today is manual**: the guest taps a `wa.me` link that opens a chat to Jimmy's number with the order
  pre-filled (`src/lib/orderMessage.ts`). Nothing is sent by the system.

### 1.2 From n8n (read-only through the MCP): could not be read

The n8n MCP lists the three workflows, all active, created 2026-09-03/04 and **not edited since 2026-09-04**
(before pay-first, ETA, delivery and guest push existed):

| Workflow | ID |
|---|---|
| Jimmy's — Order Notifications | `qjJKQIaKTP1O4sMb` |
| Jimmy's — Booking Notifications | `tZ1QYuSsvBExNgfv` |
| Jimmy's — Review Request | `bSsF0uBdpmNX1QuL` |

`get_workflow_details` and `search_workflow_executions` both refuse all three: **"Workflow is not available in
MCP."** So I could not read the nodes, recipients, email text, SMTP credential or execution failures. This was
already recorded on 2026-11 in `PHASE0.md:104`.

What is therefore **UNVERIFIED**: who receives the order email (the 2026-09-04 handoff note in `PHASE0.md`
says a gmail.com address belonging to Christiaan, through a shared Streamline SMTP credential, not Jimmy's
inbox); whether guests also get a confirmation; what the subject and body say; whether any workflow handles a
failed SMTP send. The last known order webhook answer was HTTP 200 on 2026-10-22 (`PHASE0.md:103`).

To close this, someone with n8n access must turn on "Available in MCP" for the three workflows (that is a
setting change, so I did not do it), or export the three workflows as JSON.

---

## 2. The proposed message set

### 2.1 Principles

1. **Email is the record, WhatsApp is the live status.** Email carries receipts, cancellations, refunds, bookings
   and the review ask. WhatsApp carries only the moments a guest is actively waiting on. Sending every status on
   both channels is noise and double cost.
2. **Every message states only facts the database holds.** Order reference, items, total, requested time, the
   `eta` the kitchen chose, the address, opening hours, Jimmy's phone and WhatsApp number. No delivery
   promise, no refund timeline and no "usually ready in X minutes" unless Jimmy's supplies it.
3. **No marketing in any of these.** No upsell, no offer, no "order again" discount. A neutral "order again" link
   is a decision for section 6.
4. **One send per event, ever.** Use the same pattern already proven for guest push: a row per
   (order, event) as the dedupe key, so a status that goes back and forth sends nothing twice.

### 2.2 Order messages

Statuses are `new, accepted, preparing, ready, out_for_delivery (delivery only), completed, cancelled`. Payment
state is `not_required, pending, paid, failed, expired, refund_pending, refunded` (VERIFIED, code).

| # | Message | Trigger | Channel | Sent by | Content outline (facts only) |
|---|---|---|---|---|---|
| O1 | **Order received** (pay-first: **paid**) | `mark_order_paid` sets `paid_at` (pay-first), or `create_order` saves (no online payment). This is today's order webhook. | Email to guest. Same event also emails Jimmy's. | n8n today. | Reference (`JB-MMDD-XXXXXX`), items and quantities, total, order type, requested time (restaurant timezone), address for delivery. Pay-first: "Payment received. Waiting for Jimmy's to accept." Otherwise: "request received; Jimmy's will confirm". Link to `/track?ref=`. Jimmy's WhatsApp and phone. |
| O2 | **Accepted, with ready time** | `orders.status` new to `accepted` (the kitchen sets `eta` in the same update) | **WhatsApp** to guest (email optional) | New dispatcher | "Jimmy's has accepted order {ref}." If `eta` is set: "The kitchen expects it ready at {HH:mm}." If `eta` is null: send the same message without a time. Never invent one. Track link. |
| O3 | **Ready for collection** | `status` to `ready`, `order_type = collection` | **WhatsApp** (and web push, already built) | New dispatcher | "Order {ref} is ready to collect at 57 Loch Street, Meyerton." Today's closing time from `venue.hours`. Say nothing about how long it keeps. |
| O4 | **Out for delivery** | `status` to `out_for_delivery` | **WhatsApp** (and web push) | New dispatcher | "Order {ref} has left for {address}." Jimmy's phone for problems. No arrival time, because no ETA exists for the ride. |
| O5 | **Cancelled by Jimmy's** | `status` to `cancelled` where the order had been accepted or paid. Not for `expired` unpaid orders (see below). | **Email**, plus **WhatsApp** if the guest opted in | New dispatcher | "Order {ref} was cancelled." Whether it was paid. If paid, a pointer to the refund message. Jimmy's phone and WhatsApp. No reason text unless the kitchen types one. |
| O6 | **Refund recorded** | `payment_status` to `refund_pending` or `refunded` (`record_payment_refund`, `orders.refund_amount`) | **Email** | New dispatcher | Reference, refunded amount (`refund_amount`), "refund recorded by Jimmy's". **No timing promise**: the real timeline depends on Payfast and the guest's bank. PLACEHOLDER until Jimmy's confirms what to say. |
| O7 | **Delivery ready (before it leaves)** | `status` to `ready`, `order_type = delivery` | None by default | n/a | O4 covers it. Guest push already fires at `ready` for delivery, so a WhatsApp here is optional. |

Deliberately **not** sent:

- **`preparing`, `completed`** : no guest action follows. `completed` feeds the review request (R1).
- **`expired` / `failed` unpaid orders** : the guest abandoned the payment. A message would read as chasing
  them. The `/track` page already shows the state.
- **Table orders** : the guest is in the restaurant. Whether staff want a "ready" message is a decision (section 8).

### 2.3 Booking messages

Booking statuses are `pending, confirmed, cancelled` (VERIFIED, code). Every booking starts `pending`.

| # | Message | Trigger | Channel | Sent by | Content outline |
|---|---|---|---|---|---|
| B1 | **Booking request received** | `AFTER INSERT` on `bookings` (exists) | Email to guest, and to Jimmy's | n8n today | Date, time, party size, seating, notes. **Must say it is a request and not confirmed** (`docs/NOTIFICATIONS.md`). |
| B2 | **Booking confirmed** | `status` pending to `confirmed` (**does not exist today**) | **Email** and **WhatsApp** | New dispatcher | "Your table for {n} on {date} at {time} is confirmed." Address. Jimmy's phone to change it. |
| B3 | **Booking cancelled** | `status` to `cancelled` | Email, plus WhatsApp if opted in | New dispatcher | Same facts, "this booking is cancelled", Jimmy's phone and WhatsApp. |
| B4 | **Booking reminder** | New scheduled job: `confirmed` bookings, a fixed time before (timing is a decision) | **WhatsApp** | New `pg_cron` + dispatcher | Date, time, party size, address. "Reply to this chat or call to change it." |

A WhatsApp reply to B4 opens a 24-hour service window and lands in whichever inbox owns the number, so the
inbox question in section 4.3 matters for this message.

### 2.4 Review request

| # | Message | Trigger | Channel | Sent by | Content outline |
|---|---|---|---|---|---|
| R1 | **Review request** | Exists: nightly 20:00, order completed in last 48 h, or booking confirmed and 2 h past | **Email only** | n8n today | Thank-you and one link to Jimmy's Google reviews (`venue.googleReviews`, VERIFIED, `config.ts:98`). No incentive, no discount. |

Keep this off WhatsApp. A review ask is promotional in nature, so Meta would likely classify it as the
**marketing** category (about four times the utility rate, section 4.4) and it needs a different consent. See
section 6.

### 2.5 Summary: who gets what

| Moment | Email | WhatsApp | Web push |
|---|---|---|---|
| Order received / paid | Guest + Jimmy's | no | kitchen only |
| Accepted + ready time | optional | **yes** | no |
| Ready (collection) | no | **yes** | guest, opt-in |
| Out for delivery | no | **yes** | guest, opt-in |
| Cancelled | **yes** | if opted in | no |
| Refund recorded | **yes** | no | no |
| Booking requested | **yes** | no | no |
| Booking confirmed / cancelled | **yes** | **yes** | no |
| Booking reminder | no | **yes** | no |
| Review request | **yes** | no | no |

---

## 3. Architecture: what changes

Today the database only notifies on insert (and on payment). To send status messages it must also notify on
status change. Proposed shape, mirroring the guest-push design that is already built and tested:

1. A **`notification_outbox`** table, one row per (entity, event), primary key = dedupe. Written by a small
   trigger on `orders.status`, `orders.payment_status` and `bookings.status`, and by one `pg_cron` job for
   reminders.
2. The trigger posts the event to **one** new webhook (`webhook.status`) through `pg_net`, exactly as today.
   Failure never rolls back a kitchen action (the existing triggers already do this with
   `exception when others`).
3. A **dispatcher** receives the event and picks template and channel. The sender can be n8n or a Supabase Edge
   Function (the `kitchen-push` function is the in-repo precedent). See 4.5.
4. A **retry**: today there is none (`PHASE0.md:135`). The outbox row records `sent_at` and `failed_at`; a cron
   job re-queues unsent rows younger than a set age.
5. Opt-in flags (section 6) live on the order and booking, not only on the customer, so each message checks the
   consent given for that order.

This is a new migration. Per the repo rule it must be applied to every restaurant project and the fingerprint
regenerated. It must **not** touch `create_order` (the unapplied hardening migration also redefines it,
`CLAUDE.md`).

---

## 4. WhatsApp automation: research

All web sources were read 2026-11-20. Meta pages were fetched directly. Everything else is SECONDARY.

### 4.1 Business verification and templates

**Templates (SECONDARY, consistent across vendors):** every business-initiated message outside a customer's
24-hour window must be a pre-approved template, in one of three categories (utility, marketing,
authentication). Approval is reported as anywhere from minutes to 48 hours. Meta can re-categorise a template
that reads as marketing. Utility is the category for order and booking updates.
([Infobip template compliance](https://www.infobip.com/docs/whatsapp/compliance/template-compliance),
[Twilio WhatsApp key concepts](https://static1.twilio.com/docs/whatsapp/key-concepts),
[Courier guide](https://www.courier.com/guides/whatsapp-message-types))

**Business verification: UNVERIFIED.** Meta's Business Help Centre page on verification returned only its title,
so I could not confirm from Meta (a) whether verification is required to go live, (b) what documents it asks
for, or (c) what the messaging limits are before and after. Vendor guides say an unverified portfolio is limited
to about **250 unique customers per 24 hours** outside the service window and verification lifts that to about
2,000 ([Courier, SECONDARY](https://www.courier.com/guides/whatsapp-message-types)). For Jimmy's that limit would
not bind at 300 or 1,000 orders a month, but verification is still the safer route (see below). Practical
assumption to confirm with the chosen provider: verification needs the **registered business name and CIPC
registration**, and a website domain that matches. `config.privacy.operator` is still "to be confirmed" on the
live privacy page, so **Jimmy's legal entity is not on file**.

### 4.2 Opt-in

WhatsApp policy requires the guest to have opted in to receive business-initiated messages, and the opt-in
must name the business and the kind of message. I did not re-verify the policy wording on a Meta page today
(**UNVERIFIED this run**; it is long-standing policy that every provider repeats). Design for it regardless: a
separate, unticked checkbox at checkout, "Send my order updates on WhatsApp", and the same on the booking form.
Never reuse `marketing_consent`.

### 4.3 Keeping Jimmy's existing number (coexistence)

Meta calls this "WhatsApp Business app onboarding", often shortened to **coexistence**. **VERIFIED (Meta)**
from [Meta's onboarding page](https://developers.facebook.com/docs/whatsapp/embedded-signup/custom-flows/onboarding-business-app-users)
(no date shown on the page):

- A business can onboard "using their existing WhatsApp Business app account and phone number" and keep using the
  app for one-to-one chats; history is kept in sync.
- Needs **WhatsApp Business app version 2.24.17 or higher**. The number must already be on the **Business** app,
  not personal WhatsApp.
- It runs through **Embedded Signup, offered by a Solution Partner or Tech Provider**. So Christiaan would need
  a provider (section 4.5), not just a Meta developer app.
- Throughput for such a number is fixed at 20 messages a second: far above Jimmy's need.
- The number is **disconnected if the phone running the app is inactive for about 14 days.** This matters if
  Jimmy's phone sits unused over a quiet spell.
- After onboarding, **all linked companion devices are unlinked**, and WhatsApp for Windows is **not supported**.
  If the POS PC uses WhatsApp Web or Desktop, it stops working.
- Not supported on this number: group chats, disappearing messages, broadcast lists (become read-only), calls,
  and the app's own greeting, away messages and quick replies.
- Chat history syncs within a **24 hour** window at onboarding or the flow must be redone.
- Messages sent from the app stay free; only API messages are billed.

**Not found / UNVERIFIED:** whether **South Africa is supported** (the page lists no countries), and how long the
number must have been active. Ask the provider to confirm for a +27 number *before* committing. The page also
carries a banner that Embedded Signup v2 and v3 were to be deprecated on 2026-10-15; follow the provider's
current version.

**Fallback if coexistence is not available or Jimmy's cannot accept the limits:** register a **separate new
number** for automated messages on the Cloud API. Jimmy's keeps today's number and app untouched. Cost of this
route: guests see a second number; replies go to the API inbox, not the staff phone. The wa.me link on the site
would still point to the app number. (That a number moved onto the Cloud API without coexistence can no longer
be used in the app is widely stated by vendors but was not re-verified here.)

### 4.4 South African pricing

**VERIFIED (Meta)**, from [Meta's pricing page](https://developers.facebook.com/docs/whatsapp/pricing), which
states it reflects pricing "effective as of October 1, 2026":

- South Africa is a standalone market on the rate card. Its **utility and authentication rate was increased on
  2026-10-01** (the page lists no amount; amounts are in per-currency CSV/PDF rate cards that I did not fetch).
- **Utility templates sent inside an open 24-hour window are no longer free**: they became free on 2025-07-01
  and changed to regular pricing on 2026-10-01.
- **Free-form service replies in the window are no longer free either** (free since 2024-11-01), except a free
  tier of **1,000 delivered service messages a month per phone number**, which resets monthly. This tier does not
  cover templates.
- A guest arriving from a **click-to-WhatsApp ad** opens a window of up to 7 days with no charge for any message
  type. Not relevant unless Jimmy's runs those ads.
- Billing currencies on that page do **not include ZAR**: the list is USD, EUR, GBP and a dozen others. Budget in
  **USD**, converted at the day's rate. Whether VAT is added is **not stated**.

**SECONDARY, for the actual figure** (the only place I found numbers): after 1 October 2026 the South African
**utility rate is about US$0.0095 per delivered message**, and marketing about **US$0.0379**
([A2Z Tech](https://a2ztech.co.za/insights/a2z-insights-whatsapp-business-pricing-public-facing),
[Whautomate](https://whautomate.com/whatsapp-business-api-pricing-south-africa),
[Cellfind via ITWeb](https://www.itweb.co.za/office/cellfind/content/LPp6VMrBr1LMDKQz)). Older articles quote
R0.12 per message; that is the figure before the October increase and is stale
([MyBroadband](https://mybroadband.co.za/news/business/662921-big-change-coming-for-whatsapp-business-in-south-africa-where-every-reply-will-cost-12-cents.html)).
**Before quoting Jimmy's a price, open the USD rate card linked from Meta's pricing page and confirm 0.0095.**

### 4.5 Direct Cloud API or a provider

| | Direct to Meta (Cloud API) | Twilio | 360dialog |
|---|---|---|---|
| Per-message fee on top of Meta's | none | about US$0.005 (SECONDARY) | none |
| Fixed fee | none | none | about €49/month (SECONDARY; sources disagree and one listing shows €500) |
| Coexistence (keep the app number) | Per Meta, only through a Solution Partner or Tech Provider; **UNVERIFIED** whether a business can onboard itself | **UNVERIFIED** for this account and country | **UNVERIFIED** for this account and country |
| Template editor and inbox | Meta's WhatsApp Manager | Twilio console | 360dialog hub; no inbox by default |
| Setup effort | Highest: Meta developer app, tokens, webhooks | Medium | Medium |
| Fit with n8n | Built-in **WhatsApp Business Cloud** node: Send Template, Send, Send and Wait | HTTP Request node, or the Twilio node | HTTP Request node (it is a Cloud API proxy) |

Sources: [n8n WhatsApp node](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.whatsapp/),
[360dialog and Twilio comparison](https://ezcontact.ai/en/blog/whatsapp-api-pricing-comparison-meta-twilio-360dialog-ezcontact/),
[Twilio WhatsApp key concepts](https://static1.twilio.com/docs/whatsapp/key-concepts). Provider prices were not
checked on the provider's own pricing page.

**Recommendation:** at 300 to 1,000 orders a month a per-message provider (Twilio) costs less than a flat fee,
because the break-even against a flat licence is around 10,000 messages a month
([comparison, SECONDARY](https://ezcontact.ai/en/blog/whatsapp-api-pricing-comparison-meta-twilio-360dialog-ezcontact/)).
But the **real choice is driven by coexistence**: pick whichever provider confirms in writing that a +27 number
on the Business app can be onboarded with coexistence. If none can, use the separate-number fallback and then
direct Cloud API is the cheapest.

**Fit with n8n:** the sending nodes exist, so n8n can be the dispatcher. The concern is the host: the n8n at
`dockerfile-1n82.onrender.com` is a shared Streamline instance with about 180 workflows (`PHASE0.md`), and the
order alerts and kitchen flow must not depend on it being awake. Hosting uptime on that Render service was not
checked. See Phase 3 for the Edge Function alternative.

---

## 5. Email

### 5.1 Which sender

| | n8n Gmail / SMTP node (today) | Resend (or similar transactional service) |
|---|---|---|
| From address | `jimmysburgerbar1@gmail.com` or the shared Streamline account | `orders@<jimmys domain>` |
| Own domain needed | no | **yes** (to authenticate the sender) |
| Daily cap | Personal Gmail about 500/day (SECONDARY). Workspace 2,000 messages/day ([Google](https://knowledge.workspace.google.com/admin/gmail/gmail-sending-limits-in-google-workspace)) | Free: 3,000/month and **100/day**. Pro about US$20 for 50,000/month, no daily cap ([Resend pricing, SECONDARY](https://resend.com/pricing)) |
| Delivery tracking | none beyond the n8n run | bounces, complaints and opens in a dashboard, plus a webhook |
| Risk | Mail from a shared mailbox that also holds the guest's reply; a Gmail limit or suspension would stop every confirmation and the review ask | A second vendor |
| Where credentials live | n8n credential store | one API key as an Edge Function secret or n8n credential |

**Recommendation:** use **Resend** once Jimmy's has a domain, sent from a dedicated address. Until then keep the
n8n Gmail path for O1/B1/R1 and do not add new email types on a personal Gmail. Reasons: guest emails would come
from a name that matches the business, deliverability can be authenticated, and failures become visible.

### 5.2 Deliverability

- **SPF, DKIM and DMARC** require access to DNS for the sending domain. The live site is on
  `jimmys-burger-bar.vercel.app`; **`jimmysburgerbar.co.za` is not connected yet** (memory, 2026-11).
  UNVERIFIED: who owns and can edit that domain's DNS.
- A `gmail.com` From address cannot be authenticated by a third-party sender. Gmail and Yahoo require
  authentication for bulk senders; a Gmail-sent message carries Google's own authentication.
- Use a **subdomain** (for example `mail.<domain>`) for transactional sending so it cannot damage the main
  domain's reputation.
- Transactional email should contain **no promotional content**, so it stays out of promotional tabs and out of
  marketing law (section 5.3).

### 5.3 POPIA: transactional versus marketing

Read as a plain-language guide, **not legal advice**. Jimmy's should have it confirmed by whoever acts as
information officer.

- **Order and booking messages are the service the guest asked for.** Section 69 of POPIA, which governs
  unsolicited electronic **direct marketing**, applies when a message promotes or offers goods or services. A
  message that only confirms, updates or cancels what the guest ordered is not direct marketing. This is my
  reading; the sources I found did not address order confirmations directly
  ([MJK on s.69](https://mjkinc.co.za/popia/electronic-marketing-section-69),
  [Polity on the Regulator's guidance note](https://www.polity.org.za/article/direct-marketing-guidance-note-issued-but-only-the-future-will-tell-2024-12-06)).
- **A message that adds an offer becomes direct marketing.** Keep every message in section 2 free of offers so
  none of them needs marketing consent.
- **The review request is the grey area.** It asks the guest to do something for the business. Section 69(3)
  allows electronic marketing to **existing customers** of the same kind of product without prior consent, if
  the guest was given a chance to opt out when their details were collected and in every message. That requires
  an opt-out line in R1 and a notice at checkout. Today the site says "we may send one email asking how it was"
  (`Privacy.tsx`) but there is **no opt-out mechanism** and consent is hard-coded false (`Order.tsx`,
  `Booking.tsx`, `PHASE0.md:140`). Decision: add an opt-out, or make it opt-in.
- **WhatsApp opt-in is separate** from POPIA marketing consent (section 4.2). It must be asked and stored per
  order, with the date, so it can be shown if challenged.
- **Privacy page changes needed before launch:** name WhatsApp (Meta) and the email provider as recipients of
  name, phone, order details; say messages are sent outside South Africa; say how to stop WhatsApp updates (reply
  STOP; the provider can enforce it); keep "we do not send marketing".
- **What the message may carry.** WhatsApp and email travel through third parties and sit on lock screens. Keep
  items and totals in email, and keep WhatsApp to the reference, status and time. Do not put the guest's address
  in any lock-screen text.

---

## 6. Content and tone: placeholders Jimmy's must fill

Nothing below may be invented. Every item is either a database field or a PLACEHOLDER.

| Item | Source |
|---|---|
| Sender name and display name | "Jimmy's Burger Bar" (`venue.name`) |
| Address | `venue.address`, 57 Loch Street, Meyerton |
| Phone and WhatsApp | `+27 64 534 6143` (`venue.whatsapp`) |
| Hours in "ready" and cancellation | `venue.hours` |
| Ready time | `orders.eta` only |
| Refund wording and timeline | **PLACEHOLDER**: Jimmy's and Payfast to confirm |
| Cancellation reason | free text from the kitchen, or none |
| Google review link | `venue.googleReviews` |
| Reply handling | **PLACEHOLDER**: who answers a guest's WhatsApp reply, and when |
| Legal name, information officer | **PLACEHOLDER** (`config.privacy`) |
| Template language | English only; Afrikaans is a decision |

---

## 7. Phased build plan

The local email drafts above start the content work for Phase 1. Sender wiring, staging delivery and the later phases are pending.

**Phase 0: read and agree (no build). About 1 day.**
Open the three n8n workflows (or export JSON) and record who gets what today. Agree the message set in section 2
with Jimmy's. Resolve the open decisions in section 8 that block Phase 1.

**Phase 1: fix and extend email. About 3 days, no new vendor needed.**
Add B2 and B3 (booking confirmed, cancelled) and O5 (cancelled), plus O6 (refund) using the new outbox and a
`webhook.status`. Keep n8n and the current sender. Add a retry and a failure log. Send the order email to Jimmy's
own inbox. Add the opt-out line to R1. Update the privacy page. Staging first, using a test inbox, then live.
*Needs:* Jimmy's inbox address and the approved wording.

**Phase 2: own sending domain. About 1 to 2 days plus waiting on DNS.**
Connect the domain, add SPF, DKIM and DMARC for a mail subdomain, move the sender to Resend, send a real test and
read the delivered message in a real inbox (the n8n pitfalls in `docs/NOTIFICATIONS.md` were found this way).
*Needs:* DNS access to the domain; a Resend account.

**Phase 3: WhatsApp for orders. About 5 days build, plus Meta and provider lead time that is not in our control.**
Business verification, provider signup, coexistence check for the +27 number, template submission (O2, O3, O4,
O5), a WhatsApp opt-in checkbox on checkout, the dispatcher, a test with real numbers. Decide n8n versus an Edge
Function for the sender here: n8n is faster to build, an Edge Function does not depend on a shared host.
*Needs:* verification documents, provider decision, number decision (4.3), Jimmy's agreement to answer replies.

**Phase 4: bookings on WhatsApp and reminders. About 2 days.**
B2, B3 as WhatsApp templates; B4 with a `pg_cron` job; opt-in on the booking form.

**Phase 5: tune and measure. Ongoing.**
Weekly check of `notification_outbox` for failed and unsent rows; template rejections; opt-in rate; replies to
the WhatsApp number that nobody answered. Decide whether to add guest-facing templates in Afrikaans.

**Release rules:** every phase is built against staging only first (`jimmys-staging-supabase`). No live webhook is
changed and no migration goes to the live project without Christiaan's go-ahead. Ship-critical code (customer
messages, payments adjacency) gets a Codex review before it is called done.

---

## 8. Decisions and supplies

### 8.1 Christiaan decides

1. **Number:** keep Jimmy's number with coexistence, or register a separate new number for automated messages.
   (Blocked on the provider confirming South Africa support.)
2. **Provider:** Twilio, 360dialog or direct Cloud API. (Follows from 1.)
3. **Sender host:** n8n for the dispatcher, or a Supabase Edge Function.
4. **Review request:** keep it (with an opt-out line and an updated privacy page) or make it opt-in.
5. **Who pays:** Jimmy's pays the message and email fees directly, or Streamline bills them through. Pricing in
   section 9 is cost only, not a charge.
6. **Languages:** English only, or English and Afrikaans templates.

### 8.2 Jimmy's decides or supplies

1. Which messages they want (section 2), including **whether table orders get a "ready" message**.
2. **Booking reminder timing:** for example the morning of the day, or two hours before.
3. **Who answers WhatsApp replies**, during which hours, and who is the escalation.
4. The **inbox** for order emails (their own address, or Christiaan's as well).
5. **Business details for Meta verification:** registered business name, CIPC number, a proof document Meta
   accepts. **Legal name and information officer** for the privacy page.
6. **The domain** (`jimmysburgerbar.co.za` or another): who owns it, and who can edit DNS.
7. **Refund wording** and what they want to promise about timing, if anything.
8. Confirmation that the phone on the app is **opened at least every two weeks** (coexistence disconnects after
   about 14 days of inactivity), and that nothing on the POS PC uses WhatsApp Desktop or Web.

---

## 9. Monthly cost estimate

**Assumptions** (change them and the sums move):

- WhatsApp utility rate **US$0.0095 per message** (SECONDARY, section 4.4); **R18 per US$1** (an assumption; the
  rate card is in USD). VAT on Meta's fee is **not included** because the Meta page does not say.
- **2.5 WhatsApp messages per order** (accepted, ready, plus allowance for delivery and cancellations).
- Bookings are an assumption: **10 per 100 orders**, 2 WhatsApp messages each (confirmed, reminder).
- **About 2.1 emails per order** (receipt, review request, plus occasional cancellation or refund), **plus 1 copy
  to Jimmy's per order**, plus 3 per booking.
- Review and booking mails are not sent to guests who opted out. Opt-in rate is assumed 100% for the WhatsApp
  total, which is the worst case.

| | 300 orders / month | 1,000 orders / month |
|---|---|---|
| WhatsApp messages | 750 + 60 = **810** | 2,500 + 200 = **2,700** |
| Meta fee at US$0.0095 | US$7.70 = **about R140** | US$25.65 = **about R460** |
| Extra if Twilio (about US$0.005 per message) | + US$4.05 = + **R73** | + US$13.50 = + **R243** |
| Extra if 360dialog (about €49 a month) | + about **R990** flat | + about **R990** flat |
| Emails per month | about 1,050 | about 3,500 |
| Email sender | n8n Gmail, or Resend free (3,000/month, 100/day cap): **R0** | Resend Pro, about US$20 = **R360** |
| Domain | already budgeted elsewhere, `.co.za` registration not priced here | same |
| n8n hosting | existing shared instance, not priced | not priced |
| **Total, direct Cloud API** | **about R140** | **about R820** |
| **Total, Twilio** | **about R210** | **about R1,060** |
| **Total, 360dialog** | **about R1,130** | **about R1,810** |

Reading it: at these volumes the message cost is small. The two real costs are **the 360dialog flat fee** (not
worth it below about 10,000 messages a month) and **moving past the Resend free daily cap at around 1,000
orders**. The build effort (Phases 1 to 4, roughly 11 to 13 working days) is Streamline's, not a monthly cost.

What would change these figures: Jimmy's turning on delivery (an extra message per delivery order); using the
marketing category for anything (about four times the utility rate); a USD/ZAR move; VAT being added to Meta's
fee; Meta repricing again (its own page shows South Africa's utility rate changing on 2026-10-01, so the rate is not fixed).

---

## 10. Not verified in this plan

- The contents, recipients and failure history of the three n8n workflows (MCP refuses them).
- Meta's business verification rules, documents and limits (Meta's page returned no text).
- Whether coexistence works for a South African number, and with which provider.
- The Meta South African **dollar amount**: Meta's page confirms the October 2026 increase but the figure is
  only in secondary sources and the rate-card file I did not open.
- Whether VAT applies to Meta's fee, and the ZAR conversion path for billing.
- Twilio's and 360dialog's own current price pages.
- Meta's opt-in wording (stated from policy knowledge, not re-read).
- Legal advice on POPIA. This is a reading of public commentary.
- Who owns the domain, and whether the Render-hosted n8n has uptime guarantees.
