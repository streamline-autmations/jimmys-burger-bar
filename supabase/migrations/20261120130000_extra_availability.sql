-- A standalone extra on the staff ordering board and a topping of the same
-- name share availability. An extra offered only on a dish has no board row.
do $patch$
declare
  f text := pg_get_functiondef('public.create_order(text,text,text,text,text,text,text,text,timestamptz,numeric,boolean,jsonb)'::regprocedure);
  old_part text := 'if v_offered is null then';
  new_part text := $sql$if v_offered is null or exists (
          select from public.menu_items stock where stock.name = v_extra->>'name' and not stock.available
        ) then$sql$;
begin
  if (length(f) - length(replace(f, old_part, ''))) <> length(old_part) then
    raise exception 'unrecognised create_order extra check';
  end if;
  execute replace(f, old_part, new_part);
end $patch$;

do $patch$
declare
  f text := pg_get_functiondef(to_regprocedure('public.begin_payment(text,text,text,text)'));
  old_part text := 'from jsonb_array_elements(i.extras) as e(v) where not exists (';
  new_part text := $sql$from jsonb_array_elements(i.extras) as e(v) where exists (
        select from public.menu_items stock where stock.name = e.v->>'name' and not stock.available
      ) or not exists ($sql$;
begin
  if f is null then return; end if;
  if (length(f) - length(replace(f, old_part, ''))) <> length(old_part) then
    raise exception 'unrecognised begin_payment extra check';
  end if;
  execute replace(f, old_part, new_part);
end $patch$;
