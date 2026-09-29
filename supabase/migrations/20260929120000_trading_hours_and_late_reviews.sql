-- Trading hours enforced by the database, and review requests that stop
-- missing late orders. Written 2026-09-29; CLAUDE.md records where it is applied.
--
-- 1. Orders and bookings for a time the restaurant is closed are refused.
--    The site already prevents this; now the database does too, so a stale
--    page or a hand-made request cannot order for a Sunday or book a table at
--    23:00 on a Monday. Hours come from the `trading_hours` setting, which
--    `npm run tenant:sql` generates from the tenant config (venue.hours and
--    venue.closures), using the site's own rule: open <= time < close, with
--    "24:00" meaning midnight. Without the setting nothing is refused (and it
--    is logged), so a project that has not re-applied its settings keeps
--    trading.
--
-- 2. send_review_requests missed every order completed after the nightly run.
--    It matched `completed_at::date = current_date`, both in UTC, so an order
--    completed at 21:00 on a Friday was never asked. It now asks every
--    completed order not yet asked from the last 48 hours: a late order goes
--    out the next evening, and one missed run is caught up. review_sent_at
--    still guarantees one email per order.
--    Bookings compared the local booking time with UTC, which made evening
--    bookings wait a day; the time is now read in the restaurant's zone.
--
-- Deliberately not a change to create_order: 20260915130000_harden_public_writes
-- also redefines it and is not applied to Jimmy's, so any new definition here
-- would either undo that hardening elsewhere or smuggle it into Jimmy's.

CREATE OR REPLACE FUNCTION public.is_trading_time(p_date date, p_time time without time zone)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_hours jsonb; v_window jsonb; v_local text;
begin
  v_hours := nullif(public.setting('trading_hours'), '')::jsonb;
  if v_hours is null then
    raise log 'is_trading_time: trading_hours not configured, allowing % %', p_date, p_time;
    return true;
  end if;

  -- A dated exception (closure or changed hours) wins over the weekly pattern.
  if coalesce(v_hours->'exceptions' ? p_date::text, false) then
    v_window := v_hours->'exceptions'->(p_date::text);
  else
    v_window := v_hours->'weekly'->(extract(dow from p_date)::int::text);
  end if;
  if v_window is null or jsonb_typeof(v_window) <> 'array' then
    return false;
  end if;

  -- "HH:MM" strings compare correctly, and "24:00" sorts after every real time.
  v_local := to_char(p_time, 'HH24:MI');
  return v_local >= (v_window->>0) and v_local < (v_window->>1);
end;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_trading_hours()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_zone text; v_local timestamp;
begin
  if tg_table_name = 'orders' then
    if new.requested_time is null then
      return new;
    end if;
    v_zone := coalesce(public.setting('timezone'), 'Africa/Johannesburg');
    v_local := new.requested_time at time zone v_zone;
    if not public.is_trading_time(v_local::date, v_local::time) then
      raise log 'order % refused: % local is outside trading hours', new.order_no, v_local;
      raise exception 'requested time is outside trading hours';
    end if;
  elsif not public.is_trading_time(new.booking_date, new.booking_time) then
    raise log 'booking refused: % % is outside trading hours', new.booking_date, new.booking_time;
    raise exception 'requested time is outside trading hours';
  end if;
  return new;
end;
$function$;

create trigger orders_enforce_trading_hours before insert on public.orders
  for each row execute function public.enforce_trading_hours();
create trigger bookings_enforce_trading_hours before insert on public.bookings
  for each row execute function public.enforce_trading_hours();

CREATE OR REPLACE FUNCTION public.send_review_requests()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_url text; v_req bigint; r record; v_zone text;
begin
  v_url := public.setting('webhook.review');
  if v_url is null then
    raise log 'send_review_requests skipped: webhook.review not configured';
    return;
  end if;
  v_zone := coalesce(public.setting('timezone'), 'Africa/Johannesburg');

  for r in
    select id, customer_name as name, email, order_no as reference
    from public.orders
    where status = 'completed' and review_sent_at is null
      and completed_at > now() - interval '48 hours'
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
      and ((booking_date + booking_time) at time zone v_zone) + interval '2 hours' < now()
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

-- Internal helpers, like every other function here: not callable through the API.
revoke all on function
  public.is_trading_time(date, time without time zone),
  public.enforce_trading_hours()
  from public, anon, authenticated;
