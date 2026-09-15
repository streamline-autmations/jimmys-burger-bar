-- Structural fingerprint of a Restaurant Direct database.
--
-- Read-only. Run it against a live project (SQL editor or MCP execute_sql) and
-- the test suite runs the same query against the baseline in a local database.
-- One row per object with an md5 of its definition, so a difference points at
-- the exact table, function, trigger, policy or grant that drifted.
--
-- Platform-owned objects are excluded (Supabase's rls_auto_enable event
-- trigger function, and anything that belongs to an extension).

with
our_functions as (
  select p.oid, (p.proname::text || '(' || pg_get_function_identity_arguments(p.oid) || ')') as name
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prokind = 'f'
    and p.proname <> 'rls_auto_enable'
    and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
),
our_tables as (
  select c.oid, c.relname::text as relname
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
),
rows as (
  -- Every name is text: Postgres's own name type is capped at 63 bytes and
  -- would silently truncate long function signatures into duplicates.
  select 'table'::text as kind, t.relname::text as name, md5(concat_ws('|',
    (select string_agg(format('%I %s%s%s', a.attname, format_type(a.atttypid, a.atttypmod),
        case when a.attnotnull then ' not null' else '' end,
        case when d.adbin is not null then ' default ' || pg_get_expr(d.adbin, d.adrelid) else '' end), ',' order by a.attnum)
     from pg_attribute a left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
     where a.attrelid = t.oid and a.attnum > 0 and not a.attisdropped),
    (select string_agg(format('%s %s', con.conname, pg_get_constraintdef(con.oid)), ',' order by con.conname)
     from pg_constraint con where con.conrelid = t.oid),
    (select string_agg(pg_get_indexdef(i.indexrelid), ',' order by pg_get_indexdef(i.indexrelid))
     from pg_index i where i.indrelid = t.oid),
    (select relrowsecurity::text || ' force=' || relforcerowsecurity::text from pg_class where oid = t.oid)
  )) as fingerprint
  from our_tables t

  union all
  select 'function', f.name, md5(pg_get_functiondef(f.oid)) from our_functions f

  union all
  -- tgenabled too: a disabled trigger keeps an identical definition.
  select 'trigger', c.relname::text || '.' || tg.tgname::text, md5(pg_get_triggerdef(tg.oid) || ' enabled=' || tg.tgenabled::text)
  from pg_trigger tg
  join pg_class c on c.oid = tg.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and not tg.tgisinternal

  union all
  select 'policy', tablename::text || '.' || policyname::text, md5(concat_ws('|', permissive, cmd,
    array_to_string(roles, ','), qual, with_check))
  from pg_policies
  where schemaname = 'public'

  union all
  select 'table_grant', t.relname || ' ' || r.rolname, md5(concat_ws(',',
    case when has_table_privilege(r.rolname, t.oid, 'SELECT') then 'select' end,
    case when has_table_privilege(r.rolname, t.oid, 'INSERT') then 'insert' end,
    case when has_table_privilege(r.rolname, t.oid, 'UPDATE') then 'update' end,
    case when has_table_privilege(r.rolname, t.oid, 'DELETE') then 'delete' end,
    case when has_table_privilege(r.rolname, t.oid, 'TRUNCATE') then 'truncate' end,
    case when has_table_privilege(r.rolname, t.oid, 'REFERENCES') then 'references' end,
    case when has_table_privilege(r.rolname, t.oid, 'TRIGGER') then 'trigger' end))
  from our_tables t
  cross join (values ('anon'), ('authenticated')) as r(rolname)

  union all
  -- Column-level grants are invisible to has_table_privilege.
  select 'column_grant', t.relname || ' ' || r.rolname, md5(coalesce((
    select string_agg(a.attname || ':' || concat_ws(',',
      case when has_column_privilege(r.rolname, t.oid, a.attnum, 'SELECT') then 'select' end,
      case when has_column_privilege(r.rolname, t.oid, a.attnum, 'INSERT') then 'insert' end,
      case when has_column_privilege(r.rolname, t.oid, a.attnum, 'UPDATE') then 'update' end,
      case when has_column_privilege(r.rolname, t.oid, a.attnum, 'REFERENCES') then 'references' end), ';' order by a.attnum)
    from pg_attribute a
    where a.attrelid = t.oid and a.attnum > 0 and not a.attisdropped
  ), ''))
  from our_tables t
  cross join (values ('anon'), ('authenticated')) as r(rolname)

  union all
  select 'function_exec', f.name || ' ' || r.rolname,
    md5(has_function_privilege(r.rolname, f.oid, 'EXECUTE')::text)
  from our_functions f
  cross join (values ('anon'), ('authenticated')) as r(rolname)
)
select kind, name, fingerprint from rows
order by kind, name;
