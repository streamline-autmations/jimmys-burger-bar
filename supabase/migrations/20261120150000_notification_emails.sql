-- Branded email is opt-in per project. Existing order and booking receipt webhooks
-- keep their routing. A status webhook receives only a random, single-use ticket.
create table public.notification_email_queue (
  seq bigint generated always as identity primary key,
  subject_id uuid not null,
  event_key text not null,
  ticket uuid not null default gen_random_uuid() unique,
  receipt uuid,
  recipient text,
  event jsonb,
  posted_at timestamptz,
  claimed_at timestamptz,
  sent_at timestamptz,
  unique (subject_id, event_key)
);
alter table public.notification_email_queue enable row level security;
revoke all on public.notification_email_queue from public, anon, authenticated;
revoke all on sequence public.notification_email_queue_seq_seq from public, anon, authenticated;
create index notification_email_pending on public.notification_email_queue(subject_id,seq) where sent_at is null;

create function public.post_notification_emails() returns void language plpgsql security definer set search_path='' as $$
declare job record; url text := public.setting('webhook.status');
begin
  if url is null then return; end if;
  for job in select q.seq,q.ticket from public.notification_email_queue q
    where q.claimed_at is null and (q.posted_at is null or q.posted_at < now()-interval '2 minutes')
      and not exists (select from public.notification_email_queue prior where prior.subject_id=q.subject_id and prior.seq<q.seq and prior.sent_at is null)
    order by q.seq limit 50 for update skip locked
  loop
    perform net.http_post(url:=url,body:=jsonb_build_object('ticket',job.ticket));
    update public.notification_email_queue set posted_at=now() where seq=job.seq;
  end loop;
exception when others then
  -- Leave the durable job pending when pg_net is unavailable.
  raise log 'Notification email dispatch deferred (%)', sqlstate;
end $$;

create function public.queue_notification_email() returns trigger language plpgsql security definer set search_path='' as $$
declare e jsonb; key text; recipient text; subject_id uuid; o record;
  row_data jsonb := to_jsonb(new);
begin
  if public.setting('webhook.status') is null then return new; end if;
  if tg_table_name='orders' then
    if new.status=old.status or coalesce(row_data->>'payment_status','not_required') in ('pending','expired','failed') then return new; end if;
    key := 'order.'||new.status;
    subject_id:=new.id; recipient:=new.email;
    e:=jsonb_build_object('kind',key,'order_no',new.order_no);
    case new.status
      when 'accepted' then e:=e||jsonb_build_object('eta',row_data->'eta');
      when 'ready' then e:=e||jsonb_build_object('order_type',new.order_type);
      when 'out_for_delivery' then if new.order_type<>'delivery' then return new; end if;
      when 'cancelled' then
        if old.status='new' and row_data->>'paid_at' is null then return new; end if;
        if coalesce((row_data->>'payment_review_required')::boolean,false) and old.status='new' then return new; end if;
        e:=e||jsonb_build_object('paid_at',row_data->'paid_at','previouslyAccepted',old.status in ('accepted','preparing','ready','out_for_delivery','completed'));
      when 'preparing','completed' then null;
      else return new;
    end case;
  elsif tg_table_name='bookings' then
    if new.status=old.status or new.status not in ('confirmed','cancelled') then return new; end if;
    key:='booking.'||new.status; subject_id:=new.id; recipient:=new.email;
    e:=jsonb_build_object('kind',key,'booking',jsonb_build_object('date',new.booking_date,'time',new.booking_time,
      'guests',new.guests,'seating',new.seating_preference,'notes',new.notes));
  else
    if new.kind<>'refund' or new.status not in ('refund_pending','refunded') then return new; end if;
    select id,email,order_no into strict o from public.orders where id=new.order_id;
    subject_id:=o.id; recipient:=o.email;
    key:='refund.'||new.id::text;
    e:=jsonb_build_object('kind',case when new.status='refunded' then 'refund.recorded' else 'refund.pending' end,
      'order_no',o.order_no,'amount',new.amount);
  end if;
  insert into public.notification_email_queue(subject_id,event_key,recipient,event)
    values(subject_id,key,recipient,e) on conflict on constraint notification_email_queue_subject_id_event_key_key do nothing;
  perform public.post_notification_emails();
  return new;
end $$;

create trigger notification_email_order after update of status on public.orders for each row
  when (old.status is distinct from new.status) execute function public.queue_notification_email();
create trigger notification_email_booking after update of status on public.bookings for each row
  when (old.status is distinct from new.status) execute function public.queue_notification_email();

