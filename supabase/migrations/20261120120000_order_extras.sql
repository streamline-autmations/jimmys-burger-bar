-- Order extras ("Extra Bacon" on a burger), priced by the server like dishes.
--
-- menu_items.extras lists what each dish offers, [{"name":"Extra Bacon","price":25}],
-- generated from the tenant config by npm run menu:sql. An order line may carry
-- "extras": [{"name","price"}]. create_order refuses an unknown extra, an extra
-- the dish does not offer, a wrong price or a repeated extra, exactly as it
-- refuses a dish, and charges qty * (dish + extras).
--
-- order_items.unit_price stays the DISH price, so everything that already reads
-- it (begin_payment's price re-check, the staff screens) keeps its meaning. The
-- extras are a snapshot beside it, in order_items.extras.
--
-- Additive and inert: a dish with no extras, or an order line without the key,
-- behaves exactly as before. create_order keeps its signature. It exists in two
-- shapes (this baseline, and the gated 20260915130000 hardening that adds rate
-- limits), so, like 20261116120000, it is patched in place instead of rewritten:
-- every anchor must be present exactly once or the migration stops.
--
-- Deploy order: this migration, then the regenerated menu seed, then the site.

alter table public.menu_items
  add column extras jsonb not null default '[]'::jsonb,
  add constraint menu_items_extras_check check (jsonb_typeof(extras) = 'array');
alter table public.order_items
  add column extras jsonb not null default '[]'::jsonb,
  add constraint order_items_extras_check check (jsonb_typeof(extras) = 'array');

-- create_order ---------------------------------------------------------------
do $do$
declare
  f text;
  signature regprocedure := 'public.create_order(text,text,text,text,text,text,text,text,timestamptz,numeric,boolean,jsonb)'::regprocedure;
  pairs text[][] := array[
    -- declarations
    array[$a$v_menu public.menu_items%rowtype;$a$,
          $b$v_menu public.menu_items%rowtype; v_extras jsonb; v_extras_total numeric; v_extra jsonb; v_offered jsonb; v_seen text[];$b$],
    -- price the extras after the dish passed every check, then charge qty * (dish + extras)
    array[$a$v_computed := v_computed + (v_qty * v_menu.price);$a$,
          $b$v_extras := '[]'::jsonb; v_extras_total := 0; v_seen := array[]::text[];
    if v_item ? 'extras' and jsonb_typeof(v_item->'extras') <> 'null' then
      if jsonb_typeof(v_item->'extras') <> 'array' or jsonb_array_length(v_item->'extras') > 20 then
        raise log 'create_order rejected [%]: malformed extras on "%"', p_order_no, v_menu.name;
        raise exception 'invalid extras: %', v_menu.name;
      end if;
      for v_extra in select * from jsonb_array_elements(v_item->'extras') loop
        if jsonb_typeof(v_extra) <> 'object' then
          raise log 'create_order rejected [%]: malformed extra on "%"', p_order_no, v_menu.name;
          raise exception 'invalid extras: %', v_menu.name;
        end if;
        select o.v into v_offered from jsonb_array_elements(v_menu.extras) as o(v) where o.v->>'name' = v_extra->>'name';
        if v_offered is null then
          raise log 'create_order rejected [%]: extra "%" is not offered on "%"', p_order_no, v_extra->>'name', v_menu.name;
          raise exception 'extra unavailable: % on %', v_extra->>'name', v_menu.name;
        end if;
        if v_extra->>'name' = any (v_seen) then
          raise log 'create_order rejected [%]: extra "%" repeated on "%"', p_order_no, v_extra->>'name', v_menu.name;
          raise exception 'extra repeated: % on %', v_extra->>'name', v_menu.name;
        end if;
        if (case when jsonb_typeof(v_extra->'price') = 'number' then (v_extra->>'price')::numeric end) is distinct from (v_offered->>'price')::numeric then
          raise log 'create_order rejected [%]: extra "%" sent at % but its price is %', p_order_no, v_extra->>'name', v_extra->>'price', v_offered->>'price';
          raise exception 'extra price changed: % on %', v_extra->>'name', v_menu.name;
        end if;
        v_seen := v_seen || (v_extra->>'name');
        v_extras := v_extras || jsonb_build_object('name', v_offered->>'name', 'price', (v_offered->>'price')::numeric::float8);
        v_extras_total := v_extras_total + (v_offered->>'price')::numeric;
      end loop;
    end if;

    v_computed := v_computed + (v_qty * (v_menu.price + v_extras_total));$b$],
    -- the frozen line (also the webhook payload) carries the extras
    array[$a$'unit_price', v_menu.price::float8);$a$,
          $b$'unit_price', v_menu.price::float8, 'extras', v_extras);$b$],
    array[$a$insert into public.order_items (order_id, name, qty, unit_price)$a$,
          $b$insert into public.order_items (order_id, name, qty, unit_price, extras)$b$],
    array[$a$(v_item->>'qty')::smallint, (v_item->>'unit_price')::numeric);$a$,
          $b$(v_item->>'qty')::smallint, (v_item->>'unit_price')::numeric, coalesce(v_item->'extras', '[]'::jsonb));$b$]
  ];
