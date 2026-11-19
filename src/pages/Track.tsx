import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell, BellOff, Check, Clock3, LoaderCircle, MessageCircle, RotateCw, Search, WifiOff, X } from 'lucide-react';
import { config } from '../config';
import { copy, formatMoney, orderCtaLabel } from '../core/tenant';
import { toMinor } from '../core/domain/money';
import { data as db, isOffline, type LookupResult } from '../core/data';
import { fadeInUp } from '../lib/motion';
import { FormField } from '../components/forms/FormField';
import { ErrorSummary } from '../components/forms/ErrorSummary';
import { useFormErrors } from '../lib/useFormErrors';
import { useCartStore } from '../lib/cartStore';
import { paymentStartMessage, readPending, submitHostedForm, writePending } from '../lib/payment';
import { WhatsAppFallback } from '../components/WhatsAppFallback';
import { Starburst } from '../components/Starburst';
import { InstallApp } from '../components/InstallApp';
import { useAppShell } from '../lib/appShell';
import { findSavedOrder, orderAgain } from '../lib/orderHistory';
import { alertState, disableAlert, enableAlert, type AlertState } from '../lib/guestPush';

type TrackField = 'reference' | 'contact';

const ORDER_STEPS = [
  { status: 'new', label: 'Received', detail: `Waiting for ${config.venue.name} to accept it.` },
  { status: 'accepted', label: 'Accepted', detail: 'The kitchen has your order.' },
  { status: 'preparing', label: 'Preparing', detail: 'Your food is being made.' },
  { status: 'ready', label: 'Ready', detail: 'Ready for you.' },
  { status: 'completed', label: 'Completed', detail: 'Enjoy your meal.' },
] as const;

const BOOKING_COPY: Record<string, { label: string; detail: string }> = {
  pending: { label: 'Requested', detail: `${config.venue.name} has your request and will confirm it with you.` },
  confirmed: { label: 'Confirmed', detail: 'Your table is booked. See you then.' },
  cancelled: { label: 'Cancelled', detail: `This booking is cancelled. Contact ${config.venue.name} if that is unexpected.` },
};

const dateTime = new Intl.DateTimeFormat(config.locale, {
  timeZone: config.timezone, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
});
const dateOnly = new Intl.DateTimeFormat(config.locale, {
  timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long',
});

const panel = 'bg-surface rounded-2xl p-6 md:p-8 shadow-[0_8px_30px_-14px_rgb(var(--color-ink)/0.2)] ring-1 ring-ink/[0.04]';

type LookupState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'found'; result: LookupResult; checkedAt: Date }
  | { phase: 'not-found' }
  | { phase: 'error'; offline: boolean };

/**
 * Customer-side "where is my order?".
 *
 * Before this, a customer who closed the confirmation tab had no way to see
 * their order again, and the only recovery after an uncertain send was to
 * message the restaurant. Lookup needs the reference and the contact used, and
 * the server returns nothing that identifies the customer.
 */
