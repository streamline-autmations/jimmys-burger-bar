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
  "total": 225,
  "items": [
    { "name": "Smash Burger", "qty": 2, "unit_price": 100 },
    { "name": "Coke", "qty": 1, "unit_price": 25 }
  ]
}
```

- `order_type` is `collection`, `delivery` or `table`.
- `requested_time` is UTC. Format it in the restaurant's timezone for the email.
- `total` and `unit_price` are the **menu** prices, as charged, not what the browser sent.

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

Orders qualify once marked **completed** that day; bookings once **confirmed** and two
hours past their time. For bookings, `reference` is the booking date.

## n8n pitfalls this project has already hit

- **A field is only evaluated as an expression if its whole value starts with `=`.** Without
  it, guests receive the literal text `{{ $json.order_no }}`. Check the HTML body field.
- **An Email node replaces `$json` with the SMTP response.** In any node after the first
  email, read values with `$('Format').item.json.field`, not `$json.field`.
- **Respond to the webhook immediately** (a Respond node straight after the Webhook), so the
  database's request never waits on the SMTP server.
- Verify by reading a real received email, not by an n8n "success" status: the status was
  green while guests were getting template syntax.