-- High-entropy capability issued inside the committed transaction; simultaneous
-- webhook deliveries can only claim it once. SMTP timeouts require reconciliation.
create unique index notification_email_receipt on public.notification_email_queue(receipt) where receipt is not null;
create function public.finish_notification_email(p_receipt uuid) returns void language plpgsql security definer set search_path='' as $$
begin
  update public.notification_email_queue set sent_at=now(),event=null,recipient=null,receipt=null
    where receipt=p_receipt and sent_at is null;
  if found then perform public.post_notification_emails(); end if;
end $$;

revoke all on function public.post_notification_emails(),public.queue_notification_email(),
  public.finish_notification_email(uuid) from public,anon,authenticated;
grant execute on function public.finish_notification_email(uuid) to anon;

create table public.review_email_preferences (
  email text primary key,
  token uuid not null unique default gen_random_uuid(),
  stopped_at timestamptz
);
alter table public.review_email_preferences enable row level security;
revoke all on public.review_email_preferences from public,anon,authenticated;

-- An opaque token lets the recipient stop review invitations only. Return the
-- same result for unknown tokens and repeated requests.
create function public.stop_review_emails(p_token uuid) returns void language sql security definer set search_path='' as $$
  update public.review_email_preferences set stopped_at=now() where token=p_token and stopped_at is null
$$;
revoke all on function public.stop_review_emails(uuid) from public,anon,authenticated;
grant execute on function public.stop_review_emails(uuid) to anon;

create function public.enqueue_review_email(p_id uuid,p_email text,p_type text) returns void
language plpgsql security definer set search_path='' as $$
declare pref public.review_email_preferences%rowtype;
begin
  insert into public.review_email_preferences(email) values(lower(trim(p_email))) on conflict do nothing;
  select * into strict pref from public.review_email_preferences where email=lower(trim(p_email));
  if pref.stopped_at is not null then return; end if;
  insert into public.notification_email_queue(subject_id,event_key,recipient,event) values
    (p_id,'review.'||p_type,p_email,jsonb_build_object('kind','review.requested','eligible',true,
      'optOutUrl',public.setting('email.review_optout_url')||'?token='||pref.token)) on conflict do nothing;
  perform public.post_notification_emails();
end $$;
revoke all on function public.enqueue_review_email(uuid,text,text) from public,anon,authenticated;

-- Preserve the existing nightly selection, dedupe and tenant-specific clock.
do $$ declare f text:=pg_get_functiondef('public.send_review_requests()'::regprocedure); a text; b text; k text;
begin
  foreach k in array array['order','booking'] loop
    a:=format($part$select net.http_post(url := v_url,
      body := jsonb_build_object('type','%s','id',r.id,'name',r.name,'email',r.email,'reference',r.reference)
    ) into v_req;
    insert into public.notification_log (kind, reference, url, request_id)
    values ('review', r.reference, v_url, v_req);$part$, k);
    if strpos(f,a)=0 then raise exception 'Unrecognised review webhook (%)',k; end if;
    b:=format($part$if not exists(select from public.review_email_preferences where email=lower(trim(r.email)) and stopped_at is not null) then
      if public.setting('webhook.status') is not null and public.setting('email.review_optout_url') is not null then
        perform public.enqueue_review_email(r.id,r.email,%L);
      else
        %s
      end if;
    end if;$part$,k,a);
    f:=replace(f,a,b);
  end loop;
  execute f;
end $$;

-- Suppression also applies if a guest opts out between queueing and dispatch.
create function public.claim_notification_email(p_ticket uuid) returns table(receipt uuid,recipient text,event jsonb)
language plpgsql security definer set search_path='' as $$
begin
  update public.notification_email_queue q set sent_at=now(), claimed_at=now(), recipient=null,event=null
    where q.ticket=p_ticket and q.claimed_at is null and q.event->>'kind'='review.requested'
      and exists(select from public.review_email_preferences p where p.email=lower(trim(q.recipient)) and p.stopped_at is not null);
  if found then perform public.post_notification_emails(); return; end if;
  return query update public.notification_email_queue q set claimed_at=now(),receipt=gen_random_uuid()
    where q.ticket=p_ticket and q.claimed_at is null and q.posted_at is not null and public.setting('webhook.status') is not null
    returning q.receipt,q.recipient,q.event;
end $$;

revoke all on function public.claim_notification_email(uuid) from public,anon,authenticated;
grant execute on function public.claim_notification_email(uuid) to anon;
