# Notifications: what the database sends to n8n

The database posts JSON to three webhook URLs stored in `public.app_settings`
(`webhook.order`, `webhook.booking`, `webhook.review`). Set them through
`supabase/tenants/<slug>.json` and `npm run tenant:sql`, never by editing SQL functions.

Sending uses `pg_net`: the request is queued when the order or booking is saved and sent
right after. **A slow or broken n8n never blocks or fails an order or a booking.** Every send
is recorded in `public.notification_log` with its `request_id`; delivery results are in
`net._http_response` for a few hours:

```sql
select l.created_at, l.kind, l.reference, r.status_code, r.error_msg
from public.notification_log l
left join net._http_response r on r.id = l.request_id
order by l.created_at desc
limit 20;
```

A webhook setting left empty means that notification is skipped and logged as
`skipped: webhook.<kind> not configured`.

## Order: `webhook.order`

Sent by `create_order` after the order and all its items are saved. A retried order with
the same reference is not sent again.

```json
{
  "order_no": "JB-7F3A9C21D4E5B6A0",
  "customer_name": "Guest name",
  "email": "guest@example.com",
  "phone": "082 000 0000",
  "order_type": "collection",
  "table_number": null,
  "delivery_address": null,
  "delivery_notes": null,
  "requested_time": "2026-09-15T16:00:00+00:00",
  "total": 275,
  "items": [
    { "name": "Smash Burger", "qty": 2, "unit_price": 100, "extras": [{ "name": "Extra Bacon", "price": 25 }] },
    { "name": "Coke", "qty": 1, "unit_price": 25, "extras": [] }
  ]
}
```

- `order_type` is `collection`, `delivery` or `table`.
- `requested_time` is UTC. Format it in the restaurant's timezone for the email.
- `total` and `unit_price` are the **menu** prices, as charged, not what the browser sent.
- `unit_price` is the **dish** price only. Each entry in `extras` is an add-on the guest chose
  ("Extra Bacon"), at the price the database charges for it, per unit. A line costs
  `qty * (unit_price + sum of extras.price)`, and `total` is the sum of the lines (plus the
  delivery fee on a paid delivery). `extras` is always present, an empty list when there are none.
  Added 2026-11-20 (migration `20261120120000_order_extras`); a template that predates it still
  shows the right `total` but not the extras until it lists them.
- The same shape is sent when a paid order's payment is confirmed (pay-first restaurants).

## Booking: `webhook.booking`

Sent when a booking request is saved. Every booking starts as `pending`: the email to the
guest must say it is a request, not a confirmation.

```json
{
  "name": "Guest name",
  "email": "guest@example.com",
  "phone": "082 000 0000",
  "guests": 4,
  "date": "2026-09-20",
  "time": "18:30:00",
  "seating": "Inside",
  "notes": "Birthday"
}
```

`date` and `time` are already the restaurant's local date and time.

## Review request: `webhook.review`

Sent by the nightly job (`pg_cron`, time from `reviewRequests.localTime`), at most once per
order or booking.

```json
{ "type": "order", "id": "uuid", "name": "Guest name", "email": "guest@example.com", "reference": "JB-7F3A9C21D4E5B6A0" }
{ "type": "booking", "id": "uuid", "name": "Guest name", "email": "guest@example.com", "reference": "2026-09-20" }
```

Each run asks every order marked **completed** in the last 48 hours that has not been asked
yet, so an order completed after the run (a late Friday) goes out the next evening, and one
missed run is caught up. Bookings qualify once **confirmed** and two hours past their time,
read in the restaurant's timezone. `review_sent_at` means nobody is ever asked twice. For
bookings, `reference` is the booking date.

Before migration `20260929120000` the order query matched `completed_at::date = current_date`
in UTC, so anything completed after the 20:00 run was never asked.

## n8n pitfalls this project has already hit

- **A field is only evaluated as an expression if its whole value starts with `=`.** Without
  it, guests receive the literal text `{{ $json.order_no }}`. Check the HTML body field.
- **An Email node replaces `$json` with the SMTP response.** In any node after the first
  email, read values with `$('Format').item.json.field`, not `$json.field`.
- **Respond to the webhook immediately** (a Respond node straight after the Webhook), so the
  database's request never waits on the SMTP server.
- Verify by reading a real received email, not by an n8n "success" status: the status was
  green while guests were getting template syntax.

## Branded emails

The order and booking n8n workflows keep their existing webhook paths, sender credential and staff-copy recipient. Both render the same HTML and plain text as the preview generator. The site origin comes from deployment configuration. The pay-first migration adds verified `paid_at` and the saved delivery fee to paid order webhooks.

The added `webhook.status` workflow receives one opaque ticket. It claims the recipient and immutable event from Supabase, renders it, sends via SMTP, then acknowledges with a separate receipt. The next event for the same order becomes eligible after that acknowledgement. The minute job retries unclaimed tickets. A replay cannot claim an email twice. An acknowledged row keeps its event key and timestamps and drops the address and message payload.

Review invitations use the existing nightly schedule. When the status and opt-out endpoints are configured they use the same queue. Opening the preferences link shows a confirmation form. Submitting it stores a suppression for the normalized address. The nightly selection and final claim both check suppression. Service emails continue.

### Configuration and recovery

- `supabase/tenants/<slug>.json` supplies `webhooks.status` and `reviewRequests.optOutUrl`. Regenerate the tenant SQL after changes. For the original collection schema, apply `20261120150000_notification_emails.sql`. Apply `20261120150100_payment_notification_emails.sql` when the payment infrastructure is present.
- Staging routes the update workflow to the test inbox. Its receipt rehearsal webhooks are separate from the production ones. Live order and booking guest copies follow the addresses used by the existing workflows.
- Check the age of the oldest queued and claimed messages. An ambiguous SMTP result stays claimed to protect against duplicate mail. Compare the recipient, order reference and subject with the sender’s Sent folder before recovering a held row. A verified delivery can be acknowledged by an operator with `finish_notification_email(receipt)`. If the provider confirms no delivery and the message is still current, clear the claim, receipt and posting timestamp for that single row. The minute job will post it again.
- For a pause, remove the `webhook.status` setting. Restore it to resume outstanding tickets. Order and booking receipt templates can be restored with the previous n8n workflow version. Review preferences continue to suppress opted-out guests in the legacy nightly path.
- `scripts/notification-workflows.mjs` exports `notificationCode(siteOrigin)`, `receiptWorkflow(currentExport, kind, code, options)`, `statusWorkflow(orderExport, code, options)` and `optOutWorkflow(options)`. Build from the current n8n exports to retain the sender credential and recipient expressions. Pass the project REST origin, publishable key, webhook path and public webhook origin as appropriate. The status worker uses only the project’s public key plus each private ticket. Rehearse in separate staging workflows with a fixed `testInbox`, then update the published live versions.

```sql
select seq, event_key, posted_at, claimed_at, sent_at
from public.notification_email_queue
where sent_at is null order by seq;
```
