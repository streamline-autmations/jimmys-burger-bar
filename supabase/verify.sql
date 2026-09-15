-- Restaurant Direct: project health check.
--
-- Read-only. Run it in the SQL editor of a restaurant's Supabase project after
-- setup, and again after any change. Every row should say ok = true; a false
-- row says what to fix. Structure is checked separately by
-- supabase/snapshot/compare.sql (zero rows = matches the baseline).

with
settings as (select key, value from public.app_settings),
anon_tables as (
  select c.relname::text as name,
    string_agg(p.privilege, ',' order by p.privilege) as privileges
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  cross join (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE')) as p(privilege)
  where n.nspname = 'public' and c.relkind = 'r' and has_table_privilege('anon', c.oid, p.privilege)
  group by c.relname
),
anon_functions as (
  select p.proname::text as name
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prokind = 'f' and p.proname <> 'rls_auto_enable'
    and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
    and has_function_privilege('anon', p.oid, 'EXECUTE')
),
checks(sort, check_name, ok, detail) as (
  select 10, 'pg_net extension installed',
    exists (select 1 from pg_extension where extname = 'pg_net'),
    'Database → Extensions → pg_net. Without it no notification is ever sent.'
  union all
  select 11, 'pg_cron extension installed',
    exists (select 1 from pg_extension where extname = 'pg_cron'),
    'Database → Extensions → pg_cron. Needed for the nightly review emails.'

  union all
  select 20, 'timezone setting',
    exists (select 1 from settings where key = 'timezone' and value <> ''),
    coalesce((select value from settings where key = 'timezone'), 'missing: apply supabase/seed/settings.<slug>.sql')
  union all
  select 21, 'phone country code setting',
    exists (select 1 from settings where key = 'phone.country_code' and value ~ '^[0-9]{1,3}$'),
    coalesce((select value from settings where key = 'phone.country_code'), 'missing: apply supabase/seed/settings.<slug>.sql')
  union all
  select 22, 'order notifications webhook',
    exists (select 1 from settings where key = 'webhook.order' and value like 'https://%'),
    coalesce((select value from settings where key = 'webhook.order'), 'not set: orders are saved but nobody is emailed')
  union all
  select 23, 'booking notifications webhook',
    exists (select 1 from settings where key = 'webhook.booking' and value like 'https://%'),
    coalesce((select value from settings where key = 'webhook.booking'), 'not set: bookings are saved but nobody is emailed')
  union all
  select 24, 'review requests webhook',
    exists (select 1 from settings where key = 'webhook.review' and value like 'https://%')
      = exists (select 1 from cron.job where command = 'select public.send_review_requests()'),
    coalesce((select value from settings where key = 'webhook.review'), 'off') || ' / job: '
      || coalesce((select string_agg(schedule, ', ') from cron.job where command = 'select public.send_review_requests()'), 'none')
  union all
  select 25, 'one review job at most',
    (select count(*) from cron.job where command = 'select public.send_review_requests()') <= 1,
    (select count(*) from cron.job where command = 'select public.send_review_requests()')::text || ' scheduled'

  union all
  select 30, 'menu loaded',
    exists (select 1 from public.menu_items where available),
    (select count(*) from public.menu_items where available)::text || ' orderable items. Apply supabase/seed/menu.<slug>.sql if 0.'

  union all
  select 40, 'at least one staff member',
    exists (select 1 from public.staff),
    (select count(*) from public.staff)::text || ' staff. Add the owner: see docs/NEW-RESTAURANT.md.'
  union all
  select 41, 'every staff row has a login',
    not exists (select 1 from public.staff s where not exists (select 1 from auth.users u where u.id = s.user_id)),
    'A staff row without an auth user can never sign in.'

  union all
  select 50, 'row level security on every table',
    not exists (
      select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
    ),
    coalesce((
      select string_agg(c.relname, ', ') from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
    ), 'all tables protected')
  union all
  select 51, 'the public can only insert bookings',
    coalesce((select string_agg(name || ':' || privileges, ' ' order by name) from anon_tables), '') = 'bookings:INSERT',
    coalesce((select string_agg(name || ':' || privileges, ' ' order by name) from anon_tables), 'nothing')
  union all
  select 52, 'the public can only call the two public functions',
    coalesce((select string_agg(name, ',' order by name) from anon_functions), '') = 'create_order,lookup_request,set_updated_at',
    coalesce((select string_agg(name, ', ' order by name) from anon_functions), 'nothing')
)
select check_name, ok, detail from checks order by sort;
