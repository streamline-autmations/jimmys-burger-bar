-- Delivery preview (staging showcase): a paid delivery order priced by the server.
--
-- Additive and inert without the `delivery.zone` setting, which only a tenant
-- with ordering.deliveryPreview generates (npm run tenant:sql). Without it a
-- pay-first delivery order is refused exactly as before (PAYMENT_COLLECTION_ONLY).
--
-- The fee never comes from the browser. The guest picks a suburb; the payment
-- trigger looks the fee up in `delivery.zone`, stores it in delivery_fee and adds
-- it to total, so begin_payment and the Payfast ITN amount check (both against
-- orders.total) charge and verify food + fee with no change of their own.
--
-- create_order keeps its signature and body (the gated hardening migration also
-- redefines it). The suburb reaches the trigger through create_delivery_order,
-- which sets a transaction-local value and then calls create_order unchanged.

alter table public.orders
  add column delivery_fee numeric(10,2) not null default 0,
  add column delivery_suburb text,
  add constraint orders_delivery_fee_check check (delivery_fee >= 0 and delivery_fee <= total);

-- 'out_for_delivery' sits between ready and completed, for delivery orders only.
alter table public.orders drop constraint orders_status_check,
  add constraint orders_status_check check (status = any (array['new','accepted','preparing','ready','out_for_delivery','completed','cancelled'])),
  add constraint orders_out_for_delivery_check check (status <> 'out_for_delivery' or order_type = 'delivery');

-- As the baseline, with the delivery leg: a delivery goes ready -> out_for_delivery
-- -> completed; collection and table orders keep ready -> completed. Staff screens
-- offer the same steps (src/pages/admin/operations.ts nextStatuses). A failed
-- delivery is cancelled only through mark_delivery_failed.
create or replace function public.enforce_order_status_transition() returns trigger
language plpgsql set search_path = '' as $function$
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
    when 'ready'     then case when old.order_type = 'delivery' then array['out_for_delivery','cancelled'] else array['completed','cancelled'] end
    when 'out_for_delivery' then array['completed']
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

-- Why a delivery cannot go ahead at a restaurant-local time, or null when it can.
-- Shared by the insert trigger and begin_payment so both refuse the same things.
create function public.delivery_refusal(p_suburb text, p_local timestamp, p_food numeric) returns text
language plpgsql stable security definer set search_path = '' as $$
declare v_zone jsonb := nullif(public.setting('delivery.zone'), '')::jsonb;
begin
  if v_zone is null then return 'PAYMENT_COLLECTION_ONLY'; end if;
  if p_suburb is null or not exists (select 1 from jsonb_array_elements(v_zone->'bands') b where b->'suburbs' ? p_suburb) then
    return 'DELIVERY_OUT_OF_ZONE';
  end if;
  if p_local is null or p_local::time < (v_zone->'hours'->>0)::time or p_local::time >= (v_zone->'hours'->>1)::time then
    return 'DELIVERY_CLOSED';
  end if;
  if (v_zone->>'minimum') is not null and p_food < (v_zone->>'minimum')::numeric then return 'DELIVERY_MINIMUM'; end if;
  return null;
end $$;

create or replace function public.prepare_order_payment() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_refusal text; v_local timestamp;
begin
  -- Whatever a client wrote, the fee is the server's: zero unless priced below.
  new.delivery_fee := 0;
  if public.setting('payments.provider') = 'payfast' then
    if new.order_type not in ('collection', 'delivery') then raise exception 'PAYMENT_COLLECTION_ONLY'; end if;
    if public.setting('ordering.paused') = 'true' then raise exception 'ORDERING_PAUSED'; end if;
    if public.setting('trading_hours') is null then raise exception 'PAYMENT_HOURS_UNCONFIGURED'; end if;
    if new.requested_time is null then raise exception 'PAYMENT_TIME_REQUIRED'; end if;
    if new.order_type = 'delivery' then
      new.delivery_suburb := nullif(current_setting('app.delivery_suburb', true), '');
      v_local := new.requested_time at time zone coalesce(public.setting('timezone'), 'Africa/Johannesburg');
      v_refusal := public.delivery_refusal(new.delivery_suburb, v_local, new.total);
      if v_refusal is not null then raise exception '%', v_refusal; end if;
      if coalesce(trim(new.delivery_address), '') = '' then raise exception 'DELIVERY_ADDRESS_REQUIRED'; end if;
      select (b->>'fee')::numeric into new.delivery_fee
        from jsonb_array_elements(nullif(public.setting('delivery.zone'), '')::jsonb->'bands') b
        where b->'suburbs' ? new.delivery_suburb limit 1;
      new.total := new.total + new.delivery_fee;
    else
      new.delivery_suburb := null;
    end if;
    new.payment_status := 'pending';
    new.payment_expires_at := now() + interval '30 minutes';
  end if;
  return new;
