import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Bell, BellOff, BellRing, Maximize, Phone, RefreshCw, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { config } from '../../config';
import { ConflictError, data as db } from '../../core/data';
import { useOnlineStatus } from '../../lib/useOnlineStatus';
import { formatTimeOnly } from './adminUtils';
import { chime, enableSound, soundReady } from './kitchenAlert';
import { disablePush, enablePush, errorCode, initialPushState, pushState, type PushState } from './kitchenPush';
import { useAdminResource } from './useAdminResource';
import type { OrderStatus, OrderWithItems } from './types';

// The orders queue as a kitchen screen: the POS window and the chef's phone.
// Realtime only says "something changed"; every change is re-read from the
// database, and the 15-second poll carries on underneath in case the push drops.

const POLL_MS = 15_000;
const LIMIT = 200;
const STALE_MS = 45_000;
const REMIND_MS = 20_000;
const MINUTE = 60_000;
const escalation = config.ordering.escalation ?? { afterMinutes: 5, name: 'the manager on duty' };

const NEXT: Partial<Record<string, { to: OrderStatus; label: string }>> = {
  accepted: { to: 'preparing', label: 'Start preparing' },
  preparing: { to: 'ready', label: 'Mark ready' },
  ready: { to: 'completed', label: 'Collected' },
};

const LANES = [
  { key: 'new', title: 'To accept', empty: 'Nothing waiting. New paid orders land here with a sound.', statuses: ['new'] },
  { key: 'cooking', title: 'In the kitchen', empty: 'Nothing on the go.', statuses: ['accepted', 'preparing'] },
  { key: 'ready', title: 'Ready to collect', empty: 'Nothing waiting at the counter.', statuses: ['ready'] },
];

const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const ago = (ms: number) => (ms < MINUTE ? `${Math.max(0, Math.round(ms / 1000))} s ago` : `${Math.floor(ms / MINUTE)} min ago`);
const roundUp5 = (ms: number) => Math.ceil(ms / (5 * MINUTE)) * 5 * MINUTE;
const waitingSince = (order: OrderWithItems) => new Date(order.paid_at ?? order.created_at).getTime();

/** The promised times offered on accept: the guest's slot (or the next 5 minutes), then +10 and +20. */
const etaOptions = (order: OrderWithItems, now: number) => {
  const base = roundUp5(Math.max(now, order.requested_time ? new Date(order.requested_time).getTime() : now));
  return [0, 10, 20].map((add) => new Date(base + add * MINUTE).toISOString());
};

type Connection = 'live' | 'polling' | 'reconnecting' | 'failing' | 'offline';
const CONNECTION: Record<Connection, { label: string; dot: string }> = {
  live: { label: 'Live', dot: 'bg-surface' },
  polling: { label: 'Checking every 15 s', dot: 'bg-surface/60' },
  reconnecting: { label: 'Reconnecting', dot: 'bg-accent' },
  failing: { label: 'Not updating', dot: 'bg-accent' },
  offline: { label: 'Offline', dot: 'bg-accent' },
};

