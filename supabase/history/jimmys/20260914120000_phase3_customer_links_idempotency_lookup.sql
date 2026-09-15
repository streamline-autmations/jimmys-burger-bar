-- Phase 3: customer history links, safe order retries, customer status lookup.
--
-- Applied to the live project (iqxxmvitbuxlpncpjzkx) on 2026-09-14 as migration
-- "phase3_customer_links_idempotency_lookup". Verified afterwards: grants per
-- the block at the end, all existing rows linked, and a rolled-back anon run of
-- retry idempotency, lookup, past-time refusal and the phone-format fix.

-- 0. Phone numbers compared by meaning, not by typing. "082 123 4567" and
--    "+27 82 123 4567" are the same phone; as raw strings they are not, which
--    split one guest into two customers. A leading trunk 0 becomes the
--    tenant's country code (app_settings 'phone.country_code', default 27).
create or replace function public.normalise_phone(p_phone text)
returns text
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_digits text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_country text := coalesce(public.setting('phone.country_code'), '27');
begin
  if v_digits like '00%' then
    v_digits := substr(v_digits, 3);
  elsif v_digits like '0%' and length(v_digits) between 9 and 11 then
    v_digits := v_country || substr(v_digits, 2);
  end if;
  return nullif(v_digits, '');
end;
$function$;

revoke all on function public.normalise_phone(text) from public, anon, authenticated;

-- 1. upsert_customer: match by email, then phone. The previous version only
--    handled an email conflict, so a returning guest using a known phone with
--    a new email hit the phone unique constraint and rolled back the whole
--    order or booking. Now returns the customer id so rows can link to it.
drop function if exists public.upsert_customer(text, text, text, boolean);

create function public.upsert_customer(p_name text, p_email text, p_phone text, p_marketing_consent boolean)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_id uuid;
  v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
  v_phone text := nullif(trim(coalesce(p_phone, '')), '');
  v_phone_key text := public.normalise_phone(p_phone);
begin
  if v_email is not null then
    select c.id into v_id from public.customers c where lower(c.email) = v_email limit 1;
  end if;
  if v_id is null and v_phone_key is not null then
    select c.id into v_id from public.customers c
    where public.normalise_phone(c.phone) = v_phone_key
    order by c.created_at limit 1;
  end if;

  if v_id is null then
    insert into public.customers (name, email, phone, marketing_consent)
    values (p_name, v_email, v_phone, coalesce(p_marketing_consent, false))
    on conflict do nothing
    returning id into v_id;
    if v_id is not null then
      return v_id;
    end if;
    -- Lost a race with a concurrent insert for the same contact.
    select c.id into v_id from public.customers c
    where (v_email is not null and lower(c.email) = v_email)
       or (v_phone is not null and c.phone = v_phone)
    order by (v_email is not null and lower(c.email) = v_email) desc
    limit 1;
    if v_id is null then
      raise exception 'could not resolve customer';
    end if;
  end if;

  -- Latest contact details win, but never take a value another guest owns.
  -- The NOT EXISTS checks can race a concurrent update to the same value; if
  -- that happens the unique index wins and this guest keeps their old details
  -- rather than the whole order or booking failing.
  begin
  update public.customers c set
    name = coalesce(nullif(trim(p_name), ''), c.name),
    email = case
      when v_email is not null and not exists (
        select 1 from public.customers o where lower(o.email) = v_email and o.id <> c.id
      ) then v_email else c.email end,
    phone = case
      when v_phone is not null and not exists (
        select 1 from public.customers o where o.phone = v_phone and o.id <> c.id
      ) then v_phone else c.phone end,
    last_interaction_at = now(),
    interaction_count = c.interaction_count + 1,
    marketing_consent = c.marketing_consent or coalesce(p_marketing_consent, false)
  where c.id = v_id;
  exception when unique_violation then
    update public.customers c set
      name = coalesce(nullif(trim(p_name), ''), c.name),
      last_interaction_at = now(),
      interaction_count = c.interaction_count + 1,
      marketing_consent = c.marketing_consent or coalesce(p_marketing_consent, false)
    where c.id = v_id;
  end;

  return v_id;
end;
$function$;

revoke all on function public.upsert_customer(text, text, text, boolean) from public, anon, authenticated;

-- 2. Link orders and bookings to customers.
alter table public.orders add column if not exists customer_id uuid references public.customers(id) on delete set null;
alter table public.bookings add column if not exists customer_id uuid references public.customers(id) on delete set null;
create index if not exists orders_customer_id_idx on public.orders (customer_id, created_at desc);
create index if not exists bookings_customer_id_idx on public.bookings (customer_id, booking_date desc);

