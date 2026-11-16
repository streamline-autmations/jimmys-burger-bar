-- Staging Slice 1. No secrets. Additive and inert without payments.provider.
alter table public.orders
  add column payment_status text not null default 'not_required'
    check (payment_status in ('not_required','pending','paid','failed','expired','refund_pending','refunded')),
  add column paid_at timestamptz,
  add column payment_expires_at timestamptz,
  add column provider_payment_id text unique,
  add column payment_review_required boolean not null default false,
  add column refund_amount numeric(10,2) not null default 0 check (refund_amount >= 0 and refund_amount <= total);

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  provider text not null default 'payfast' check (provider = 'payfast'),
  provider_payment_id text not null,
  kind text not null check (kind in ('checkout','payment','refund')),
  status text not null,
  amount numeric(10,2) not null check (amount >= 0),
  raw jsonb not null default '{}',
  recorded_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (provider, provider_payment_id, status)
);
-- One Payfast transaction cannot be attached to two different orders, even
-- when the ITN status differs. This registry also serialises concurrent ITNs.
create table public.payment_transactions (
  provider_payment_id text primary key,
  order_id uuid not null references public.orders(id)
);
alter table public.payment_events enable row level security;
alter table public.payment_transactions enable row level security;
revoke all on public.payment_events, public.payment_transactions from public, anon, authenticated;
grant select on public.payment_events to authenticated;
create policy payment_events_staff_read on public.payment_events for select to authenticated using (public.is_staff());

create function public.prepare_order_payment() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if public.setting('payments.provider') = 'payfast' then
    if new.order_type <> 'collection' then raise exception 'PAYMENT_COLLECTION_ONLY'; end if;
    if public.setting('ordering.paused') = 'true' then raise exception 'ORDERING_PAUSED'; end if;
    if public.setting('trading_hours') is null then raise exception 'PAYMENT_HOURS_UNCONFIGURED'; end if;
    if new.requested_time is null then raise exception 'PAYMENT_TIME_REQUIRED'; end if;
    new.payment_status := 'pending';
    new.payment_expires_at := now() + interval '30 minutes';
  end if;
  return new;
end $$;
create trigger orders_prepare_payment before insert on public.orders for each row execute function public.prepare_order_payment();

