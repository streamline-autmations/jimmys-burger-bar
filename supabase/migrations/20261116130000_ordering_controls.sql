-- Staff controls for a busy shift: pause online ordering, mark a dish sold out.
-- Additive. The pause is enforced by prepare_order_payment and begin_payment,
-- so it only bites where payments.provider is set.

-- Public on purpose: the menu says "paused" or "sold out" before a guest fills
-- a cart, instead of refusing at the pay step. Dish names only.
create function public.ordering_state() returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'paused', coalesce(public.setting('ordering.paused') = 'true', false),
    'unavailable', coalesce((select jsonb_agg(name order by name) from public.menu_items where not available), '[]'::jsonb));
$$;

create function public.set_ordering_paused(p_paused boolean) returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_paused is null or not public.is_staff() then raise exception 'STAFF_ONLY'; end if;
  insert into public.app_settings(key, value, description) values ('ordering.paused', p_paused::text, 'Pause new online payments')
    on conflict (key) do update set value = excluded.value, updated_at = now();
end $$;

-- shortcut: the menu seed (npm run menu:sql) puts every configured dish back on
-- sale, so a sold-out mark lasts until the next menu change. Give menu_items a
-- separate sold_out column if marks must survive a re-seed.
create function public.set_menu_item_available(p_name text, p_available boolean) returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_available is null or not public.is_staff() then raise exception 'STAFF_ONLY'; end if;
  update public.menu_items set available = p_available, updated_at = now() where name = p_name;
  if not found then raise exception 'MENU_ITEM_NOT_FOUND'; end if;
end $$;

revoke all on function public.ordering_state(), public.set_ordering_paused(boolean), public.set_menu_item_available(text, boolean) from public, anon, authenticated;
grant execute on function public.ordering_state() to anon, authenticated;
grant execute on function public.set_ordering_paused(boolean), public.set_menu_item_available(text, boolean) to authenticated;
