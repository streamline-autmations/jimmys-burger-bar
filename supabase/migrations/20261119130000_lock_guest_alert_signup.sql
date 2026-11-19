-- Serialize alert signup with the kitchen's status update and its queue trigger.
create or replace function public.add_guest_push(p_reference text, p_email text, p_endpoint text, p_p256dh text, p_auth text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders%rowtype;
  v_email text := lower(trim(coalesce(p_email, '')));
begin
  if length(v_email) < 3 or p_endpoint is null or p_endpoint !~ '^https://' or length(p_endpoint) > 1024
     or length(coalesce(p_p256dh, '')) not between 1 and 200 or length(coalesce(p_auth, '')) not between 1 and 100 then
    return false;
  end if;
  select * into v_order from public.orders o
  where upper(o.order_no) = upper(trim(coalesce(p_reference, ''))) and lower(trim(o.email)) = v_email
  for update;
  if not found or v_order.payment_status not in ('paid', 'not_required') then return false; end if;

  -- Collection and table orders alert at ready. Delivery can still alert when it leaves.
  if not (
    (v_order.status in ('new', 'accepted', 'preparing') and not exists (
      select 1 from public.guest_order_push q where q.order_id = v_order.id and q.status = 'ready'
    )) or
    (v_order.order_type = 'delivery' and v_order.status in ('new', 'accepted', 'preparing', 'ready') and not exists (
      select 1 from public.guest_order_push q where q.order_id = v_order.id and q.status = 'out_for_delivery'
    ))
  ) then return false; end if;

  if (select count(*) from public.guest_push_subscriptions s where s.order_id = v_order.id and s.endpoint <> p_endpoint) >= 5 then
    return false;
  end if;
  insert into public.guest_push_subscriptions (order_id, endpoint, p256dh, auth)
  values (v_order.id, p_endpoint, p_p256dh, p_auth)
  on conflict (order_id, endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth;
  return true;
end $$;
