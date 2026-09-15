-- Harden what the public can write.
--
-- Found in review (2026-09-15), all present on Jimmy's live project:
--
-- 1. anon held table-wide INSERT on bookings under WITH CHECK (true), so a caller
--    could send status = 'confirmed' and an old created_at: a fake booking that
--    looks already confirmed and is invisible to the one-hour spam throttle.
-- 2. create_order had no rate limit, so the public key could create unlimited
--    correctly priced orders, each firing an email webhook.
-- 3. Supabase's default privileges still grant anon and authenticated full rights
--    on every FUTURE table and function in public, so the next migration that
--    forgets a revoke ships a hole.
-- 4. The set_updated_at trigger helper kept an anon EXECUTE grant it never needed.
--
-- Apply to every restaurant project, Jimmy's included, then run
-- npm run db:fingerprint and supabase/snapshot/compare.sql.

-- ---------------------------------------------------------------------------
-- 1. Bookings: the public may supply only what the booking form sends.
-- ---------------------------------------------------------------------------

revoke insert on table public.bookings from anon;
grant insert (id, name, email, phone, guests, booking_date, booking_time, seating_preference, notes, marketing_consent)
  on table public.bookings to anon;

-- Belt and braces for anything that bypasses the column grant (a future grant
-- change, a staff insert): server-owned columns are set here, and the request
-- itself is bounded the same way the booking form bounds it.
--
-- SECURITY INVOKER on purpose. Under SECURITY DEFINER, current_user is the
-- function's owner (postgres) for every caller, so the owner check below would
-- wave everyone through. This exact trap made the Phase 1 status triggers inert.
-- For the same reason it cannot call public.setting(), which the public may not
-- execute: the date bounds use UTC with a day of slack either side.
create or replace function public.sanitise_booking_insert()
returns trigger
language plpgsql
security invoker
set search_path to ''
as $function$
begin
  if current_user not in ('postgres', 'service_role', 'supabase_admin') then
    new.status := 'pending';
    new.created_at := now();
    new.updated_at := now();
    new.review_sent_at := null;

    if new.guests is null or new.guests < 1 or new.guests > 100
       or new.booking_date is null
       or new.booking_date < (now() at time zone 'UTC')::date - 1
       or new.booking_date > (now() at time zone 'UTC')::date + 367
       or length(coalesce(new.name, '')) not between 1 and 100
       or length(coalesce(new.email, '')) not between 3 and 254
       or length(coalesce(new.phone, '')) not between 6 and 30
       or length(coalesce(new.seating_preference, '')) > 50
       or length(coalesce(new.notes, '')) > 500 then
      raise log 'booking rejected: out-of-range request from % / %', new.email, new.phone;
      raise exception 'invalid booking request';
    end if;
  end if;
  return new;
end;
$function$;

revoke all on function public.sanitise_booking_insert() from public, anon, authenticated;

-- Runs before the throttle ("bookings_throttle") sees the row: triggers of the
-- same timing fire in name order, and "bookings_sanitise" sorts first.
create trigger bookings_sanitise before insert on public.bookings
  for each row execute function public.sanitise_booking_insert();

-- ---------------------------------------------------------------------------
-- 2. Orders: rate limit and field bounds inside create_order.
-- ---------------------------------------------------------------------------

create index if not exists orders_created_at_idx on public.orders using btree (created_at desc);

