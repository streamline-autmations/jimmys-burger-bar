import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, RotateCcw, ShieldCheck } from 'lucide-react';
import { config } from '../config';
import { formatMoney, orderCtaLabel } from '../core/tenant';
import { toMinor } from '../core/domain/money';
import { data as db, type LookupResult } from '../core/data';
import { forgetEverything, orderAgain, useSavedDetails, useSavedOrders, type SavedOrder } from '../lib/orderHistory';

// The installed app's "My orders": the orders placed from THIS phone, kept on
// this phone only (src/lib/orderHistory.ts). Each status is read through the
// tracking page's own lookup (reference + email), so nothing new goes to the server.

type OrderResult = Extract<LookupResult, { kind: 'order' }>;
type Live = { phase: 'loading' } | { phase: 'found'; order: OrderResult } | { phase: 'unknown' };

const panel = 'bg-surface rounded-2xl shadow-[0_8px_30px_-14px_rgb(var(--color-ink)/0.2)] ring-1 ring-ink/[0.04]';

const placed = new Intl.DateTimeFormat(config.locale, {
  timeZone: config.timezone, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
});

/** The tracking page's wording, shortened to a label. */
function statusLabel(order: OrderResult): { text: string; tone: 'live' | 'ready' | 'done' | 'stopped' } {
  const pay = order.payment_status;
  const delivery = order.order_type === 'delivery';
  if (pay === 'pending') return { text: 'Not paid yet', tone: 'stopped' };
  if (pay === 'failed') return { text: 'Payment did not go through', tone: 'stopped' };
  if (pay === 'expired') return { text: 'Released, not paid', tone: 'stopped' };
  if (pay === 'refunded') return { text: 'Refunded', tone: 'stopped' };
  if (pay === 'refund_pending') return { text: 'Refund pending', tone: 'stopped' };
  switch (order.status) {
    case 'new': return { text: pay === 'paid' ? 'Paid, waiting to be accepted' : 'Received', tone: 'live' };
    case 'accepted': return { text: 'Accepted', tone: 'live' };
    case 'preparing': return { text: 'Preparing', tone: 'live' };
    case 'ready': return { text: delivery ? 'Ready, waiting for the rider' : 'Ready to collect', tone: 'ready' };
    case 'out_for_delivery': return { text: 'On its way', tone: 'ready' };
    case 'completed': return { text: delivery ? 'Delivered' : 'Collected', tone: 'done' };
    default: return { text: 'Cancelled', tone: 'stopped' };
  }
}

const TONES = {
  live: 'bg-accent/25 text-ink ring-accent/70',
  ready: 'bg-accent text-ink ring-ink',
  done: 'bg-paper text-ink/70 ring-ink/15',
  stopped: 'bg-paper text-ink ring-ink/30',
} as const;