begin
  f := pg_get_functiondef(signature);
  for i in 1 .. array_length(pairs, 1) loop
    if (length(f) - length(replace(f, pairs[i][1], ''))) <> length(pairs[i][1]) then
      raise exception 'unrecognised create_order block % (expected exactly one match)', i;
    end if;
    f := replace(f, pairs[i][1], pairs[i][2]);
  end loop;
  execute f;
end $do$;

-- begin_payment: an extra whose price changed, or that the dish no longer offers,
-- between placing the order and paying is refused like a changed dish price.
do $do$
declare
  f text := pg_get_functiondef(to_regprocedure('public.begin_payment(text,text,text,text)'));
  old_part text := $a$m.price <> i.unit_price or$a$;
  new_part text := $b$m.price <> i.unit_price or exists (
      select 1 from jsonb_array_elements(i.extras) as e(v) where not exists (
        select 1 from jsonb_array_elements(m.extras) as a(v)
        where a.v->>'name' = e.v->>'name' and (a.v->>'price')::numeric = (e.v->>'price')::numeric)) or$b$;
begin
  if f is null then return; end if; -- Pay-on-collection projects have no payment functions.
  if (length(f) - length(replace(f, old_part, ''))) <> length(old_part) then
    raise exception 'unrecognised begin_payment price check (expected exactly one match)';
  end if;
  execute replace(f, old_part, new_part);
end $do$;

-- mark_order_paid: the order webhook after payment carries the extras too.
do $do$
declare
  f text := pg_get_functiondef(to_regprocedure('public.mark_order_paid(text,text,text,numeric,jsonb)'));
  old_part text := $a$jsonb_build_object('name',name,'qty',qty,'unit_price',unit_price)$a$;
  new_part text := $b$jsonb_build_object('name',name,'qty',qty,'unit_price',unit_price,'extras',extras)$b$;
begin
  if f is null then return; end if; -- Pay-on-collection projects have no payment functions.
  if (length(f) - length(replace(f, old_part, ''))) <> length(old_part) then
    raise exception 'unrecognised mark_order_paid webhook lines (expected exactly one match)';
  end if;
  execute replace(f, old_part, new_part);
end $do$;

-- /track: each line lists its extras.
do $do$
declare
  f text := pg_get_functiondef('public.lookup_request(text,text)'::regprocedure);
  old_part text := $a$jsonb_build_object('name', i.name, 'qty', i.qty)$a$;
  new_part text := $b$jsonb_build_object('name', i.name, 'qty', i.qty, 'extras', i.extras)$b$;
begin
  if (length(f) - length(replace(f, old_part, ''))) <> length(old_part) then
    raise exception 'unrecognised lookup_request item list (expected exactly one match)';
  end if;
  execute replace(f, old_part, new_part);
end $do$;
