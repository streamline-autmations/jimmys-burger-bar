-- Applied live 2026-09-14 as migration "menu_items".
-- Server-side menu price list, step 1 of 3.
--
-- Rollout order matters, because create_order starts refusing anything not in
-- this table as soon as step 3 lands:
--   1. this migration (table + timezone setting)
--   2. supabase/seed/menu.<slug>.sql (generated from the tenant config)
--   3. 20260914150100_create_order_price_authority.sql

create table if not exists public.menu_items (
  name text primary key,
  category text not null,
  price numeric(10, 2) not null check (price > 0 and price <= 5000),
  -- Restaurant-local "HH:MM" after which the item cannot be requested.
  available_until time,
  available boolean not null default true,
  updated_at timestamptz not null default now()
);

comment on table public.menu_items is
  'Prices create_order charges. Generated from the tenant config by npm run menu:sql; do not edit by hand.';

-- Only create_order (SECURITY DEFINER) reads this. Nobody writes it through the API.
alter table public.menu_items enable row level security;
revoke all on table public.menu_items from anon, authenticated;

-- Category cut-offs are wall-clock times, so the server needs the restaurant's zone.
insert into public.app_settings (key, value, description)
values ('timezone', 'Africa/Johannesburg', 'IANA zone for restaurant-local rules such as breakfast cut-off')
on conflict (key) do nothing;
