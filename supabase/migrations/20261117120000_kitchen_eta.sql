-- Kitchen screen: the time staff promise when they accept an order.
-- Additive. Staff set it through the existing "staff can update orders" policy,
-- in the same compare-and-set update that accepts the order, so two screens
-- cannot both accept with different times. Guests see it on /track.
--
-- Live updates for staff screens: see 20261117130000. payment_events needs no
-- signal of its own: every payment change also updates its order row.

alter table public.orders add column eta timestamptz;

do $$ declare f text; begin
  f := pg_get_functiondef('public.lookup_request(text,text)'::regprocedure);
  if position('''status'', v_order.status,' in f) = 0 then raise exception 'unrecognised lookup_request order block'; end if;
  f := replace(f, '''status'', v_order.status,', '''status'', v_order.status, ''eta'', v_order.eta,');
  execute f;
end $$;
