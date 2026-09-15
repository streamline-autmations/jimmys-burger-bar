-- Restaurant Direct: complete database baseline.
--
-- Everything a restaurant's Supabase project needs, in one file: tables, the
-- order and booking rules, notifications, the review job's function, security
-- and grants. It matches Jimmy's live project (iqxxmvitbuxlpncpjzkx) as of
-- 2026-09-15, and tests/database.test.mjs fingerprints it against a snapshot
-- of that project so the two cannot drift apart unnoticed.
--
-- Restaurant-specific values are NOT in here. After applying this file, run the
-- tenant's generated files in supabase/seed/ (settings.<slug>.sql, then
-- menu.<slug>.sql). See docs/NEW-RESTAURANT.md.
--
-- Jimmy's project already has all of this, applied as the 25 migrations listed
-- in supabase/history/jimmys/README.md. Do not apply this file to it.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------

create extension if not exists pg_net;
create extension if not exists pg_cron with schema pg_catalog;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.customers (
  id uuid not null default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  name text not null,
  email text,
  phone text,
  last_interaction_at timestamp with time zone not null default now(),
  interaction_count integer not null default 1,
  marketing_consent boolean not null default false,
  constraint customers_pkey primary key (id),
  constraint customers_email_key unique (email),
  constraint customers_phone_key unique (phone)
);

create table public.orders (
  id uuid not null default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  order_no text not null,
  customer_name text not null,
  email text not null,
  phone text not null,
  order_type text not null,
  table_number text,
  delivery_address text,
  delivery_notes text,
  requested_time timestamp with time zone,
  total numeric(10,2) not null,
  status text not null default 'new'::text,
  marketing_consent boolean not null default false,
  completed_at timestamp with time zone,
  review_sent_at timestamp with time zone,
  customer_id uuid,
  constraint orders_order_type_check check (order_type = any (array['collection'::text, 'delivery'::text, 'table'::text])),
  constraint orders_status_check check (status = any (array['new'::text, 'accepted'::text, 'preparing'::text, 'ready'::text, 'completed'::text, 'cancelled'::text])),
  constraint orders_total_check check (total >= (0)::numeric),
  constraint orders_customer_id_fkey foreign key (customer_id) references public.customers(id) on delete set null,
  constraint orders_pkey primary key (id),
  constraint orders_order_no_key unique (order_no)
);

create table public.order_items (
  id uuid not null default gen_random_uuid(),
  order_id uuid not null,
  name text not null,
  qty smallint not null,
  unit_price numeric(10,2) not null,
  constraint order_items_qty_check check (qty > 0),
  constraint order_items_unit_price_check check (unit_price >= (0)::numeric),
  constraint order_items_order_id_fkey foreign key (order_id) references public.orders(id) on delete cascade,
  constraint order_items_pkey primary key (id)
);

create table public.bookings (
  id uuid not null default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  name text not null,
  email text not null,
  phone text not null,
  guests smallint not null,
  booking_date date not null,
  booking_time time without time zone not null,
  seating_preference text not null default 'No preference'::text,
  notes text,
  status text not null default 'pending'::text,
  marketing_consent boolean not null default false,
  review_sent_at timestamp with time zone,
  customer_id uuid,
  constraint bookings_guests_check check (guests > 0),
  constraint bookings_status_check check (status = any (array['pending'::text, 'confirmed'::text, 'cancelled'::text])),
  constraint bookings_customer_id_fkey foreign key (customer_id) references public.customers(id) on delete set null,
  constraint bookings_pkey primary key (id)
);

create table public.staff (
  user_id uuid not null,
  email text not null,
  role text not null default 'owner'::text,
  created_at timestamp with time zone not null default now(),
  constraint staff_role_check check (role = any (array['owner'::text, 'manager'::text, 'staff'::text])),
  constraint staff_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade,
  constraint staff_pkey primary key (user_id)
);

create table public.app_settings (
  key text not null,
  value text not null,
  description text,
  updated_at timestamp with time zone not null default now(),
  constraint app_settings_pkey primary key (key)
);

create sequence public.notification_log_id_seq;

