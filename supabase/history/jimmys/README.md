# Jimmy's Burger Bar: migration history

Jimmy's Supabase project (`iqxxmvitbuxlpncpjzkx`) was built up one migration at a
time while the product took shape. Every one of these is already applied there, and
their end state is exactly `supabase/migrations/20260915000000_restaurant_direct_baseline.sql`.
On 2026-09-15 `supabase/snapshot/compare.sql` returned zero rows against the live
project, so the two match on every table, function, trigger, policy and grant.

**Do not re-apply anything here.** The files are kept for the reasoning in their
comments. A new restaurant uses the baseline instead.

Applied to the live project, in order:

| Version | Name |
|---|---|
| 20260903125422 | phase1_2_bookings_orders_customers |
| 20260903125458 | phase1_2_security_hardening |
| 20260903125515 | phase1_2_revoke_trigger_fn_execute |
| 20260903125600 | phase1_2_grants |
| 20260903125856 | phase2_create_order_rpc |
| 20260903135816 | phase4_booking_notification_trigger |
| 20260903135830 | phase4_order_notification_in_create_order |
| 20260904163125 | add_review_request_tracking |
| 20260904163222 | simplify_bookings_review_tracking |
| 20260904163308 | enable_pg_cron |
| 20260904173708 | review_request_scheduler |
| 20260904173723 | lock_down_internal_functions |
| 20260909090834 | add_staff_table_and_is_staff_helper |
| 20260909090933 | restrict_reads_and_writes_to_staff |
| 20260909091223 | tighten_function_execute_grants |
| 20260909092055 | add_order_sanity_checks_to_create_order |
| 20260909093302 | enforce_status_transitions_server_side |
| 20260909093345 | fix_status_trigger_caller_identity |
| 20260909093430 | throttle_anonymous_booking_inserts |
| 20260909093518 | add_app_settings_and_notification_log |
| 20260909093620 | wire_webhooks_to_settings_and_log |
| 20260914120423 | phase3_customer_links_idempotency_lookup (file here) |
| 20260914121105 | menu_items (file here) |
| 20260914121227 | create_order_price_authority (file here) |
| 20260914123817 | create_order_exact_prices (folded into the file above) |

Only the last four were written into the repo at the time; the earlier ones exist
only in the project's own migration history.

## Changing the database from now on

1. Add a new timestamped file to `supabase/migrations/`.
2. Apply it to **every** restaurant project, Jimmy's included.
3. Run `npm run db:fingerprint` and commit the updated snapshot.
4. Run `supabase/snapshot/compare.sql` against each project. Zero rows means it is in step.
