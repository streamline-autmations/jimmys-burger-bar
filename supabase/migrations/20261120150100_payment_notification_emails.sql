-- Apply with the payment slice. An installation on the earlier order schema
-- can enable service emails independently and apply this migration later.
do $$ begin
  if not exists(select from pg_trigger where tgrelid='public.payment_events'::regclass and tgname='notification_email_refund') then
    create trigger notification_email_refund after insert on public.payment_events for each row
      when (new.kind='refund') execute function public.queue_notification_email();
  end if;
end $$;

-- Enrich only the verified paid receipt path. Preserve this project's installed
-- payload, including extras where supported.
do $$ declare f text; needle constant text := '''requested_time'',o.requested_time,''total'',o.total'; begin
  if to_regprocedure('public.mark_order_paid(text,text,text,numeric,jsonb)') is not null then
    f:=pg_get_functiondef('public.mark_order_paid(text,text,text,numeric,jsonb)'::regprocedure);
    if strpos(f,'''paid_at'',(select paid_at from public.orders where id=o.id)')>0 then return; end if;
    if strpos(f,needle)=0 then raise exception 'Unrecognised paid webhook'; end if;
    execute replace(f,needle,needle||',''paid_at'',(select paid_at from public.orders where id=o.id),''delivery_fee'',to_jsonb(o)->''delivery_fee''');
  end if;
end $$;