export const Track: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const [reference, setReference] = useState(() => params.get('ref') ?? '');
  // Back from the payment page: this device remembers which order and which
  // email, so the guest lands on their status instead of an empty form.
  const appShell = useAppShell();
  const [contact, setContact] = useState(() => {
    const saved = readPending();
    if (saved && (!params.get('ref') || saved.reference === params.get('ref'))) return saved.email;
    // The installed app remembers the email each of its own orders was placed with.
    const ref = params.get('ref');
    return (appShell && ref && findSavedOrder(ref)?.email) || '';
  });
  // 'return' or 'cancelled', as the payment page sent the guest back. Navigation only: never proof of payment.
  const [arrival] = useState(() => params.get('pay'));
  const [state, setState] = useState<LookupState>({ phase: 'idle' });
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const firstFound = useRef(0);
  const outcomeRef = useRef<HTMLDivElement>(null);
  const request = useRef(0);

  const errors = useMemo(() => {
    const found: Partial<Record<TrackField, string>> = {};
    if (reference.trim().length < 6) found.reference = 'Enter the reference from your confirmation.';
    if (!contact.trim()) found.contact = 'Enter the email address or phone number you used.';
    return found;
  }, [reference, contact]);
  const form = useFormErrors<TrackField>(errors);
  const summaryItems = (['reference', 'contact'] as TrackField[])
    .filter((field) => form.visible[field])
    .map((field) => ({ fieldId: `track-${field}`, message: form.visible[field]! }));

  // `silent` is the background re-check: it never blanks or replaces what is on screen with an error.
  const lookup = async (silent = false) => {
    const id = ++request.current;
    if (!silent) setState({ phase: 'loading' });
    try {
      const result = await db.lookupRequest(reference, contact);
      if (id !== request.current) return;
      if (result) {
        firstFound.current ||= Date.now();
        setState({ phase: 'found', result, checkedAt: new Date() });
        setParams({ ref: result.reference }, { replace: true });
      } else if (!silent) setState({ phase: 'not-found' });
    } catch (error) {
      if (id !== request.current || silent) return;
      setState({ phase: 'error', offline: isOffline(error) });
    }
    if (!silent) requestAnimationFrame(() => outcomeRef.current?.focus({ preventScroll: false }));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (reference.trim() && contact.trim()) void lookup(); }, []);

  const order = state.phase === 'found' && state.result.kind === 'order' ? state.result : null;
  const payment = order?.payment_status && order.payment_status !== 'not_required' ? order.payment_status : null;
  const closed = order ? order.status === 'completed' || order.status === 'cancelled' : true;

  // A paid-for order is followed without tapping: every 3 seconds while the
  // payment confirmation is awaited (2 minutes at most), then every 15 until it is collected.
  const pollMs = !payment || closed || payment === 'failed' ? 0
    : payment === 'pending' && Date.now() - firstFound.current < 120_000 ? 3000 : 15_000;
  useEffect(() => {
    if (!pollMs) return;
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void lookup(true); }, pollMs);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollMs, reference, contact]);

  // The cart survives the trip to the payment page and is emptied here, once,
  // when the server says the money arrived. A dead order stops being offered for payment.
  useEffect(() => {
    const saved = readPending();
    if (!order || !payment || saved?.reference !== order.reference) return;
    if (payment !== 'pending' && payment !== 'failed' && payment !== 'expired' && !saved.paid) {
      useCartStore.getState().clear();
      writePending({ ...saved, paid: true });
    }
    if (closed || payment === 'failed' || payment === 'expired') writePending(null);
  }, [order, payment, closed]);

  const payNow = async () => {
    if (!order) return;
    setPaying(true);
    setPayError(null);
    try {
      submitHostedForm(await db.beginPayment!(order.reference, contact.trim()));
    } catch (error) {
      setPaying(false);
      setPayError(paymentStartMessage(error instanceof Error ? error.message : ''));
    }
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.attempt()) return;
    void lookup();
  };

  const loading = state.phase === 'loading';

  return (
    <div className={`${appShell ? 'pt-3' : 'pt-28'} pb-24 min-h-screen`}>
      <div className="max-w-xl mx-auto px-4 md:px-8">
        <motion.div {...fadeInUp} className="mb-8">
          <span className="font-script text-2xl text-primary">{copy.track.eyebrow}</span>
          <h1 className="font-display text-4xl md:text-5xl font-extrabold text-ink mt-1">{copy.track.heading}</h1>
          <p className="text-ink/65 text-lg mt-3">{copy.track.intro}</p>
        </motion.div>

        <form noValidate onSubmit={submit} className={`${panel} space-y-5`} aria-busy={loading}>
          <ErrorSummary ref={form.summaryRef} items={form.submitted ? summaryItems : []} />
          <FormField id="track-reference" label="Reference" required error={form.visible.reference} hint={`Starts with ${config.ordering.orderPrefix}- for orders. Bookings use a long code.`}>
            {(control) => (
              <input
                {...control}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                onBlur={() => form.blur('reference')}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                maxLength={60}
                className="form-input font-display tracking-wide"
                placeholder={`${config.ordering.orderPrefix}-…`}
              />
            )}
          </FormField>
          <FormField id="track-contact" label="Email or phone number" required error={form.visible.contact}>
            {(control) => (
              <input
                {...control}
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                onBlur={() => form.blur('contact')}
                autoComplete="email"
                maxLength={254}
                className="form-input"
                placeholder="you@email.com or 082 123 4567"
              />
            )}
          </FormField>
          <button type="submit" disabled={loading} className="w-full min-h-14 bg-primary text-surface rounded-full font-display font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <LoaderCircle size={18} className="animate-spin" aria-hidden="true" /> : <Search size={18} aria-hidden="true" />}
            {loading ? 'Checking…' : 'Check status'}
          </button>
        </form>

        <div ref={outcomeRef} tabIndex={-1} aria-live="polite" className="mt-6 focus:outline-none">
          {state.phase === 'not-found' && (
            <div className={`${panel} text-ink`}>
              <p className="font-display text-lg font-bold">No match found</p>
              <p className="mt-2 text-ink/75">{copy.track.notFound}</p>
              <ContactLine reference={reference} />
            </div>
          )}

          {state.phase === 'error' && (
            <div role="alert" className="rounded-2xl border-2 border-ink bg-accent/15 p-5 text-ink">
              <p className="flex items-center gap-2 font-display text-lg font-bold">
                {state.offline && <WifiOff size={18} aria-hidden="true" />}
                {state.offline ? 'You seem to be offline' : 'We could not check right now'}
              </p>
              <p className="mt-2 text-sm">{state.offline ? 'Reconnect and try again.' : 'This is on our side, not a problem with your request. Try again in a moment.'}</p>
              <button type="button" onClick={() => void lookup()} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 font-display text-sm font-bold text-surface">
                <RotateCw size={16} aria-hidden="true" /> Try again
              </button>
            </div>
          )}

          {state.phase === 'found' && (order && payment
            ? <PaidOrder order={order} payment={payment} arrival={arrival} paying={paying} payError={payError} onPay={() => void payNow()} checkedAt={state.checkedAt} live={pollMs > 0} onRefresh={() => void lookup()} />
            : <Result result={state.result} checkedAt={state.checkedAt} refreshing={loading} onRefresh={() => void lookup()} />)}
          {order && contact.includes('@') && <OrderAlert order={order} email={contact.trim()} />}
          {/* Right after paying is when the app is worth most: next time it opens on the menu. */}
          {order && payment && !['pending', 'failed', 'expired'].includes(payment) && order.status !== 'cancelled' && (
            <InstallApp placement="after-order" className="mt-8" />
          )}
        </div>

        {state.phase !== 'found' && <p className="mt-10 text-center text-sm text-ink/70">
          Nothing to track yet? <Link to="/order" className="font-bold text-primary underline underline-offset-2">{orderCtaLabel}</Link>
          {config.features.reservations && <> or <Link to="/visit#book" className="font-bold text-primary underline underline-offset-2">book a table</Link></>}.
        </p>}
      </div>
    </div>
  );
};