end $$;

-- Same contract as create_order (retry with the same reference returns the
-- existing order; the fee is never re-added because nothing is inserted).
create function public.create_delivery_order(p_order_no text, p_customer_name text, p_email text, p_phone text,
  p_delivery_address text, p_delivery_notes text, p_requested_time timestamptz, p_total numeric,
  p_marketing_consent boolean, p_items jsonb, p_delivery_suburb text)
returns table(id uuid, order_no text, created_at timestamptz) language plpgsql security invoker set search_path = '' as $$
begin
  perform set_config('app.delivery_suburb', coalesce(p_delivery_suburb, ''), true);
  return query select * from public.create_order(p_order_no, p_customer_name, p_email, p_phone, 'delivery', null,
    p_delivery_address, p_delivery_notes, p_requested_time, p_total, p_marketing_consent, p_items);
end $$;

-- As 20261116120000, with the fee and suburb added to the server-only fields once
-- an order is in the payment flow (a staff edit could otherwise move money
-- between food and delivery and change the commission base).
create or replace function public.guard_payment_update() returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user not in ('postgres','service_role','supabase_admin') and
    (new.payment_status, new.paid_at, new.payment_expires_at, new.provider_payment_id, new.payment_review_required, new.refund_amount)
      is distinct from
    (old.payment_status, old.paid_at, old.payment_expires_at, old.provider_payment_id, old.payment_review_required, old.refund_amount) then
    raise exception 'PAYMENT_SERVER_ONLY';
  end if;
  if current_user not in ('postgres','service_role','supabase_admin') and old.payment_status <> 'not_required' and
    (new.total,new.order_no,new.email,new.order_type,new.requested_time,new.delivery_fee,new.delivery_suburb) is distinct from
    (old.total,old.order_no,old.email,old.order_type,old.requested_time,old.delivery_fee,old.delivery_suburb) then raise exception 'PAYMENT_SERVER_ONLY'; end if;
  if new.status is distinct from old.status and new.status not in ('new','cancelled') and new.payment_status not in ('paid','not_required') then
    raise exception 'PAYMENT_REQUIRED';
  end if;
  if old.status = 'cancelled' and new.status <> 'cancelled' and old.payment_status <> 'not_required' then
    raise exception 'PAYMENT_CANCELLED';
  end if;
  return new;
end $$;