const Ticket: React.FC<{
  order: OrderWithItems;
  now: number;
  busy: boolean;
  saving: boolean;
  onMove: (to: OrderStatus, eta?: string) => void;
}> = ({ order, now, busy, saving, onMove }) => {
  const fresh = order.status === 'new';
  const waited = now - waitingSince(order);
  const escalate = fresh && waited >= escalation.afterMinutes * MINUTE;
  const ref = order.order_no.split('-');
  const tail = ref.pop();
  const next = NEXT[order.status];
  const button = 'min-h-14 rounded-xl px-4 font-display text-lg font-bold transition-colors duration-150 disabled:opacity-50';

  return (
    <article
      aria-label={`Order ${order.order_no} for ${order.customer_name}, ${order.status}`}
      className={`admin-ticket-in overflow-hidden rounded-2xl ${fresh ? 'kitchen-alert bg-accent text-ink' : 'bg-surface text-ink ring-1 ring-ink/10'}`}
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold opacity-75">
              {ref.join('-')}-<span className="font-display text-2xl leading-none tracking-wide opacity-100">{tail}</span>
            </p>
            <h3 className="mt-1 break-words font-display text-2xl font-bold leading-tight">{order.customer_name}</h3>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs font-bold uppercase tracking-wider opacity-70">{order.eta ? 'Promised' : 'Collect'}</p>
            <p className="font-display text-3xl font-bold leading-none tabular-nums">{formatTimeOnly(order.eta ?? order.requested_time)}</p>
          </div>
        </div>

        <ul className="mt-3 space-y-1 text-lg font-semibold leading-snug lg:text-xl">
          {order.order_items.map((item) => (
            <li key={item.id} className="flex gap-2">
              <span className="w-9 shrink-0 font-display font-bold tabular-nums">{item.qty}×</span>
              <span className="min-w-0">{item.name}</span>
            </li>
          ))}
        </ul>

        {fresh ? (
          <p className="mt-3 font-bold" role="timer" aria-live="off">
            Paid, waiting <span className="font-display text-xl tabular-nums">{clock(waited)}</span>
          </p>
        ) : (
          <p className="mt-3 text-sm font-bold text-ink/65">{order.status === 'accepted' ? 'Accepted, not started' : order.status === 'preparing' ? 'Preparing' : 'Ready at the counter'}</p>
        )}
      </div>

      {escalate && (
        <p className="flex flex-wrap items-center gap-x-2 bg-primary px-4 py-3 font-bold text-surface sm:px-5">
          Not accepted for {Math.floor(waited / MINUTE)} min. Call {escalation.name}
          {escalation.phone && (
            <a href={`tel:${escalation.phone.replace(/[^\d+]/g, '')}`} className="inline-flex min-h-10 items-center gap-1.5 underline">
              <Phone size={16} aria-hidden="true" />
              {escalation.phone}
            </a>
          )}
        </p>
      )}

      <div className={`grid gap-2 p-3 sm:p-4 ${fresh ? 'bg-ink/[0.06]' : 'border-t border-ink/10 bg-paper'}`}>
        {fresh ? (
          <>
            <p className="px-1 text-sm font-bold">Accept and promise a time</p>
            <div className="grid grid-cols-3 gap-2">
              {etaOptions(order, now).map((eta, index) => (
                <button
                  key={eta}
                  type="button"
                  disabled={busy}
                  onClick={() => onMove('accepted', eta)}
                  className={`${button} px-2 ${index === 0 ? 'bg-primary text-surface hover:bg-primary/90' : 'bg-surface text-primary ring-1 ring-primary/25 hover:bg-paper'}`}
                >
                  <span className="sr-only">Accept, ready at </span>
                  {formatTimeOnly(eta)}
                </button>
              ))}
            </div>
          </>
        ) : next && (
          <button type="button" disabled={busy} onClick={() => onMove(next.to)} className={`${button} bg-primary text-surface hover:bg-primary/90`}>
            {next.label}
          </button>
        )}
        {saving && <p className="px-1 text-sm font-bold" role="status">Saving…</p>}
      </div>
    </article>
  );
};