create table public.notification_log (
  id bigint not null default nextval('public.notification_log_id_seq'::regclass),
  created_at timestamp with time zone not null default now(),
  kind text not null,
  reference text,
  url text,
  request_id bigint,
  note text,
  constraint notification_log_kind_check check (kind = any (array['order'::text, 'booking'::text, 'review'::text])),
  constraint notification_log_pkey primary key (id)
);

alter sequence public.notification_log_id_seq owned by public.notification_log.id;

create table public.menu_items (
  name text not null,
  category text not null,
  price numeric(10,2) not null,
  available_until time without time zone,
  available boolean not null default true,
  updated_at timestamp with time zone not null default now(),
  constraint menu_items_price_check check ((price > (0)::numeric) and (price <= (5000)::numeric)),
  constraint menu_items_pkey primary key (name)
);

comment on table public.menu_items is
  'Prices create_order charges. Generated from the tenant config by npm run menu:sql; do not edit by hand.';

create index bookings_created_at_idx on public.bookings using btree (created_at desc);
create index bookings_customer_id_idx on public.bookings using btree (customer_id, booking_date desc);
create index bookings_status_date_idx on public.bookings using btree (status, booking_date);
create index notification_log_created_at_idx on public.notification_log using btree (created_at desc);
create index order_items_order_id_idx on public.order_items using btree (order_id);
create index orders_customer_id_idx on public.orders using btree (customer_id, created_at desc);
create index orders_status_created_idx on public.orders using btree (status, created_at);

-- ---------------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.setting(p_key text)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select value from public.app_settings where key = p_key;
$function$;

CREATE OR REPLACE FUNCTION public.normalise_phone(p_phone text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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

CREATE OR REPLACE FUNCTION public.upsert_customer(p_name text, p_email text, p_phone text, p_marketing_consent boolean)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    select c.id into v_id from public.customers c
    where (v_email is not null and lower(c.email) = v_email)
       or (v_phone is not null and c.phone = v_phone)
    order by (v_email is not null and lower(c.email) = v_email) desc
    limit 1;
    if v_id is null then
      raise exception 'could not resolve customer';
    end if;
  end if;

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

CREATE OR REPLACE FUNCTION public.is_staff()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1 from public.staff s where s.user_id = (select auth.uid())
  );
$function$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.set_completed_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.status = 'completed' and (old.status is distinct from 'completed') then
    new.completed_at := now();
  elsif new.status <> 'completed' then
    -- status moved back off completed (manual correction) - clear so it
    -- doesn't look like a stale completion if it's later re-completed.
    new.completed_at := null;
    new.review_sent_at := null;
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_order_status_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare allowed text[];
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if current_user in ('postgres', 'service_role', 'supabase_admin') then
    raise log 'order % status forced %->% by %', old.order_no, old.status, new.status, current_user;
    return new;
  end if;

  allowed := case old.status
    when 'new'       then array['accepted','cancelled']
    when 'accepted'  then array['preparing','cancelled']
    when 'preparing' then array['ready','cancelled']
    when 'ready'     then array['completed','cancelled']
    else array[]::text[]
  end;

  if not (new.status = any (allowed)) then
    raise log 'order % blocked illegal transition %->% by %',
      old.order_no, old.status, new.status, current_user;
    raise exception 'illegal order status transition: % -> %', old.status, new.status;
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_booking_status_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare allowed text[];
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if current_user in ('postgres', 'service_role', 'supabase_admin') then
    raise log 'booking % status forced %->% by %', old.id, old.status, new.status, current_user;
    return new;
  end if;

  allowed := case old.status
    when 'pending'   then array['confirmed','cancelled']
    when 'confirmed' then array['cancelled']
    else array[]::text[]
  end;

  if not (new.status = any (allowed)) then
    raise log 'booking % blocked illegal transition %->% by %',
      old.id, old.status, new.status, current_user;
    raise exception 'illegal booking status transition: % -> %', old.status, new.status;
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.throttle_booking_inserts()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_same_contact int;
  v_global       int;