-- As 20261116120000, accepting delivery orders that still pass the zone and
-- delivery-hours check, and returning order_type for the Payfast item name.
create or replace function public.begin_payment(p_reference text, p_contact text, p_restaurant text, p_mode text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare o public.orders%rowtype; local_time timestamp; v_refusal text;
begin
  if public.setting('payments.provider') is distinct from 'payfast' then raise exception 'PAYMENTS_DISABLED'; end if;
  if public.setting('payments.restaurant') is distinct from p_restaurant or public.setting('payments.mode') is distinct from p_mode then raise exception 'PAYMENT_TENANT_MODE'; end if;
  if public.setting('ordering.paused') = 'true' then raise exception 'ORDERING_PAUSED'; end if;
  select * into o from public.orders where order_no = p_reference and lower(trim(email)) = lower(trim(p_contact)) for update;
  if o.id is null then raise exception 'PAYMENT_NOT_FOUND'; end if;
  if o.status <> 'new' or o.payment_status <> 'pending' or o.payment_expires_at <= now() then raise exception 'PAYMENT_NOT_PENDING'; end if;
  if o.order_type not in ('collection', 'delivery') then raise exception 'PAYMENT_COLLECTION_ONLY'; end if;
  if public.setting('trading_hours') is null then raise exception 'PAYMENT_HOURS_UNCONFIGURED'; end if;
  local_time := o.requested_time at time zone coalesce(public.setting('timezone'), 'Africa/Johannesburg');
  if local_time is null or o.requested_time < now() or not public.is_trading_time(local_time::date, local_time::time) then raise exception 'PAYMENT_CLOSED'; end if;
  if o.order_type = 'delivery' then
    v_refusal := public.delivery_refusal(o.delivery_suburb, local_time, o.total - o.delivery_fee);
    -- Payment codes only, so the Edge Function passes them through.
    if v_refusal is not null then raise exception '%', case when v_refusal like 'PAYMENT\_%' then v_refusal else 'PAYMENT_' || v_refusal end; end if;
  end if;
  if exists (select 1 from public.order_items i left join public.menu_items m on m.name=i.name where i.order_id=o.id and
    (m.name is null or not m.available or m.price <> i.unit_price or (m.available_until is not null and local_time::time >= m.available_until))) then raise exception 'PAYMENT_UNAVAILABLE'; end if;
  insert into public.payment_events(order_id,provider_payment_id,kind,status,amount)
    values(o.id,o.order_no,'checkout','pending',o.total) on conflict do nothing;
  return jsonb_build_object('reference',o.order_no,'amount',o.total::text,'expires_at',o.payment_expires_at,
    'site_url',public.setting('payments.site_url'),'order_type',o.order_type);
end $$;

-- Food and delivery in separate columns. The commission base is food only, less
-- confirmed refunds, floored at zero. shortcut: a refund is taken off food first,
-- so a refund of just the delivery fee also lowers the base; agree the rule with
-- the restaurant before billing from this.
create or replace function public.collection_commission_report() returns table (
  reference text, month date, food_subtotal numeric, delivery numeric, refunds numeric,
  payment_state text, fulfilment_state text, commission_base numeric
) language sql stable security definer set search_path = '' as $$
  select o.order_no, date_trunc('month',o.completed_at at time zone coalesce(public.setting('timezone'),'Africa/Johannesburg'))::date,
    o.total - o.delivery_fee, o.delivery_fee, o.refund_amount, o.payment_status, o.status,
    greatest(0, o.total - o.delivery_fee - o.refund_amount)
  from public.orders o where public.is_staff() and o.order_type in ('collection','delivery') and o.status='completed'
    and o.payment_status in ('paid','refund_pending','refunded');
$$;

-- A manager says a paid delivery could not be handed over. The order leaves the
-- kitchen and waits in refund_pending until the dashboard refund is recorded
-- with record_payment_refund. Never sends money. Idempotent per order.
create function public.mark_delivery_failed(p_order_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare o public.orders%rowtype;
begin
  if not exists (select 1 from public.staff where user_id = (select auth.uid()) and role in ('owner','manager')) then
    raise exception 'MANAGER_ONLY';
  end if;
  select * into o from public.orders where id = p_order_id for update;
  if o.id is null or o.order_type <> 'delivery' then raise exception 'DELIVERY_NOT_FOUND'; end if;
  if o.status = 'cancelled' and o.payment_status = 'refund_pending' then return; end if;
  if o.paid_at is null or o.payment_status <> 'paid' or o.status not in ('ready','out_for_delivery') then raise exception 'DELIVERY_NOT_IN_TRANSIT'; end if;
  update public.orders set status = 'cancelled', payment_status = 'refund_pending' where id = o.id;
  insert into public.payment_events(order_id, provider_payment_id, kind, status, amount, recorded_by, raw)
    values (o.id, o.order_no || ':delivery-failed', 'refund', 'refund_pending', o.total, (select auth.uid()), '{"reason":"delivery_failed"}')
    on conflict do nothing;
end $$;

-- /track: the fee as its own line.
do $$ declare f text; begin
  f := pg_get_functiondef('public.lookup_request(text,text)'::regprocedure);
  if position('''status'', v_order.status,' in f) = 0 then raise exception 'unrecognised lookup_request order block'; end if;
  f := replace(f, '''status'', v_order.status,', '''status'', v_order.status, ''delivery_fee'', v_order.delivery_fee,');
  execute f;
end $$;

revoke all on function public.delivery_refusal(text,timestamp,numeric), public.mark_delivery_failed(uuid),
  public.create_delivery_order(text,text,text,text,text,text,timestamptz,numeric,boolean,jsonb,text) from public, anon, authenticated;
grant execute on function public.create_delivery_order(text,text,text,text,text,text,timestamptz,numeric,boolean,jsonb,text) to anon, authenticated;
grant execute on function public.mark_delivery_failed(uuid) to authenticated;