export const AdminKitchen: React.FC = () => {
  const online = useOnlineStatus();
  const [now, setNow] = useState(() => Date.now());
  const [saving, setSaving] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Lock-screen alerts. 'unavailable' (unsupported, blocked, demo) renders nothing: the sound alert carries on.
  const [push, setPush] = useState<PushState>(initialPushState);
  const [pushBusy, setPushBusy] = useState(false);
  // Once staff tap, a slow mount check must not overwrite what the tap did.
  const pushTapped = useRef(false);
  useEffect(() => { void pushState().then((state) => { if (!pushTapped.current) setPush(state); }, () => {}); }, []);
  const togglePush = async () => {
    pushTapped.current = true;
    setPushBusy(true);
    try {
      setPush(await (push === 'on' ? disablePush() : enablePush()));
    } catch (failure) {
      // 42501: the database refused this account (signed in, but not on the staff list).
      setNotice((failure as { code?: string } | null)?.code === '42501'
        ? 'This account is not on the staff list, so it cannot get lock-screen alerts. Sign in with a staff account.'
        : push === 'on'
        ? 'Lock-screen alerts could not be switched off. Check the connection and tap again.'
        : `Lock-screen alerts could not be switched on. Check the connection and tap again. Sound alerts still work.${errorCode(failure)}`);
    } finally {
      setPushBusy(false);
    }
  };

  // Newest first: if a backlog of never-closed orders ever passes the cap, the
  // oldest drop off the screen, never a new paid order.
  const load = useCallback(() => db.listOrders({ view: 'active', limit: LIMIT, newestFirst: true }), []);
  const { data: orders, setData, loading, error, updatedAt, refresh, live } =
    useAdminResource<OrderWithItems[]>(load, [], { pollMs: POLL_MS, paused: saving !== null });

  // One clock drives the waiting timers, "updated N s ago" and the sound button.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Any tap on the screen unlocks sound again after the browser suspended it.
  useEffect(() => {
    const unlock = () => { if (!soundReady()) void enableSound(); };
    window.addEventListener('pointerdown', unlock);
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  // Keep the POS and phone screens awake while this page is in front.
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const request = async () => {
      if (document.visibilityState !== 'visible' || !('wakeLock' in navigator)) return;
      try { lock = await navigator.wakeLock.request('screen'); } catch { lock = null; }
    };
    void request();
    document.addEventListener('visibilitychange', request);
    return () => {
      document.removeEventListener('visibilitychange', request);
      void lock?.release().catch(() => {});
    };
  }, []);

  const lanes = useMemo(() => {
    const at = (order: OrderWithItems) => order.eta ?? order.requested_time ?? order.created_at;
    return LANES.map((lane) => ({
      ...lane,
      orders: orders
        .filter((order) => lane.statuses.includes(order.status))
        .sort((a, b) => (lane.key === 'new' ? waitingSince(a) - waitingSince(b) : at(a).localeCompare(at(b)))),
    }));
  }, [orders]);
  const waiting = lanes[0].orders;

  // Sound for every order this screen has not seen yet, then a reminder every
  // 20 seconds while anything is still unaccepted.
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!updatedAt) return;
    const ids = waiting.map((order) => order.id);
    const unseen = seen.current ? ids.filter((id) => !seen.current!.has(id)) : ids;
    seen.current = new Set([...(seen.current ?? []), ...ids]);
    if (unseen.length) chime();
  }, [waiting, updatedAt]);

  const count = waiting.length;
  useEffect(() => {
    if (!count) return;
    const timer = window.setInterval(chime, REMIND_MS);
    return () => window.clearInterval(timer);
  }, [count]);

  useEffect(() => {
    const previous = document.title;
    document.title = count ? `(${count}) New order · Kitchen` : `Kitchen · ${config.venue.name}`;
    return () => { document.title = previous; };
  }, [count]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 12_000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const move = async (order: OrderWithItems, to: OrderStatus, eta?: string) => {
    if (saving) return;
    setSaving(order.id);
    setNotice(null);
    try {
      await db.advanceOrderStatus(order.id, order.status, to, eta);
      setData((current) => current
        .map((item) => (item.id === order.id ? { ...item, status: to, eta: eta ?? item.eta } : item))
        .filter((item) => item.status !== 'completed'));
    } catch (failure) {
      setNotice(failure instanceof ConflictError
        ? `Order ${order.order_no} (${order.customer_name}) was already moved on another screen. Nothing was changed here; the screen now shows where it is.`
        : `Order ${order.order_no} was not saved. Check the connection, then tap again.`);
    } finally {
      setSaving(null);
    }
    void refresh();
  };

  const age = updatedAt ? now - updatedAt.getTime() : Infinity;
  const connection: Connection = !online ? 'offline' : error && age > STALE_MS ? 'failing' : live === false ? 'reconnecting' : live ? 'live' : 'polling';
  const sound = soundReady();
  const status = CONNECTION[connection];

  const banner = connection === 'offline'
    ? 'Offline. New orders cannot reach this screen. Check the Wi-Fi; the screen catches up by itself when the connection is back.'
    : connection === 'failing'
      ? `This screen last updated ${ago(age)}. Orders may be missing. Tap Refresh, or sign in again from the console.`
      : null;
  const capped = orders.length >= LIMIT;

  return (
    <div className="min-h-[100dvh] bg-paper pb-[calc(1.5rem+var(--admin-bottom-inset,0px))] text-ink">
      <header className="sticky top-0 z-30 bg-primary text-surface">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/admin/orders" className="inline-flex min-h-11 items-center gap-2 rounded-lg font-bold text-surface/80 hover:text-surface" aria-label="Back to the staff console">
            <ArrowLeft size={18} aria-hidden="true" />
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface p-1">
              <img src={config.assets.logo} alt="" width={32} height={32} className="max-h-full w-auto" />
            </span>
          </Link>
          <h1 className="font-display text-2xl font-bold">Kitchen</h1>

          <p role="status" className="inline-flex min-h-9 items-center gap-2 rounded-full bg-surface/[0.12] px-3 text-sm font-bold">
            <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${status.dot}`} />
            <span>{status.label}</span>
            <span className="font-semibold text-surface/70">{loading && !updatedAt ? 'Loading…' : updatedAt ? `Updated ${ago(age)}` : 'Not loaded'}</span>
          </p>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            {sound ? (
              <button type="button" onClick={chime} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-surface/[0.12] px-3.5 font-bold hover:bg-surface/20">
                <Bell size={17} aria-hidden="true" />
                Test alert
              </button>
            ) : (
              <button type="button" onClick={() => void enableSound().then((on) => { if (on) chime(); })} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 font-display font-bold text-ink">
                <BellOff size={17} aria-hidden="true" />
                Enable sound
              </button>
            )}
            {push !== 'unavailable' && (
              <button type="button" onClick={() => void togglePush()} disabled={pushBusy} aria-pressed={push === 'on'} className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-3.5 font-bold disabled:opacity-60 ${push === 'on' ? 'bg-surface text-primary' : 'bg-surface/[0.12] hover:bg-surface/20'}`}>
                <BellRing size={17} aria-hidden="true" />
                {push === 'on' ? 'Lock-screen alerts on' : 'Lock-screen alerts'}
              </button>
            )}
            <button type="button" onClick={() => void refresh()} disabled={loading} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-surface/[0.12] px-3.5 font-bold hover:bg-surface/20 disabled:opacity-60">
              <RefreshCw size={16} aria-hidden="true" className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            {document.fullscreenEnabled && (
              <button type="button" onClick={() => void document.documentElement.requestFullscreen().catch(() => {})} className="hidden min-h-11 items-center gap-2 rounded-xl bg-surface/[0.12] px-3.5 font-bold hover:bg-surface/20 lg:inline-flex">
                <Maximize size={16} aria-hidden="true" />
                Full screen
              </button>
            )}
          </div>
        </div>
        {!sound && (
          <p className="bg-accent/90 px-4 py-2 text-sm font-bold text-ink sm:px-6 lg:px-8">Sound is off until someone taps this screen. Tap Enable sound at the start of every shift.</p>
        )}
        {banner && (
          <div role="alert" className="flex items-start gap-3 bg-accent px-4 py-3 text-lg font-bold leading-snug text-ink sm:px-6 lg:px-8">
            <WifiOff size={22} aria-hidden="true" className="mt-0.5 shrink-0" />
            {banner}
          </div>
        )}
        {capped && (
          <p role="status" className="bg-surface px-4 py-2 text-sm font-bold text-ink sm:px-6 lg:px-8">
            Showing the newest {LIMIT} open orders. Older ones were never marked collected; close them on the Orders screen.
          </p>
        )}
        {notice && (
          <div role="alert" className="admin-note-in border-y-4 border-accent bg-surface px-4 py-3 font-bold text-ink sm:px-6 lg:px-8">
            {notice}
          </div>
        )}
      </header>

      <main className="grid items-start gap-6 px-4 pt-5 sm:px-6 lg:grid-cols-3 lg:gap-5 lg:px-8">
        {lanes.map((lane) => (
          <section key={lane.key} aria-labelledby={`lane-${lane.key}`} className="min-w-0">
            <h2 id={`lane-${lane.key}`} className="mb-3 flex items-baseline gap-2 font-display text-xl font-bold text-primary">
              {lane.title}
              <span className={`rounded-full px-2.5 text-base tabular-nums ${lane.key === 'new' && lane.orders.length ? 'bg-accent text-ink' : 'bg-ink/[0.07] text-ink/70'}`}>{lane.orders.length}</span>
            </h2>
            {!updatedAt ? (
              <p className="rounded-2xl bg-surface px-4 py-6 text-ink/60 ring-1 ring-ink/10">{loading ? 'Loading orders…' : 'Orders could not load. Tap Refresh.'}</p>
            ) : lane.orders.length === 0 ? (
              <p className="rounded-2xl border-2 border-dashed border-ink/15 px-4 py-6 font-semibold text-ink/60">{lane.empty}</p>
            ) : (
              <ul className="space-y-3">
                {lane.orders.map((order) => (
                  <li key={order.id}>
                    <Ticket order={order} now={now} busy={saving !== null} saving={saving === order.id} onMove={(to, eta) => void move(order, to, eta)} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </main>
    </div>
  );
};