-- Backfill without touching interaction counts. Email first, then phone, in
-- two passes: a single join matching either could attach a row to whichever
-- of two customers Postgres happened to read first.
update public.orders o set customer_id = (
  select c.id from public.customers c where lower(c.email) = lower(o.email) order by c.created_at limit 1
) where o.customer_id is null;
update public.orders o set customer_id = (
  select c.id from public.customers c
  where public.normalise_phone(c.phone) = public.normalise_phone(o.phone) order by c.created_at limit 1
) where o.customer_id is null;
update public.bookings b set customer_id = (
  select c.id from public.customers c where lower(c.email) = lower(b.email) order by c.created_at limit 1
) where b.customer_id is null;
update public.bookings b set customer_id = (
  select c.id from public.customers c
  where public.normalise_phone(c.phone) = public.normalise_phone(b.phone) order by c.created_at limit 1
) where b.customer_id is null;

-- BEFORE INSERT so the id lands on the row itself. Always overwrites, so a
-- caller cannot attach its insert to somebody else's history.
create or replace function public.orders_upsert_customer()
returns trigger language plpgsql security definer set search_path to ''
as $function$
begin
  new.customer_id := public.upsert_customer(new.customer_name, new.email, new.phone, new.marketing_consent);
  return new;
end;
$function$;

create or replace function public.bookings_upsert_customer()
returns trigger language plpgsql security definer set search_path to ''
as $function$
begin
  new.customer_id := public.upsert_customer(new.name, new.email, new.phone, new.marketing_consent);
  return new;
end;
$function$;

drop trigger if exists orders_after_insert_customer on public.orders;
drop trigger if exists bookings_after_insert_customer on public.bookings;
create trigger orders_set_customer before insert on public.orders
  for each row execute function public.orders_upsert_customer();
create trigger bookings_set_customer before insert on public.bookings
  for each row execute function public.bookings_upsert_customer();

revoke all on function public.orders_upsert_customer() from public, anon, authenticated;
revoke all on function public.bookings_upsert_customer() from public, anon, authenticated;

-- 3. create_order is now safe to retry with the same reference. A retry
--    after a timeout returns the order that already landed instead of failing
--    on the unique order_no, and does not send a second notification.
create or replace function public.create_order(p_order_no text, p_customer_name text, p_email text, p_phone text, p_order_type text, p_table_number text, p_delivery_address text, p_delivery_notes text, p_requested_time timestamp with time zone, p_total numeric, p_marketing_consent boolean, p_items jsonb)
 returns table(id uuid, order_no text, created_at timestamp with time zone)
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_order_id uuid; v_created_at timestamptz; v_item jsonb;
  v_computed numeric := 0; v_count int; v_qty int; v_price numeric;
  v_url text; v_req bigint; v_existing_email text;
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

  -- After the retry check on purpose: a retry of an order that landed ten
  -- minutes ago must still get its order back, not a "time has passed" error.
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

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'qty')::int;
    v_price := (v_item->>'unit_price')::numeric;
    if v_qty is null or v_qty < 1 or v_qty > 99 then
      raise log 'create_order rejected [%]: qty % out of range for "%"', p_order_no, v_qty, v_item->>'name';
      raise exception 'invalid item quantity';
    end if;
    if v_price is null or v_price < 0 or v_price > 5000 then
      raise log 'create_order rejected [%]: unit price % out of range for "%"', p_order_no, v_price, v_item->>'name';
      raise exception 'invalid item price';
    end if;
    v_computed := v_computed + (v_qty * v_price);
  end loop;

  if abs(v_computed - coalesce(p_total, -1)) > 0.01 then
    raise log 'create_order rejected [%]: claimed total % but lines sum to %', p_order_no, p_total, v_computed;
    raise exception 'order total does not match its items';
  end if;

  if p_total <= 0 or p_total > 50000 then
    raise log 'create_order rejected [%]: total % out of range', p_order_no, p_total;
    raise exception 'invalid order total';
  end if;

  insert into public.orders (
    order_no, customer_name, email, phone, order_type, table_number,
    delivery_address, delivery_notes, requested_time, total, marketing_consent
  ) values (
    p_order_no, p_customer_name, p_email, p_phone, p_order_type, p_table_number,
    p_delivery_address, p_delivery_notes, p_requested_time, p_total, p_marketing_consent
  ) returning public.orders.id, public.orders.created_at into v_order_id, v_created_at;

  for v_item in select * from jsonb_array_elements(p_items) loop
    insert into public.order_items (order_id, name, qty, unit_price)
    values (v_order_id, v_item->>'name', (v_item->>'qty')::smallint, (v_item->>'unit_price')::numeric);
  end loop;

  -- Fires only after order_items exist; an AFTER INSERT trigger on orders would
  -- run too early and report zero items.
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
        'requested_time', p_requested_time, 'total', p_total, 'items', p_items),
      headers := '{"Content-Type": "application/json"}'::jsonb
    ) into v_req;
    insert into public.notification_log (kind, reference, url, request_id)
    values ('order', p_order_no, v_url, v_req);
  end if;

  return query select v_order_id, p_order_no, v_created_at;
