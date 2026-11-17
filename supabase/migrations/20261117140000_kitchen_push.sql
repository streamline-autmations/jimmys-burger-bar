-- Lock-screen alerts for the kitchen: Web Push to staff devices that opted in.
--
-- staff_push_subscriptions: one row per browser that opted in on the kitchen
-- screen. A staff member sees and changes only their own rows.
--
-- order_push: one row per order that became paid. The row is the dedupe key:
-- the trigger queues it once, and the kitchen-push Edge Function claims it
-- (sent_at is null -> now()) before sending, so a replayed call, a second
-- payment notification or a direct call to the function sends nothing twice.
--
-- The push carries no data at all. The service worker shows the same generic
-- text for every order, so no guest name, item or amount can reach a lock screen.
-- Without the push.url setting nothing is queued, so this is inert on projects
-- that have not set it up.

create table public.staff_push_subscriptions (
  endpoint text not null,
  user_id uuid not null default auth.uid(),
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  constraint staff_push_subscriptions_pkey primary key (endpoint),
  constraint staff_push_subscriptions_user_id_fkey foreign key (user_id) references public.staff(user_id) on delete cascade,
  constraint staff_push_subscriptions_endpoint_check check (endpoint ~ '^https://' and length(endpoint) <= 1024),
  constraint staff_push_subscriptions_keys_check check (length(p256dh) <= 200 and length(auth) <= 100)
);
alter table public.staff_push_subscriptions enable row level security;
create policy "staff manage their own push subscriptions" on public.staff_push_subscriptions
  as permissive for all to authenticated
  using (user_id = (select auth.uid()) and (select public.is_staff()))
  with check (user_id = (select auth.uid()) and (select public.is_staff()));
revoke all on public.staff_push_subscriptions from public, anon, authenticated;
grant select, insert, update, delete on public.staff_push_subscriptions to authenticated;

create table public.order_push (
  order_id uuid not null,
  queued_at timestamptz not null default now(),
  request_id bigint,
  sent_at timestamptz,
  delivered integer,
  failed integer,
  constraint order_push_pkey primary key (order_id),
  constraint order_push_order_id_fkey foreign key (order_id) references public.orders(id) on delete cascade
);
-- Service role only (the Edge Function). No policies: anon and staff read nothing.
alter table public.order_push enable row level security;
revoke all on public.order_push from public, anon, authenticated;

create function public.queue_order_push() returns trigger language plpgsql security definer set search_path = '' as $$
declare
  url text := public.setting('push.url');
  queued uuid;
begin
  if url is null then return null; end if;
  insert into public.order_push(order_id) values (new.id) on conflict do nothing returning order_id into queued;
  if queued is null then return null; end if;
  -- A push that cannot be queued never rolls back the payment; the kitchen
  -- screen still shows and chimes the order.
  begin
    update public.order_push set request_id = net.http_post(url := url, body := jsonb_build_object('order_id', new.id),
      headers := '{"Content-Type":"application/json"}'::jsonb) where order_id = new.id;
  exception when others or query_canceled then
    null;
  end;
  return null;
end $$;
revoke all on function public.queue_order_push() from public, anon, authenticated;
-- Only a payable order the kitchen must act on: record_payment cancels a late
-- payment in the same update, so status is still 'new' only when it counts.
create trigger orders_queue_push after update of paid_at on public.orders
  for each row when (old.paid_at is null and new.paid_at is not null and new.status = 'new')
  execute function public.queue_order_push();