CREATE OR REPLACE FUNCTION public.create_order(p_order_no text, p_customer_name text, p_email text, p_phone text, p_order_type text, p_table_number text, p_delivery_address text, p_delivery_notes text, p_requested_time timestamp with time zone, p_total numeric, p_marketing_consent boolean, p_items jsonb)
 RETURNS TABLE(id uuid, order_no text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_order_id uuid; v_created_at timestamptz; v_item jsonb;
  v_computed numeric := 0; v_count int; v_qty int; v_price numeric;
  v_url text; v_req bigint; v_existing_email text;
  v_menu public.menu_items%rowtype; v_zone text; v_local_time time; v_lines jsonb := '[]'::jsonb;
  v_same_contact int; v_global int; v_phone_key text;
begin
  select o.id, o.created_at, o.email into v_order_id, v_created_at, v_existing_email
  from public.orders o where o.order_no = p_order_no;
  if v_order_id is not null then
    if lower(trim(v_existing_email)) = lower(trim(coalesce(p_email, ''))) then
      raise log 'create_order [%]: idempotent retry, returning existing order', p_order_no;
      return query select v_order_id, p_order_no, v_created_at;
      return;
    end if;
    raise log 'create_order rejected [%]: reference reused by a different contact', p_order_no;
    raise exception 'order reference already used';
  end if;

  -- The same bounds the checkout form applies. The public key can call this
  -- function directly, so the form is not the boundary.
  if length(coalesce(p_order_no, '')) not between 6 and 40
     or length(coalesce(p_customer_name, '')) not between 1 and 100
     or length(coalesce(p_email, '')) not between 3 and 254
     or length(coalesce(p_phone, '')) not between 6 and 30
     or length(coalesce(p_table_number, '')) > 10
     or length(coalesce(p_delivery_address, '')) > 250
     or length(coalesce(p_delivery_notes, '')) > 250 then
    raise log 'create_order rejected [%]: field out of range', p_order_no;
    raise exception 'invalid order details';
  end if;

  -- Rate limits, after the retry check so a genuine retry is never throttled.
  -- Deliberately generous: this stops a script, not a busy Friday.
  v_phone_key := public.normalise_phone(p_phone);
  select count(*) into v_same_contact
  from public.orders o
  where o.created_at > now() - interval '1 hour'
    and (lower(o.email) = lower(trim(coalesce(p_email, '')))
         or (v_phone_key is not null and public.normalise_phone(o.phone) = v_phone_key));
  if v_same_contact >= 5 then
    raise log 'create_order throttled [%]: contact already has % orders this hour', p_order_no, v_same_contact;
    raise exception 'too many orders from this contact. Please phone the restaurant.';
  end if;

  select count(*) into v_global from public.orders o where o.created_at > now() - interval '1 hour';
  if v_global >= 60 then
    raise log 'create_order throttled [%]: global rate % this hour', p_order_no, v_global;
    raise exception 'online ordering is temporarily unavailable. Please phone the restaurant.';
  end if;

  if p_requested_time is not null and p_requested_time < now() - interval '10 minutes' then
    raise log 'create_order rejected [%]: requested time % is in the past', p_order_no, p_requested_time;
    raise exception 'requested time is in the past';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'order must have at least one item';
  end if;

  v_count := jsonb_array_length(p_items);
  if v_count > 100 then
    raise log 'create_order rejected [%]: % item lines exceeds cap', p_order_no, v_count;
    raise exception 'too many item lines';
  end if;

  v_zone := coalesce(public.setting('timezone'), 'Africa/Johannesburg');
  v_local_time := (coalesce(p_requested_time, now()) at time zone v_zone)::time;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'qty')::int;
    v_price := (v_item->>'unit_price')::numeric;
    if v_qty is null or v_qty < 1 or v_qty > 99 then
      raise log 'create_order rejected [%]: qty % out of range for "%"', p_order_no, v_qty, v_item->>'name';
      raise exception 'invalid item quantity';
    end if;

    select * into v_menu from public.menu_items m where m.name = v_item->>'name';
    if v_menu.name is null or not v_menu.available then
      raise log 'create_order rejected [%]: "%" is not on the menu', p_order_no, v_item->>'name';
      raise exception 'menu item unavailable: %', v_item->>'name';
    end if;
    if v_price is null or v_price <> v_menu.price then
      raise log 'create_order rejected [%]: "%" sent at % but menu price is %', p_order_no, v_menu.name, v_price, v_menu.price;
      raise exception 'menu price changed: %', v_menu.name;
    end if;
    if v_menu.available_until is not null and v_local_time >= v_menu.available_until then
      raise log 'create_order rejected [%]: "%" not served at %', p_order_no, v_menu.name, v_local_time;
      raise exception 'menu item not served at that time: %', v_menu.name;
    end if;

    v_computed := v_computed + (v_qty * v_menu.price);
    v_lines := v_lines || jsonb_build_object('name', v_menu.name, 'qty', v_qty, 'unit_price', v_menu.price::float8);
  end loop;

  if p_total is null or p_total <> v_computed then
    raise log 'create_order rejected [%]: claimed total % but lines sum to %', p_order_no, p_total, v_computed;
    raise exception 'order total does not match its items';
  end if;

  if v_computed <= 0 or v_computed > 50000 then
    raise log 'create_order rejected [%]: total % out of range', p_order_no, v_computed;
    raise exception 'invalid order total';
  end if;

  insert into public.orders (
    order_no, customer_name, email, phone, order_type, table_number,
    delivery_address, delivery_notes, requested_time, total, marketing_consent
  ) values (
    p_order_no, p_customer_name, p_email, p_phone, p_order_type, p_table_number,
    p_delivery_address, p_delivery_notes, p_requested_time, v_computed, p_marketing_consent
  ) returning public.orders.id, public.orders.created_at into v_order_id, v_created_at;

  for v_item in select * from jsonb_array_elements(v_lines) loop
    insert into public.order_items (order_id, name, qty, unit_price)
    values (v_order_id, v_item->>'name', (v_item->>'qty')::smallint, (v_item->>'unit_price')::numeric);
  end loop;

  v_url := public.setting('webhook.order');
  if v_url is null then
    insert into public.notification_log (kind, reference, url, note)
    values ('order', p_order_no, null, 'skipped: webhook.order not configured');
  else
    select net.http_post(
      url := v_url,
      body := jsonb_build_object(
        'order_no', p_order_no, 'customer_name', p_customer_name, 'email', p_email,
        'phone', p_phone, 'order_type', p_order_type, 'table_number', p_table_number,
        'delivery_address', p_delivery_address, 'delivery_notes', p_delivery_notes,
        'requested_time', p_requested_time, 'total', v_computed::float8, 'items', v_lines),
      headers := '{"Content-Type": "application/json"}'::jsonb
    ) into v_req;
    insert into public.notification_log (kind, reference, url, request_id)
    values ('order', p_order_no, v_url, v_req);
  end if;

  return query select v_order_id, p_order_no, v_created_at;
end;
$function$;

-- CREATE OR REPLACE keeps existing grants; restate them so this file stands alone.
revoke all on function public.create_order(text, text, text, text, text, text, text, text, timestamp with time zone, numeric, boolean, jsonb)
  from public, anon, authenticated;
grant execute on function public.create_order(text, text, text, text, text, text, text, text, timestamp with time zone, numeric, boolean, jsonb)
  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Future objects start closed.
--
-- Only the postgres role's defaults can be changed from a migration; objects
-- this project creates are owned by postgres, so these are the ones that apply.
-- ---------------------------------------------------------------------------

alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on functions from anon, authenticated;
-- Postgres's built-in "PUBLIC may execute every new function" can only be
-- removed database-wide: a per-schema default can add to the global defaults
-- but never take one away. (Verified: the per-schema form leaves =X in place.)
alter default privileges for role postgres revoke execute on functions from public;

-- ---------------------------------------------------------------------------
-- 4. Trigger helpers never need to be callable. Triggers fire regardless of
--    EXECUTE, which is only checked when the trigger is created.
-- ---------------------------------------------------------------------------

revoke all on function public.set_updated_at() from public, anon, authenticated;