end;
$function$;

-- 4. Customer status lookup. Needs the reference AND a matching email or
--    phone, returns no names or contact details, and answers null for any
--    mismatch so it cannot be used to confirm that a reference exists.
create or replace function public.lookup_request(p_reference text, p_contact text)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_ref text := upper(trim(coalesce(p_reference, '')));
  v_email text := lower(trim(coalesce(p_contact, '')));
  v_digits text := regexp_replace(coalesce(p_contact, ''), '\D', '', 'g');
  -- Whole normalised number, not the last nine digits: +44 and +27 numbers
  -- that share a tail are different phones.
  v_phone_key text := case when length(v_digits) >= 9 then public.normalise_phone(p_contact) end;
  v_order public.orders%rowtype;
  v_booking public.bookings%rowtype;
begin
  if length(v_ref) < 6 or length(v_email) < 3 then
    return null;
  end if;

  select * into v_order from public.orders o where upper(o.order_no) = v_ref;
  if v_order.id is not null and (
    lower(trim(v_order.email)) = v_email
    or (v_phone_key is not null and public.normalise_phone(v_order.phone) = v_phone_key)
  ) then
    return jsonb_build_object(
      'kind', 'order',
      'reference', v_order.order_no,
      'status', v_order.status,
      'order_type', v_order.order_type,
      'requested_time', v_order.requested_time,
      'total', v_order.total,
      'created_at', v_order.created_at,
      'updated_at', v_order.updated_at,
      'items', coalesce((
        select jsonb_agg(jsonb_build_object('name', i.name, 'qty', i.qty) order by i.name)
        from public.order_items i where i.order_id = v_order.id
      ), '[]'::jsonb)
    );
  end if;

  if v_ref ~ '^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$' then
    select * into v_booking from public.bookings b where b.id = lower(v_ref)::uuid;
    if v_booking.id is not null and (
      lower(trim(v_booking.email)) = v_email
      or (v_phone_key is not null and public.normalise_phone(v_booking.phone) = v_phone_key)
    ) then
      return jsonb_build_object(
        'kind', 'booking',
        'reference', v_booking.id,
        'status', v_booking.status,
        'guests', v_booking.guests,
        'booking_date', v_booking.booking_date,
        'booking_time', to_char(v_booking.booking_time, 'HH24:MI'),
        'seating_preference', v_booking.seating_preference,
        'created_at', v_booking.created_at,
        'updated_at', v_booking.updated_at
      );
    end if;
  end if;

  return null;
end;
$function$;

revoke all on function public.lookup_request(text, text) from public;
grant execute on function public.lookup_request(text, text) to anon, authenticated;

-- 5. Dead policies noted in Phase 1: anon's INSERT grants on these tables were
--    revoked in favour of create_order, so these only mislead a reader.
drop policy if exists "public can insert orders" on public.orders;
drop policy if exists "public can insert order_items" on public.order_items;

-- Verification (run after applying; expected values in comments):
-- select has_function_privilege('anon', 'public.upsert_customer(text,text,text,boolean)', 'EXECUTE');  -- false
-- select has_function_privilege('anon', 'public.orders_upsert_customer()', 'EXECUTE');                -- false
-- select has_function_privilege('anon', 'public.bookings_upsert_customer()', 'EXECUTE');              -- false
-- select has_function_privilege('anon', 'public.lookup_request(text,text)', 'EXECUTE');               -- true
-- select has_function_privilege('anon', 'public.normalise_phone(text)', 'EXECUTE');                  -- false
-- select has_function_privilege('anon', 'public.create_order(text,text,text,text,text,text,text,text,timestamptz,numeric,boolean,jsonb)', 'EXECUTE'); -- true
