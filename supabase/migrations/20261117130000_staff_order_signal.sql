-- Staff screens learn that an order changed through a PRIVATE broadcast that
-- only staff can join, instead of postgres_changes on public.orders.
--
-- Why: measured on staging 2026-11-17, postgres_changes on orders delivered an
-- UPDATE event (with no row data) to a logged-out subscriber. That still tells
-- anyone with the public key when orders arrive and move. A private channel is
-- authorised when it is joined, against the SELECT policy below, so a visitor
-- who is not staff cannot join at all.
--
-- The payload is the order id only. Screens treat it as "re-read now" and read
-- through their own RLS, so the signal carries no guest data.

create function public.signal_order_change() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- Supabase only: a plain Postgres (the PGlite tests) has no realtime schema.
  -- A failed signal never rolls back the order write; the screens' 15-second
  -- poll still picks the change up.
  if to_regprocedure('realtime.send(jsonb,text,text,boolean)') is not null then
    begin
      execute 'select realtime.send($1, $2, $3, true)' using jsonb_build_object('id', new.id), 'changed', 'staff:orders';
    -- OTHERS does not include query_canceled, which a statement timeout raises.
    exception when others or query_canceled then
      null;
    end;
  end if;
  return null;
end $$;
revoke all on function public.signal_order_change() from public, anon, authenticated;
create trigger orders_signal_change after insert or update on public.orders
  for each row execute function public.signal_order_change();

do $$ begin
  if to_regclass('realtime.messages') is not null then
    execute $policy$
      create policy "staff receive order signals" on realtime.messages for select to authenticated
        using (realtime.topic() = 'staff:orders' and extension = 'broadcast' and (select public.is_staff()))
    $policy$;
  end if;
  -- Added by 20261116120000; replaced by the signal above.
  if exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders') then
    alter publication supabase_realtime drop table public.orders;
  end if;
end $$;
