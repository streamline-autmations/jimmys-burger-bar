-- Applied live 2026-09-14 as migration "create_order_price_authority", after the seed,
-- then tightened to exact price and total matching ("create_order_exact_prices").
-- Server-side menu price list, step 3 of 3. Apply only after the menu seed.
--
-- create_order stops trusting client prices. Before this, it only checked that
-- the client's line prices added up to the client's total, so anyone calling
-- the public endpoint directly could order a real dish at R0.01 or invent one.

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

  v_zone := coalesce(public.setting('timezone'), 'Africa/Johannesburg');
  v_local_time := (coalesce(p_requested_time, now()) at time zone v_zone)::time;

  -- The server is the price authority. Every line must name an item on the
  -- menu, at the menu's price, and be available at the requested time. The
  -- client's unit price is only used to detect a stale page: a mismatch is
  -- refused rather than silently repriced, so the customer never pays a total
  -- they were not shown.
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
    -- Exact: a tolerance let 99.995 pass for a R100 dish.
    if v_price is null or v_price <> v_menu.price then
      raise log 'create_order rejected [%]: "%" sent at % but menu price is %', p_order_no, v_menu.name, v_price, v_menu.price;
      raise exception 'menu price changed: %', v_menu.name;
    end if;
    if v_menu.available_until is not null and v_local_time >= v_menu.available_until then
      raise log 'create_order rejected [%]: "%" not served at %', p_order_no, v_menu.name, v_local_time;
      raise exception 'menu item not served at that time: %', v_menu.name;
    end if;

    v_computed := v_computed + (v_qty * v_menu.price);
    -- float8 so the webhook payload keeps the number shape n8n already formats
    -- (100, not 100.00); menu prices have at most two decimals.
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
    -- The server's own sum, never the client's figure.
    p_delivery_address, p_delivery_notes, p_requested_time, v_computed, p_marketing_consent
  ) returning public.orders.id, public.orders.created_at into v_order_id, v_created_at;

  -- Stored at the menu's price, not the client's.
  for v_item in select * from jsonb_array_elements(v_lines) loop
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
        'requested_time', p_requested_time, 'total', v_computed::float8, 'items', v_lines),
      headers := '{"Content-Type": "application/json"}'::jsonb
    ) into v_req;
    insert into public.notification_log (kind, reference, url, request_id)
    values ('order', p_order_no, v_url, v_req);
  end if;

  return query select v_order_id, p_order_no, v_created_at;
end;
$function$;
