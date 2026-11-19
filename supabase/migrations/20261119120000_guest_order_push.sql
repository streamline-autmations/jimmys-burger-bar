-- Order-ready alerts to the GUEST's phone: Web Push, opted into on the tracking
-- page. Same design as the kitchen's lock-screen alerts (20261117140000):
--
-- guest_push_subscriptions: one row per (order, browser) that opted in. Tied to
-- ONE order and deleted when that order is completed or cancelled. No policies:
-- anon and staff can neither read nor write it directly. The only way in is
-- add_guest_push, which needs the order reference plus the email it was placed
-- with (the proof /track already uses), so nobody can subscribe to someone
-- else's order, and nobody can read any subscription back.
--
-- guest_order_push: one row per (order, status) alert. The row is the dedupe
-- key: the trigger queues it once, and the kitchen-push Edge Function claims it
-- (sent_at is null -> now()) before sending, so a replayed call or a status
-- that goes back and forth sends nothing twice. One alert at 'ready', and for a
-- delivery one more at 'out_for_delivery'.
--
-- The push carries no data at all: the guest's service worker shows the same
-- generic text for every order. Without the push.url setting nothing is queued.

create table public.guest_push_subscriptions (
  order_id uuid not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  constraint guest_push_subscriptions_pkey primary key (order_id, endpoint),
  constraint guest_push_subscriptions_order_id_fkey foreign key (order_id) references public.orders(id) on delete cascade,
  constraint guest_push_subscriptions_endpoint_check check (endpoint ~ '^https://' and length(endpoint) <= 1024),
  constraint guest_push_subscriptions_keys_check check (length(p256dh) between 1 and 200 and length(auth) between 1 and 100)
);
alter table public.guest_push_subscriptions enable row level security;
revoke all on public.guest_push_subscriptions from public, anon, authenticated;

create table public.guest_order_push (
  order_id uuid not null,
  status text not null,
  queued_at timestamptz not null default now(),
  request_id bigint,
  sent_at timestamptz,
  delivered integer,
  failed integer,
  constraint guest_order_push_pkey primary key (order_id, status),
  constraint guest_order_push_order_id_fkey foreign key (order_id) references public.orders(id) on delete cascade,
  constraint guest_order_push_status_check check (status in ('ready', 'out_for_delivery'))
);
alter table public.guest_order_push enable row level security;
revoke all on public.guest_order_push from public, anon, authenticated;

-- The owner's proof, as lookup_request checks it by email. Returns false for
-- every refusal alike, so a caller learns nothing about orders it cannot prove.
create function public.add_guest_push(p_reference text, p_email text, p_endpoint text, p_p256dh text, p_auth text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders%rowtype;
  v_email text := lower(trim(coalesce(p_email, '')));
begin
  if length(v_email) < 3 or p_endpoint is null or p_endpoint !~ '^https://' or length(p_endpoint) > 1024
     or length(coalesce(p_p256dh, '')) not between 1 and 200 or length(coalesce(p_auth, '')) not between 1 and 100 then
    return false;
  end if;
  select * into v_order from public.orders o where upper(o.order_no) = upper(trim(coalesce(p_reference, '')));
  if v_order.id is null or lower(trim(v_order.email)) <> v_email then return false; end if;
  -- Only an order still on its way to the guest, and only once it is paid for (or needs no payment).
  if v_order.status in ('completed', 'cancelled') or v_order.payment_status not in ('paid', 'not_required') then return false; end if;
  -- A handful of devices per order is plenty; this stops one proof filling the table.
  if (select count(*) from public.guest_push_subscriptions s where s.order_id = v_order.id and s.endpoint <> p_endpoint) >= 5 then
    return false;
  end if;
  insert into public.guest_push_subscriptions (order_id, endpoint, p256dh, auth)
  values (v_order.id, p_endpoint, p_p256dh, p_auth)
  on conflict (order_id, endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth;
  return true;
end $$;

-- Switching the alert off again, with the same proof.
create function public.remove_guest_push(p_reference text, p_email text, p_endpoint text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.guest_push_subscriptions s
  using public.orders o
  where s.order_id = o.id and s.endpoint = p_endpoint
    and upper(o.order_no) = upper(trim(coalesce(p_reference, '')))
    and lower(trim(o.email)) = lower(trim(coalesce(p_email, '')));
end $$;

revoke all on function public.add_guest_push(text, text, text, text, text) from public;
revoke all on function public.remove_guest_push(text, text, text) from public;
grant execute on function public.add_guest_push(text, text, text, text, text) to anon, authenticated;
grant execute on function public.remove_guest_push(text, text, text) to anon, authenticated;

create function public.queue_guest_push() returns trigger language plpgsql security definer set search_path = '' as $$
declare
  url text := public.setting('push.url');
  queued uuid;
begin
  if url is null then return null; end if;
  if new.status = 'out_for_delivery' and new.order_type <> 'delivery' then return null; end if;
  if not exists (select 1 from public.guest_push_subscriptions s where s.order_id = new.id) then return null; end if;
  insert into public.guest_order_push (order_id, status) values (new.id, new.status)
  on conflict do nothing returning order_id into queued;
  if queued is null then return null; end if;
  -- An alert that cannot be queued never rolls back the kitchen's status change.
  begin
    update public.guest_order_push set request_id = net.http_post(url := url,
      body := jsonb_build_object('order_id', new.id, 'status', new.status),
      headers := '{"Content-Type":"application/json"}'::jsonb)
    where order_id = new.id and status = new.status;
  exception when others or query_canceled then
    null;
  end;
  return null;
end $$;
revoke all on function public.queue_guest_push() from public, anon, authenticated;
create trigger orders_queue_guest_push after update of status on public.orders
  for each row when (old.status is distinct from new.status and new.status in ('ready', 'out_for_delivery'))
  execute function public.queue_guest_push();

-- The push address is personal data with one purpose: once the order is done, it goes.
create function public.forget_guest_push() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  delete from public.guest_push_subscriptions where order_id = new.id;
  return null;
end $$;
revoke all on function public.forget_guest_push() from public, anon, authenticated;
create trigger orders_forget_guest_push after update of status on public.orders
  for each row when (old.status is distinct from new.status and new.status in ('completed', 'cancelled'))
  execute function public.forget_guest_push();