/**
 * "Tell me when it is ready": one alert at ready, and for a delivery one more
 * when it leaves. Offered only while the order is paid (or needs no payment)
 * and still on its way, and only where it can actually work.
 */
const OrderAlert: React.FC<{ order: OrderResult; email: string }> = ({ order, email }) => {
  const delivery = order.order_type === 'delivery';
  const paid = !order.payment_status || order.payment_status === 'paid' || order.payment_status === 'not_required';
  const coming = ['new', 'accepted', 'preparing'].includes(order.status) || (delivery && order.status === 'ready');
  const [state, setState] = useState<AlertState>(() => alertState(order.reference));
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  if (!paid || !coming || state === 'unavailable') return null;

  const run = async (work: () => Promise<AlertState>) => {
    setBusy(true);
    setProblem(null);
    try {
      setState(await work());
    } catch (failure) {
      setProblem(failure instanceof Error && failure.message === 'ALERT_REFUSED'
        ? 'This order can no longer get an alert. It may already be ready or collected.'
        : 'This phone could not switch the alert on just now. Try again in a moment.');
    } finally {
      setBusy(false);
    }
  };
  const what = delivery ? 'when it is ready and when it leaves' : 'when it is ready to collect';

  return (
    <section aria-labelledby="order-alert-heading" className="mt-4 flex scroll-mb-28 gap-4 rounded-2xl bg-ink p-5 text-paper">
      <span className={`mt-0.5 flex h-11 w-11 shrink-0 -rotate-6 items-center justify-center rounded-full ${state === 'on' ? 'bg-accent text-ink' : 'bg-paper/10 text-accent'}`} aria-hidden="true">
        {state === 'blocked' ? <BellOff size={20} /> : <Bell size={20} />}
      </span>
      <div className="min-w-0">
        <h2 id="order-alert-heading" className="font-display text-lg font-extrabold text-accent">
          {state === 'on' ? 'Alert is on' : 'Get an alert on this phone'}
        </h2>
        {state === 'needs-home-screen' && (
          <p className="mt-1 text-sm text-paper/85">
            On iPhone, alerts only work once {config.venue.name} is on your Home Screen (iOS 16.4 or later): tap Share, then Add to Home Screen, then open it from there and track this order again.
          </p>
        )}
        {state === 'blocked' && <p className="mt-1 text-sm text-paper/85">Notifications are switched off for this site. Allow them in your phone's settings to get an alert.</p>}
        {state === 'off' && (
          <>
            <p className="mt-1 text-sm text-paper/85">We send one alert {what}. It shows no name, dish or amount.</p>
            <button type="button" disabled={busy} onClick={() => void run(() => enableAlert(order.reference, email))} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 font-display text-sm font-bold text-ink disabled:opacity-60">
              <Bell size={16} aria-hidden="true" /> {busy ? 'Switching on…' : 'Tell me when it is ready'}
            </button>
          </>
        )}
        {state === 'on' && (
          <>
            <p className="mt-1 text-sm text-paper/85">This phone gets an alert {what}.</p>
            <button type="button" disabled={busy} onClick={() => void run(() => disableAlert(order.reference, email))} className="mt-3 inline-flex min-h-11 items-center rounded-full border border-paper/30 px-5 font-display text-sm font-bold text-paper disabled:opacity-60">
              Turn off
            </button>
          </>
        )}
        {problem && <p role="alert" className="mt-3 text-sm font-semibold text-accent">{problem}</p>}
      </div>
    </section>
  );
};

const ContactLine: React.FC<{ reference: string }> = ({ reference }) => (
  <a
    href={`https://wa.me/${config.venue.whatsapp}?text=${encodeURIComponent(`Hi, I am checking on ${reference.trim() || 'my request'}.`)}`}
    target="_blank"
    rel="noopener noreferrer"
    className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-ink/20 bg-surface px-4 font-display text-sm font-bold text-ink hover:bg-paper"
  >
    <MessageCircle size={16} aria-hidden="true" /> WhatsApp {config.venue.name}
  </a>
);

type OrderResult = Extract<LookupResult, { kind: 'order' }>;
const checkedTime = new Intl.DateTimeFormat(config.locale, { timeZone: config.timezone, hour: '2-digit', minute: '2-digit' });

/**
 * Order again from the tracking page: the same dishes at today's prices, straight
 * to checkout. Anything no longer on the menu is named there, never swapped.
 */
const ReorderButton: React.FC<{ order: { items: { name: string; qty: number }[]; order_type: 'collection' | 'delivery' | 'table' }; className?: string }> = ({ order, className = '' }) => {
  const navigate = useNavigate();
  const appShell = useAppShell();
  if (order.items.length === 0) return null;
  return (
    <button
      type="button"
      onClick={() => {
        const skipped = orderAgain({ items: order.items, orderType: order.order_type });
        navigate(appShell ? '/order?view=cart' : '/order', { state: { skipped, reordered: true } });
      }}
      className={`inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-6 font-display font-bold text-surface ${className}`}
    >
      <RotateCw size={16} aria-hidden="true" /> Order this again
    </button>
  );
};

/**
 * A pay-first order. Payment and fulfilment are two separate facts and are
 * shown as two separate steps: "Payment received" is the server's word that
 * the money arrived, and only then can the restaurant accept the order.
 */
const PaidOrder: React.FC<{
  order: OrderResult; payment: string; arrival: string | null;
  paying: boolean; payError: string | null; onPay: () => void;
  checkedAt: Date; live: boolean; onRefresh: () => void;
}> = ({ order, payment, arrival, paying, payError, onPay, checkedAt, live, onRefresh }) => {
  const venue = config.venue.name;
  const stage = ORDER_STEPS.findIndex((step) => step.status === order.status); // -1 when cancelled
  const cancelled = order.status === 'cancelled';
  const unpaid = payment === 'pending' || payment === 'failed' || payment === 'expired';
  const awaiting = payment === 'pending' && arrival === 'return';
  const delivery = order.order_type === 'delivery';
  // Delivery adds a step between ready and done; collection keeps its five.
  const at = delivery && order.status === 'completed' ? 5 : delivery && order.status === 'out_for_delivery' ? 4 : stage;

  const [heading, detail] =
    payment === 'pending' ? (awaiting
      ? ['Waiting for payment confirmation', 'Coming back from Payfast is not proof of payment. This page updates on its own as soon as Payfast confirms it, usually within a minute.']
      : ['Not paid yet', `This order is saved but not paid, so ${venue} has not received it. Unpaid orders are released after 30 minutes.`])
    : payment === 'failed' ? ['Payment did not go through', `Payfast reported that this payment failed, so ${venue} has not received the order. Your cart is still saved.`]
    : payment === 'expired' ? ['Order released, not paid', `This order was not paid within 30 minutes, so it was released. ${venue} did not receive it.`]
    : payment === 'refunded' ? ['Refunded', `This order was refunded. Contact ${venue} if that is unexpected.`]
    : payment === 'refund_pending' && cancelled && delivery ? ['Not delivered, refund pending', `This order could not be delivered, so ${venue} is refunding your payment. Contact ${venue} with your reference if you have questions.`]
    : payment === 'refund_pending' && cancelled ? ['Refund pending', `This order is cancelled and ${venue} is refunding your payment. Contact ${venue} with your reference if you have questions.`]
    : cancelled ? ['Paid, but not going ahead', `Your payment was received, but this order is cancelled and will not be made. Contact ${venue} with your reference about a refund.`]
    : at <= 0 ? ['Payment received', `Waiting for ${venue} to accept your order.`]
    : at === 1 ? [`${venue} accepted your order`, 'The kitchen has it.']
    : at === 2 ? ['Preparing', 'Your food is being made.']
    : at === 3 ? (delivery ? ['Ready, waiting for the rider', 'Your food is packed and waiting to go out.'] : ['Ready to collect', `Collect at ${config.venue.address}.`])
    : delivery && at === 4 ? ['Out for delivery', 'Your food is on its way.']
    : delivery ? ['Delivered', 'Enjoy your meal.']
    : ['Collected', 'Enjoy your meal.'];

  const steps: { label: string; state: 'done' | 'current' | 'todo' }[] = delivery ? [
    { label: 'Payment received', state: unpaid ? 'current' : 'done' },
    { label: `${venue} accepted your order`, state: at >= 1 ? 'done' : unpaid ? 'todo' : 'current' },
    { label: 'Preparing', state: at > 2 ? 'done' : at === 2 ? 'current' : 'todo' },
    { label: 'Ready', state: at > 3 ? 'done' : at === 3 ? 'current' : 'todo' },
    { label: 'Out for delivery', state: at > 4 ? 'done' : at === 4 ? 'current' : 'todo' },
    { label: 'Delivered', state: at === 5 ? 'done' : 'todo' },
  ] : [
    { label: 'Payment received', state: unpaid ? 'current' : 'done' },
    { label: `${venue} accepted your order`, state: stage >= 1 ? 'done' : unpaid ? 'todo' : 'current' },
    { label: 'Preparing', state: stage > 2 ? 'done' : stage === 2 ? 'current' : 'todo' },
    { label: 'Ready to collect', state: stage > 3 ? 'done' : stage === 3 ? 'current' : 'todo' },
    { label: 'Collected', state: stage === 4 ? 'done' : 'todo' },
  ];
  if (unpaid) steps[0].label = awaiting ? 'Waiting for payment confirmation' : 'Payment';

  return (
    <article className={`${panel} relative`} aria-labelledby="track-result-heading">
      {/* The one stamp in the flow: it lands only on the server's word that the money arrived. */}
      {!unpaid && !cancelled && (
        <div className="absolute -top-6 right-3 rotate-6 md:right-6" aria-hidden="true">
          <Starburst label="payment" value="PAID" className="h-20 w-20" />
        </div>
      )}
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink/55">Order {order.reference}</p>
      <h2 id="track-result-heading" className="mt-1 pr-20 font-display text-3xl font-extrabold text-primary">{heading}</h2>
      <p className="mt-2 text-ink/75">{detail}</p>

      {payment === 'pending' && (
        <div className="mt-5 rounded-xl bg-accent/15 p-4 ring-1 ring-accent/50">
          {awaiting && <p className="mb-3 text-sm font-semibold text-ink">Only if you left Payfast without paying:</p>}
          <button type="button" onClick={onPay} disabled={paying} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-6 font-display font-bold text-surface disabled:opacity-50">
            {paying ? 'Taking you to Payfast…' : `Pay ${formatMoney(toMinor(order.total))} now`}
          </button>
          <Link to="/order" className="ml-3 inline-flex min-h-12 items-center font-display text-sm font-bold text-primary underline underline-offset-2">Change my order</Link>
          {payError && <p role="alert" className="mt-3 text-sm font-semibold text-ink">{payError}</p>}
          <WhatsAppFallback lines={order.items} className="mt-4 border-t border-ink/15 pt-4" />
        </div>
      )}
      {(payment === 'failed' || payment === 'expired') && (
        <div className="mt-5">
          <ReorderButton order={order} />
          <WhatsAppFallback lines={order.items} className="mt-4" />
        </div>
      )}
      {!unpaid && cancelled && <ContactLine reference={order.reference} />}

      {!cancelled && payment !== 'failed' && (
        <ol className="mt-6 space-y-0" aria-label="Order progress">
          {steps.map((step, index) => (
            <li key={index} className="relative flex items-center gap-3 pb-4 last:pb-0" aria-current={step.state === 'current' ? 'step' : undefined}>
              {index < steps.length - 1 && (
                <span className={`absolute left-[13px] top-7 h-[calc(100%-1.25rem)] w-0.5 ${step.state === 'done' ? 'bg-primary' : 'bg-ink/15'}`} aria-hidden="true" />
              )}
              <span
                className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                  step.state === 'done' ? 'bg-primary text-surface' : step.state === 'current' ? 'bg-accent text-ink ring-2 ring-primary' : 'bg-paper text-ink/40 ring-1 ring-ink/15'
                }`}
                aria-hidden="true"
              >
                {step.state === 'done' ? <Check size={14} strokeWidth={3} /> : step.state === 'current' ? <Clock3 size={14} /> : null}
              </span>
              <span className={`font-display text-sm font-bold ${step.state === 'current' ? 'text-ink' : step.state === 'done' ? 'text-ink/75' : 'text-ink/50'}`}>
                {step.label}
                <span className="sr-only">{step.state === 'done' ? ', done' : step.state === 'current' ? ', current step' : ', not yet'}</span>
              </span>
            </li>
          ))}
        </ol>
      )}

      <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
        <div><dt className="text-ink/60">{delivery ? 'Delivery time' : 'Collection time'}</dt><dd className="font-display font-bold text-ink">{order.requested_time ? dateTime.format(new Date(order.requested_time)) : 'Not set'}</dd></div>
        <div><dt className="text-ink/60">{unpaid ? 'Total' : 'Paid'}</dt><dd className="font-display font-bold text-ink">{formatMoney(toMinor(order.total))}</dd></div>
        {delivery && !!order.delivery_fee && <div className="col-span-2"><dt className="text-ink/60">Includes delivery fee</dt><dd className="font-display font-bold text-ink">{formatMoney(toMinor(order.delivery_fee))} <span className="font-body text-xs font-semibold text-ink/60">{config.ordering.deliveryPreview?.feeNote}</span></dd></div>}
        {order.eta && !cancelled && order.status !== 'completed' && <div className="col-span-2"><dt className="text-ink/60">Kitchen expects it ready</dt><dd className="font-display font-bold text-ink">{checkedTime.format(new Date(order.eta))}</dd></div>}
        {!delivery && <div className="col-span-2"><dt className="text-ink/60">Collect from</dt><dd className="font-display font-bold text-ink">{venue}, {config.venue.address}</dd></div>}
      </dl>
      {order.items.length > 0 && (
        <ul className="mt-4 rounded-xl bg-paper/70 px-4 py-3 text-sm text-ink/80">
          {order.items.map((item) => <li key={item.name}><span className="font-bold text-primary">{item.qty}×</span> {item.name}</li>)}
        </ul>
      )}
      {order.status === 'completed' && <ReorderButton order={order} className="mt-5" />}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-4 text-sm text-ink/65">
        <span>Checked at {checkedTime.format(checkedAt)}{live ? '. Updates on its own while this page is open.' : ''}</span>
        <button type="button" onClick={onRefresh} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ink/20 px-4 font-display font-bold text-ink">
          <RotateCw size={15} aria-hidden="true" /> Check again
        </button>
      </div>
    </article>
  );
};

const Result: React.FC<{ result: LookupResult; checkedAt: Date; refreshing: boolean; onRefresh: () => void }> = ({ result, checkedAt, refreshing, onRefresh }) => {
  const checked = new Intl.DateTimeFormat(config.locale, { timeZone: config.timezone, hour: '2-digit', minute: '2-digit' }).format(checkedAt);

  const refresh = (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-4 text-sm text-ink/65">
      <span>Checked at {checked}</span>
      <button type="button" onClick={onRefresh} disabled={refreshing} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ink/20 px-4 font-display font-bold text-ink disabled:opacity-50">
        <RotateCw size={15} className={refreshing ? 'animate-spin' : ''} aria-hidden="true" /> Check again
      </button>
    </div>
  );

  if (result.kind === 'booking') {
    const status = BOOKING_COPY[result.status] ?? { label: result.status, detail: '' };
    return (
      <article className={panel} aria-labelledby="track-result-heading">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink/55">Table booking</p>
        <h2 id="track-result-heading" className="mt-1 font-display text-3xl font-extrabold text-primary">{status.label}</h2>
        <p className="mt-2 text-ink/75">{status.detail}</p>
        <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
          <div><dt className="text-ink/60">Date</dt><dd className="font-display font-bold text-ink">{dateOnly.format(new Date(`${result.booking_date}T00:00:00Z`))}</dd></div>
          <div><dt className="text-ink/60">Time</dt><dd className="font-display font-bold text-ink">{result.booking_time}</dd></div>
          <div><dt className="text-ink/60">Guests</dt><dd className="font-display font-bold text-ink">{result.guests}</dd></div>
          <div><dt className="text-ink/60">Seating</dt><dd className="font-display font-bold text-ink">{result.seating_preference}</dd></div>
        </dl>
        {refresh}
      </article>
    );
  }

  const cancelled = result.status === 'cancelled';
  const currentIndex = ORDER_STEPS.findIndex((step) => step.status === result.status);

  return (
    <article className={panel} aria-labelledby="track-result-heading">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink/55">Order {result.reference}</p>
      <h2 id="track-result-heading" className="mt-1 font-display text-3xl font-extrabold text-primary">
        {cancelled ? 'Cancelled' : ORDER_STEPS[currentIndex]?.label ?? result.status}
      </h2>
      <p className="mt-2 text-ink/75">
        {cancelled ? `This order was cancelled. Contact ${config.venue.name} if that is unexpected.` : ORDER_STEPS[currentIndex]?.detail}
      </p>

      {!cancelled && (
        <ol className="mt-6 space-y-0" aria-label="Order progress">
          {ORDER_STEPS.map((step, index) => {
            // A completed order has every step ticked, the last one included.
            const finished = result.status === 'completed';
            const done = index < currentIndex || finished;
            const current = !finished && index === currentIndex;
            return (
              <li key={step.status} className="relative flex items-center gap-3 pb-4 last:pb-0" aria-current={current ? 'step' : undefined}>
                {index < ORDER_STEPS.length - 1 && (
                  <span className={`absolute left-[13px] top-7 h-[calc(100%-1.25rem)] w-0.5 ${done ? 'bg-primary' : 'bg-ink/15'}`} aria-hidden="true" />
                )}
                <span
                  className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    done ? 'bg-primary text-surface' : current ? 'bg-accent text-ink ring-2 ring-primary' : 'bg-paper text-ink/40 ring-1 ring-ink/15'
                  }`}
                  aria-hidden="true"
                >
                  {done ? <Check size={14} strokeWidth={3} /> : current ? <Clock3 size={14} /> : null}
                </span>
                <span className={`font-display text-sm font-bold ${current ? 'text-ink' : done ? 'text-ink/75' : 'text-ink/50'}`}>
                  {step.label}
                  <span className="sr-only">{done ? ', done' : current ? ', current step' : ', not yet'}</span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
      {cancelled && <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-paper px-3 py-1.5 text-sm font-bold text-ink ring-1 ring-ink/20"><X size={14} aria-hidden="true" /> Not going ahead</p>}

      <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
        <div><dt className="text-ink/60">Requested for</dt><dd className="font-display font-bold text-ink">{result.requested_time ? dateTime.format(new Date(result.requested_time)) : 'Not set'}</dd></div>
        <div><dt className="text-ink/60">Total</dt><dd className="font-display font-bold text-ink">{formatMoney(toMinor(result.total))}</dd></div>
        {result.eta && !cancelled && result.status !== 'completed' && <div className="col-span-2"><dt className="text-ink/60">Kitchen expects it ready</dt><dd className="font-display font-bold text-ink">{checkedTime.format(new Date(result.eta))}</dd></div>}
      </dl>
      {result.items.length > 0 && (
        <ul className="mt-4 rounded-xl bg-paper/70 px-4 py-3 text-sm text-ink/80">
          {result.items.map((item) => <li key={item.name}><span className="font-bold text-primary">{item.qty}×</span> {item.name}</li>)}
        </ul>
      )}
      {result.status === 'completed' && <ReorderButton order={result} className="mt-5" />}
      {refresh}
    </article>
  );
};
