-- Restaurant Direct: project health check.
--
-- Read-only. Run it in the SQL editor of a restaurant's Supabase project after
-- setup, and again after any change. Every row should say ok = true; a false
-- row says what to fix. Structure is checked separately by
-- supabase/snapshot/compare.sql (zero rows = matches the baseline).
--
-- Written to run even when pg_cron is missing: cron.job is only read through
-- query_to_xml, which is evaluated only after the extension check passes.

with
settings as (select key, value from public.app_settings),
cron_ready as (select to_regclass('cron.job') is not null as ok),
review_jobs as (
  select
    case when (select ok from cron_ready)
      then (xpath('/row/n/text()', query_to_xml(
        $q$select count(*) as n from cron.job where command ~* 'send_review_requests'$q$, false, true, '')))[1]::text::int
      else 0 end as total,
    case when (select ok from cron_ready)
      then (xpath('/row/n/text()', query_to_xml(
        $q$select count(*) as n from cron.job where command ~* 'send_review_requests' and active and database = current_database()$q$, false, true, '')))[1]::text::int
      else 0 end as healthy,
    case when (select ok from cron_ready)
      then (xpath('/row/s/text()', query_to_xml(
        $q$select coalesce(string_agg(schedule || case when active then '' else ' (inactive)' end, ', '), 'none') as s from cron.job where command ~* 'send_review_requests'$q$, false, true, '')))[1]::text
      else 'pg_cron missing' end as detail
),
anon_table_level as (
  select c.relname::text || ':' || string_agg(p.privilege, ',' order by p.privilege) as item
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  cross join (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')) as p(privilege)
  where n.nspname = 'public' and c.relkind = 'r' and has_table_privilege('anon', c.oid, p.privilege)
  group by c.relname
),
anon_column_level as (
  select c.relname::text || ':' || string_agg(distinct p.privilege, ',') as item
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  cross join (values ('SELECT'), ('INSERT'), ('UPDATE'), ('REFERENCES')) as p(privilege)
  where n.nspname = 'public' and c.relkind = 'r' and has_any_column_privilege('anon', c.oid, p.privilege)
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
-- Without a database-wide entry revoking it, Postgres gives PUBLIC execute on
-- every new function regardless of any per-schema default.
public_execute_default as (
  select not exists (
    select 1 from pg_default_acl a
    where a.defaclrole = 'postgres'::regrole and a.defaclnamespace = 0 and a.defaclobjtype = 'f'
      and not exists (select 1 from aclexplode(a.defaclacl) x where x.grantee = 0)
  ) as open
),
open_defaults as (
  select distinct case a.defaclobjtype when 'r' then 'tables' when 'S' then 'sequences' when 'f' then 'functions' else a.defaclobjtype::text end
    || ' to ' || coalesce(nullif(x.grantee, 0)::regrole::text, 'PUBLIC') as item
  from pg_default_acl a
  join pg_namespace n on n.oid = a.defaclnamespace
  cross join lateral aclexplode(a.defaclacl) x
  where n.nspname = 'public'
    and a.defaclrole = 'postgres'::regrole
    and (x.grantee = 0 or x.grantee in ('anon'::regrole, 'authenticated'::regrole))
),
checks(sort, check_name, ok, detail) as (
  select 10, 'pg_net extension installed',
    exists (select 1 from pg_extension where extname = 'pg_net'),
    'Database → Extensions → pg_net. Without it no notification is ever sent.'
  union all
  select 11, 'pg_cron extension installed',
    exists (select 1 from pg_extension where extname = 'pg_cron') and (select ok from cron_ready),
    'Database → Extensions → pg_cron. Needed for the nightly review emails.'

  union all
  select 20, 'timezone setting is a real zone',
    exists (select 1 from settings s join pg_timezone_names z on z.name = s.value where s.key = 'timezone'),
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
  select 24, 'review emails: webhook and schedule agree',
    exists (select 1 from settings where key = 'webhook.review' and value like 'https://%')
      = ((select healthy from review_jobs) = 1),
    coalesce((select value from settings where key = 'webhook.review'), 'webhook off') || ' / job: ' || (select detail from review_jobs)
  union all
  select 25, 'no duplicate or inactive review jobs',
    (select total from review_jobs) = (select healthy from review_jobs) and (select total from review_jobs) <= 1,
    (select total from review_jobs)::text || ' scheduled, ' || (select healthy from review_jobs)::text || ' active in this database'

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
  select 51, 'the public has no table-wide privileges',
    not exists (select 1 from anon_table_level),
    coalesce((select string_agg(item, ' ' order by item) from anon_table_level), 'none')
  union all
  select 52, 'the public can only insert booking form columns',
    coalesce((select string_agg(item, ' ' order by item) from anon_column_level), '') = 'bookings:INSERT'
      and not has_column_privilege('anon', 'public.bookings', 'status', 'INSERT')
      and not has_column_privilege('anon', 'public.bookings', 'created_at', 'INSERT'),
    coalesce((select string_agg(item, ' ' order by item) from anon_column_level), 'nothing')
  union all
  select 53, 'the public can only call create_order and lookup_request',
    coalesce((select string_agg(name, ',' order by name) from anon_functions), '') = 'create_order,lookup_request',
    coalesce((select string_agg(name, ', ' order by name) from anon_functions), 'nothing')
  union all
  select 54, 'future tables and functions start closed',
    not exists (select 1 from open_defaults) and not (select open from public_execute_default),
    concat_ws('; ',
      (select string_agg(item, ', ' order by item) from open_defaults),
      case when (select open from public_execute_default) then 'new functions executable by PUBLIC' end,
      case when not exists (select 1 from open_defaults) and not (select open from public_execute_default) then 'closed' end)
)
select check_name, ok, detail from checks order by sort;