begin
  select count(*) into v_same_contact
  from public.bookings b
  where b.created_at > now() - interval '1 hour'
    and (
      (nullif(new.email,'') is not null and lower(b.email) = lower(new.email))
      or (nullif(new.phone,'') is not null and b.phone = new.phone)
    );

  if v_same_contact >= 3 then
    raise log 'booking throttled: contact % / % already has % in the last hour',
      new.email, new.phone, v_same_contact;
    raise exception 'too many booking requests from this contact. Please phone the restaurant.';
  end if;

  select count(*) into v_global
  from public.bookings b
  where b.created_at > now() - interval '1 hour';

  -- Deliberately generous. Jimmy's takes single-digit bookings a week; 30 in an
  -- hour is a flood, not a busy Friday.
  if v_global >= 30 then
    raise log 'booking throttled: global rate % in the last hour', v_global;
    raise exception 'booking requests are temporarily unavailable. Please phone the restaurant.';
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.notify_booking_webhook()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_url text; v_req bigint;
begin
  v_url := public.setting('webhook.booking');
  if v_url is null then
    insert into public.notification_log (kind, reference, url, note)
    values ('booking', new.id::text, null, 'skipped: webhook.booking not configured');
    return new;
  end if;

  select net.http_post(
    url := v_url,
    body := jsonb_build_object(
      'name', new.name, 'email', new.email, 'phone', new.phone, 'guests', new.guests,
      'date', new.booking_date::text, 'time', new.booking_time::text,
      'seating', new.seating_preference, 'notes', new.notes),
    headers := '{"Content-Type": "application/json"}'::jsonb
  ) into v_req;

  insert into public.notification_log (kind, reference, url, request_id)
  values ('booking', new.id::text, v_url, v_req);
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.orders_upsert_customer()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  new.customer_id := public.upsert_customer(new.customer_name, new.email, new.phone, new.marketing_consent);
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.bookings_upsert_customer()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  new.customer_id := public.upsert_customer(new.name, new.email, new.phone, new.marketing_consent);
  return new;
end;
$function$;

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

CREATE OR REPLACE FUNCTION public.lookup_request(p_reference text, p_contact text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_ref text := upper(trim(coalesce(p_reference, '')));
  v_email text := lower(trim(coalesce(p_contact, '')));
  v_digits text := regexp_replace(coalesce(p_contact, ''), '\D', '', 'g');
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

CREATE OR REPLACE FUNCTION public.send_review_requests()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_url text; v_req bigint; r record;
begin
  v_url := public.setting('webhook.review');
  if v_url is null then
    raise log 'send_review_requests skipped: webhook.review not configured';
    return;
  end if;

  for r in
    select id, customer_name as name, email, order_no as reference
    from public.orders
    where status = 'completed' and completed_at::date = current_date and review_sent_at is null
  loop
    select net.http_post(url := v_url,
      body := jsonb_build_object('type','order','id',r.id,'name',r.name,'email',r.email,'reference',r.reference)
    ) into v_req;
    insert into public.notification_log (kind, reference, url, request_id)
    values ('review', r.reference, v_url, v_req);
    update public.orders set review_sent_at = now() where id = r.id;
  end loop;

  for r in
    select id, name, email, booking_date::text as reference
    from public.bookings
    where status = 'confirmed' and review_sent_at is null
      and (booking_date + booking_time + interval '2 hours') < now()
  loop
    select net.http_post(url := v_url,
      body := jsonb_build_object('type','booking','id',r.id,'name',r.name,'email',r.email,'reference',r.reference)
    ) into v_req;
    insert into public.notification_log (kind, reference, url, request_id)
    values ('review', r.reference, v_url, v_req);
    update public.bookings set review_sent_at = now() where id = r.id;
  end loop;
end;
$function$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create trigger orders_set_customer before insert on public.orders
  for each row execute function public.orders_upsert_customer();
create trigger orders_set_updated_at before update on public.orders
  for each row execute function public.set_updated_at();
create trigger orders_set_completed_at before update on public.orders
  for each row execute function public.set_completed_at();
create trigger orders_enforce_status before update of status on public.orders
  for each row execute function public.enforce_order_status_transition();

create trigger bookings_throttle before insert on public.bookings
  for each row execute function public.throttle_booking_inserts();
create trigger bookings_set_customer before insert on public.bookings
  for each row execute function public.bookings_upsert_customer();
create trigger bookings_notify_webhook after insert on public.bookings
  for each row execute function public.notify_booking_webhook();
create trigger bookings_set_updated_at before update on public.bookings
  for each row execute function public.set_updated_at();
create trigger bookings_enforce_status before update of status on public.bookings
  for each row execute function public.enforce_booking_status_transition();

-- ---------------------------------------------------------------------------
-- Row level security
--
-- Only staff listed in public.staff can read or change anything. The public
-- can do exactly two things: request a booking (a plain insert) and place an
-- order or check a request's status (through the create_order and
-- lookup_request functions, never the tables).
-- ---------------------------------------------------------------------------

alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.bookings enable row level security;
alter table public.staff enable row level security;
alter table public.app_settings enable row level security;
alter table public.notification_log enable row level security;
alter table public.menu_items enable row level security;

create policy "public can insert bookings" on public.bookings
  as permissive for insert to anon with check (true);
create policy "staff can read bookings" on public.bookings
  as permissive for select to authenticated using (public.is_staff());
create policy "staff can update bookings" on public.bookings
  as permissive for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "staff can read customers" on public.customers
  as permissive for select to authenticated using (public.is_staff());
create policy "staff can read notification_log" on public.notification_log
  as permissive for select to authenticated using (public.is_staff());
create policy "staff can read order_items" on public.order_items
  as permissive for select to authenticated using (public.is_staff());
create policy "staff can read orders" on public.orders
  as permissive for select to authenticated using (public.is_staff());
create policy "staff can update orders" on public.orders
  as permissive for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "staff can read staff" on public.staff
  as permissive for select to authenticated using (public.is_staff());

-- ---------------------------------------------------------------------------
-- Grants
--
-- Supabase's default privileges hand anon and authenticated full rights on
-- every new table and function in public. Revoke them all, then grant back
-- exactly what the product needs. RLS above is the second lock, not the only one.
--
-- Function trap, hit twice in this project: revoking from PUBLIC does not
-- remove the explicit anon grant from default privileges, and revoking from
-- anon does not remove PUBLIC's. Revoke from both. Verify afterwards with
-- supabase/verify.sql rather than trusting this block.
-- ---------------------------------------------------------------------------

revoke all on table
  public.customers, public.orders, public.order_items, public.bookings,
  public.staff, public.app_settings, public.notification_log, public.menu_items
  from public, anon, authenticated;

grant all on table
  public.customers, public.orders, public.order_items, public.bookings,
  public.staff, public.app_settings, public.notification_log, public.menu_items
  to service_role;

grant insert on table public.bookings to anon;
grant insert, references, select, trigger, update on table public.bookings to authenticated;
grant insert, references, select, trigger, update on table public.orders to authenticated;
grant insert, references, select, trigger, update on table public.order_items to authenticated;
grant references, select, trigger on table public.customers to authenticated;
grant select on table public.notification_log to authenticated;
grant select on table public.staff to authenticated;

revoke all on sequence public.notification_log_id_seq from public, anon, authenticated;

revoke all on function
  public.setting(text),
  public.normalise_phone(text),
  public.upsert_customer(text, text, text, boolean),
  public.is_staff(),
  public.set_updated_at(),
  public.set_completed_at(),
  public.enforce_order_status_transition(),
  public.enforce_booking_status_transition(),
  public.throttle_booking_inserts(),
  public.notify_booking_webhook(),
  public.orders_upsert_customer(),
  public.bookings_upsert_customer(),
  public.create_order(text, text, text, text, text, text, text, text, timestamp with time zone, numeric, boolean, jsonb),
  public.lookup_request(text, text),
  public.send_review_requests()
  from public, anon, authenticated;

-- The two public entry points.
grant execute on function
  public.create_order(text, text, text, text, text, text, text, text, timestamp with time zone, numeric, boolean, jsonb),
  public.lookup_request(text, text)
  to anon, authenticated;

-- Used by staff policies and fired by staff updates.
grant execute on function
  public.is_staff(),
  public.enforce_order_status_transition(),
  public.enforce_booking_status_transition()
  to authenticated;

-- Matches Jimmy's project, where this trigger helper kept Supabase's default
-- grant. Calling a trigger function directly only raises an error.
grant execute on function public.set_updated_at() to anon, authenticated;