-- Preserve whichever create_order version the project has, including the
-- existing pricing, contact+reference retry contract and optional hardening.
-- The only change is gating its existing notification block.
do $$
declare f text; signature regprocedure := 'public.create_order(text,text,text,text,text,text,text,text,timestamptz,numeric,boolean,jsonb)'::regprocedure;
begin
  f := pg_get_functiondef(signature);
  if position('v_url := public.setting(''webhook.order'');' in f) = 0 then raise exception 'unrecognised create_order notification block'; end if;
  f := replace(f, 'v_url := public.setting(''webhook.order'');', 'if coalesce(public.setting(''payments.provider''), '''') <> ''payfast'' then
  v_url := public.setting(''webhook.order'');');
  f := replace(f, 'return query select v_order_id, p_order_no, v_created_at;' || chr(10) || 'end;', 'end if;
  return query select v_order_id, p_order_no, v_created_at;' || chr(10) || 'end;');
  execute f;
end $$;

create function public.guard_payment_update() returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user not in ('postgres','service_role','supabase_admin') and
    (new.payment_status, new.paid_at, new.payment_expires_at, new.provider_payment_id, new.payment_review_required, new.refund_amount)
      is distinct from
    (old.payment_status, old.paid_at, old.payment_expires_at, old.provider_payment_id, old.payment_review_required, old.refund_amount) then
    raise exception 'PAYMENT_SERVER_ONLY';
  end if;
  if current_user not in ('postgres','service_role','supabase_admin') and old.payment_status <> 'not_required' and
    (new.total,new.order_no,new.email,new.order_type,new.requested_time) is distinct from
    (old.total,old.order_no,old.email,old.order_type,old.requested_time) then raise exception 'PAYMENT_SERVER_ONLY'; end if;
  if new.status is distinct from old.status and new.status not in ('new','cancelled') and new.payment_status not in ('paid','not_required') then
    raise exception 'PAYMENT_REQUIRED';
  end if;
  if old.status = 'cancelled' and new.status <> 'cancelled' and old.payment_status <> 'not_required' then
    raise exception 'PAYMENT_CANCELLED';
  end if;
  return new;
end $$;
create trigger orders_guard_payment before update on public.orders for each row execute function public.guard_payment_update();

create function public.begin_payment(p_reference text, p_contact text, p_restaurant text, p_mode text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare o public.orders%rowtype; local_time timestamp;
begin
  if public.setting('payments.provider') is distinct from 'payfast' then raise exception 'PAYMENTS_DISABLED'; end if;
  if public.setting('payments.restaurant') is distinct from p_restaurant or public.setting('payments.mode') is distinct from p_mode then raise exception 'PAYMENT_TENANT_MODE'; end if;
  if public.setting('ordering.paused') = 'true' then raise exception 'ORDERING_PAUSED'; end if;
  select * into o from public.orders where order_no = p_reference and lower(trim(email)) = lower(trim(p_contact)) for update;
  if o.id is null then raise exception 'PAYMENT_NOT_FOUND'; end if;
  if o.status <> 'new' or o.payment_status <> 'pending' or o.payment_expires_at <= now() then raise exception 'PAYMENT_NOT_PENDING'; end if;
  if o.order_type <> 'collection' then raise exception 'PAYMENT_COLLECTION_ONLY'; end if;
  if public.setting('trading_hours') is null then raise exception 'PAYMENT_HOURS_UNCONFIGURED'; end if;
  local_time := o.requested_time at time zone coalesce(public.setting('timezone'), 'Africa/Johannesburg');
  if local_time is null or o.requested_time < now() or not public.is_trading_time(local_time::date, local_time::time) then raise exception 'PAYMENT_CLOSED'; end if;
  if exists (select 1 from public.order_items i left join public.menu_items m on m.name=i.name where i.order_id=o.id and
    (m.name is null or not m.available or m.price <> i.unit_price or (m.available_until is not null and local_time::time >= m.available_until))) then raise exception 'PAYMENT_UNAVAILABLE'; end if;
  insert into public.payment_events(order_id,provider_payment_id,kind,status,amount)
    values(o.id,o.order_no,'checkout','pending',o.total) on conflict do nothing;
  return jsonb_build_object('reference',o.order_no,'amount',o.total::text,'expires_at',o.payment_expires_at,
    'site_url',public.setting('payments.site_url'));
end $$;

create function public.mark_order_paid(p_reference text, p_transaction text, p_status text, p_amount numeric, p_raw jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare o public.orders%rowtype; tx uuid; event_id uuid; actionable boolean; url text; req bigint; lines jsonb;
begin
  if p_status not in ('COMPLETE','CANCELLED') or p_transaction !~ '^[0-9]+$' then raise exception 'PAYMENT_INVALID_EVENT'; end if;
  select * into o from public.orders where order_no=p_reference for update;
  if o.id is null or o.payment_status='not_required' then raise exception 'PAYMENT_NOT_FOUND'; end if;
  if p_amount is null or p_amount <> o.total then raise exception 'PAYMENT_AMOUNT_MISMATCH'; end if;
  if not exists(select 1 from public.payment_events where order_id=o.id and kind='checkout') then raise exception 'PAYMENT_NO_CHECKOUT'; end if;
  insert into public.payment_transactions values(p_transaction,o.id) on conflict do nothing;
  select order_id into tx from public.payment_transactions where provider_payment_id=p_transaction;
  if tx <> o.id then raise exception 'PAYMENT_TRANSACTION_REUSED'; end if;
  insert into public.payment_events(order_id,provider_payment_id,kind,status,amount,raw)
    values(o.id,p_transaction,'payment',p_status,p_amount,p_raw) on conflict do nothing returning id into event_id;
  if event_id is null then return jsonb_build_object('result','duplicate'); end if;
  -- Success cannot be downgraded by an out-of-order failure or replay. A
  -- second successful transaction is money to reconcile, never another ticket.
  if o.paid_at is not null then
    if p_status='COMPLETE' and o.provider_payment_id <> p_transaction then
      update public.orders set payment_review_required=true where id=o.id;
    end if;
    return jsonb_build_object('result','recorded');
  end if;
  if p_status='CANCELLED' then
    update public.orders set payment_status='failed' where id=o.id and payment_status='pending';
    return jsonb_build_object('result','failed');
  end if;
  actionable := o.status='new' and o.payment_status='pending' and o.payment_expires_at > now();
  update public.orders set payment_status='paid', paid_at=now(), provider_payment_id=p_transaction,
    payment_review_required=not actionable, status=case when actionable then status else 'cancelled' end where id=o.id;
  if actionable then
    select jsonb_agg(jsonb_build_object('name',name,'qty',qty,'unit_price',unit_price)) into lines from public.order_items where order_id=o.id;
    url := public.setting('webhook.order');
    if url is not null then
      select net.http_post(url:=url, body:=jsonb_build_object('order_no',o.order_no,'customer_name',o.customer_name,'email',o.email,
        'phone',o.phone,'order_type',o.order_type,'table_number',o.table_number,'delivery_address',o.delivery_address,
        'delivery_notes',o.delivery_notes,'requested_time',o.requested_time,'total',o.total,'items',lines),
        headers:='{"Content-Type":"application/json"}'::jsonb) into req;
    end if;
    insert into public.notification_log(kind,reference,url,request_id,note) values('order',o.order_no,url,req,
      case when url is null then 'skipped: webhook.order not configured' end);
  end if;
  return jsonb_build_object('result',case when actionable then 'paid' else 'review_required' end);
end $$;

create function public.expire_pending_payments() returns void language sql security definer set search_path = '' as $$
  update public.orders set payment_status='expired',status='cancelled'
    where payment_status='pending' and payment_expires_at <= now() and status='new';
$$;
-- Schedule only when payments are configured (tenant SQL), leaving flag-off cron unchanged.

create function public.collection_commission_report() returns table (
  reference text, month date, food_subtotal numeric, delivery numeric, refunds numeric,
  payment_state text, fulfilment_state text, commission_base numeric
) language sql stable security definer set search_path = '' as $$
  select o.order_no, date_trunc('month',o.completed_at at time zone coalesce(public.setting('timezone'),'Africa/Johannesburg'))::date,
    o.total, 0::numeric, o.refund_amount, o.payment_status, o.status, greatest(0,o.total-o.refund_amount)
  from public.orders o where public.is_staff() and o.order_type='collection' and o.status='completed'
    and o.payment_status in ('paid','refund_pending','refunded');
$$;

-- Preserve booking lookup and contact matching. Add payment truth to order lookup only.
do $$ declare f text; begin
  f := pg_get_functiondef('public.lookup_request(text,text)'::regprocedure);
  f := replace(f, '''status'', v_order.status,', '''status'', v_order.status, ''payment_status'', v_order.payment_status, ''paid_at'', v_order.paid_at,');
  execute f;
end $$;

revoke all on function public.prepare_order_payment(), public.guard_payment_update(), public.begin_payment(text,text,text,text),
  public.mark_order_paid(text,text,text,numeric,jsonb), public.expire_pending_payments(), public.collection_commission_report() from public, anon, authenticated;
grant execute on function public.begin_payment(text,text,text,text), public.mark_order_paid(text,text,text,numeric,jsonb), public.expire_pending_payments() to service_role;
grant execute on function public.collection_commission_report() to authenticated;
-- Realtime is a refresh signal only. Supabase has this publication; PGlite does not.
do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(
    select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='orders') then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;

-- Pilot dashboard refunds are recorded by the trusted backend after a human
-- reconciles them. Never calls Payfast or issues a refund itself. Partial refund
-- rows are append-only; pending entries do not reduce revenue until confirmed.
create function public.record_payment_refund(p_reference text, p_refund_id text, p_amount numeric, p_confirmed boolean, p_reviewer uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare o public.orders%rowtype; e uuid; refunded numeric;
begin
  if not exists(select 1 from public.staff where user_id=p_reviewer and role in ('owner','manager')) then raise exception 'REFUND_REVIEWER_REQUIRED'; end if;
  select * into o from public.orders where order_no=p_reference for update;
  if o.paid_at is null or p_amount is null or p_amount <= 0 or p_refund_id is null or length(trim(p_refund_id))=0 then raise exception 'REFUND_INVALID'; end if;
  if exists(select 1 from public.payment_events where kind='refund' and provider_payment_id=p_refund_id and (order_id<>o.id or amount<>p_amount)) then raise exception 'REFUND_CONFLICT'; end if;
  if not p_confirmed and exists(select 1 from public.payment_events where kind='refund' and provider_payment_id=p_refund_id and status='refunded') then return; end if;
  insert into public.payment_events(order_id,provider_payment_id,kind,status,amount,recorded_by)
    values(o.id,p_refund_id,'refund',case when p_confirmed then 'refunded' else 'refund_pending' end,p_amount,p_reviewer)
    on conflict do nothing returning id into e;
  if e is null then return; end if;
  select coalesce(sum(amount),0) into refunded from public.payment_events where order_id=o.id and kind='refund' and status='refunded';
  if refunded > o.total then raise exception 'REFUND_EXCEEDS_TOTAL'; end if;
  update public.orders set refund_amount=refunded, payment_status=case
    when refunded=o.total then 'refunded' when not p_confirmed then 'refund_pending' else 'paid' end where id=o.id;
end $$;
revoke all on function public.record_payment_refund(text,text,numeric,boolean,uuid) from public, anon, authenticated;
grant execute on function public.record_payment_refund(text,text,numeric,boolean,uuid) to service_role;