const OrderCard: React.FC<{ order: SavedOrder; live: Live; onAgain: () => void }> = ({ order, live, onAgain }) => {
  const found = live.phase === 'found' ? live.order : null;
  const status = found ? statusLabel(found) : null;
  const items = found?.items.length ? found.items : order.items;
  const total = found ? toMinor(found.total) : order.total;

  return (
    <li className={`${panel} p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-lg font-extrabold leading-tight text-primary">{order.reference}</p>
          <p className="mt-0.5 text-xs font-semibold text-ink/60">{placed.format(new Date(order.placedAt))}</p>
        </div>
        <span className="shrink-0 font-display text-lg font-extrabold text-ink">{formatMoney(total)}</span>
      </div>

      <div className="mt-3 min-h-7" aria-live="polite">
        {live.phase === 'loading' && <span className="inline-block h-7 w-36 animate-pulse rounded-full bg-paper" aria-label="Checking status" />}
        {status && <span className={`inline-flex min-h-7 items-center rounded-full px-3 font-display text-sm font-bold ring-1 ${TONES[status.tone]}`}>{status.text}</span>}
        {live.phase === 'unknown' && <span className="text-sm text-ink/60">Status not available right now.</span>}
      </div>

      <p className="mt-3 text-sm leading-relaxed text-ink/75">{items.map((item) => `${item.qty}× ${item.name}`).join(', ')}</p>

      <div className="mt-4 flex flex-wrap gap-2.5 border-t border-ink/10 pt-4">
        <button type="button" onClick={onAgain} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 font-display text-sm font-bold text-ink">
          <RotateCcw size={16} aria-hidden="true" /> Order again
        </button>
        <Link to={`/track?ref=${encodeURIComponent(order.reference)}`} className="inline-flex min-h-11 items-center gap-1 rounded-full border border-ink/20 bg-surface px-4 font-display text-sm font-bold text-ink">
          Track <ChevronRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </li>
  );
};

export const MyOrders: React.FC = () => {
  const orders = useSavedOrders();
  const details = useSavedDetails();
  const navigate = useNavigate();
  const [live, setLive] = useState<Record<string, Live>>({});
  const [confirming, setConfirming] = useState(false);
  const references = orders.map((order) => order.reference).join(',');

  useEffect(() => {
    let alive = true;
    for (const order of orders) {
      setLive((current) => ({ ...current, [order.reference]: current[order.reference] ?? { phase: 'loading' } }));
      db.lookupRequest(order.reference, order.email)
        .then((result) => { if (alive) setLive((current) => ({ ...current, [order.reference]: result?.kind === 'order' ? { phase: 'found', order: result } : { phase: 'unknown' } })); })
        .catch(() => { if (alive) setLive((current) => ({ ...current, [order.reference]: { phase: 'unknown' } })); });
    }
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [references]);

  const again = (order: SavedOrder) => {
    const skipped = orderAgain(order);
    navigate('/order?view=cart', { state: { skipped, reordered: true } });
  };

  const hasAnything = orders.length > 0 || !!details;

  return (
    <div className="mx-auto max-w-xl px-4 pb-10 pt-3 md:px-8">
      <span className="font-script text-2xl text-primary">on this phone</span>
      <h1 className="mt-1 font-display text-4xl font-extrabold text-ink">My orders</h1>

      {orders.length === 0 ? (
        <div className={`${panel} mt-6 p-6 text-center`}>
          <p className="font-display text-lg font-bold text-ink">No orders on this phone yet</p>
          <p className="mt-2 text-sm text-ink/70">Orders you place in this app show up here, with their status and a one-tap Order again.</p>
          <Link to="/order" className="mt-5 inline-flex min-h-12 items-center rounded-full bg-primary px-6 font-display font-bold text-surface">{orderCtaLabel}</Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {orders.map((order) => (
            <OrderCard key={order.reference} order={order} live={live[order.reference] ?? { phase: 'loading' }} onAgain={() => again(order)} />
          ))}
        </ul>
      )}

      <section aria-labelledby="device-data-heading" className="mt-10 rounded-2xl bg-ink p-5 text-paper">
        <h2 id="device-data-heading" className="flex items-center gap-2 font-display text-lg font-extrabold text-accent">
          <ShieldCheck size={18} aria-hidden="true" /> Kept on this phone only
        </h2>
        <p className="mt-2 text-sm text-paper/80">
          {details
            ? <>Your name, phone number and email ({details.email}) fill in the checkout for you, and this list is how you track and reorder. None of it is kept anywhere except this phone.</>
            : <>When you order, this app remembers your contact details and the order on this phone, so checkout is quicker next time.</>}
        </p>
        {hasAnything && (confirming ? (
          <div className="mt-4 rounded-xl bg-paper/10 p-4">
            <p className="text-sm font-semibold">Remove your details and this order list from this phone? Orders you already placed still go ahead.</p>
            <div className="mt-3 flex flex-wrap gap-2.5">
              <button type="button" onClick={() => { forgetEverything(); setConfirming(false); }} className="inline-flex min-h-11 items-center rounded-full bg-accent px-5 font-display text-sm font-bold text-ink">Forget them</button>
              <button type="button" onClick={() => setConfirming(false)} className="inline-flex min-h-11 items-center rounded-full border border-paper/30 px-5 font-display text-sm font-bold text-paper">Keep them</button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className="mt-4 inline-flex min-h-11 items-center rounded-full border border-paper/30 px-5 font-display text-sm font-bold text-paper hover:bg-paper/10">
            Forget my details
          </button>
        ))}
        <p className="mt-4 text-sm">
          <Link to="/privacy" className="font-bold text-accent underline underline-offset-2">Privacy and your data</Link>
        </p>
      </section>
    </div>
  );
};
