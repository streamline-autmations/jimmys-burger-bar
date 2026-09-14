import React, { useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Clock3, LoaderCircle, MessageCircle, RotateCw, Search, WifiOff, X } from 'lucide-react';
import { config } from '../config';
import { copy, formatMoney } from '../core/tenant';
import { toMinor } from '../core/domain/money';
import { data as db, isOffline, type LookupResult } from '../core/data';
import { fadeInUp } from '../lib/motion';
import { FormField } from '../components/forms/FormField';
import { ErrorSummary } from '../components/forms/ErrorSummary';
import { useFormErrors } from '../lib/useFormErrors';

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
  const [contact, setContact] = useState('');
  const [state, setState] = useState<LookupState>({ phase: 'idle' });
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

  const lookup = async () => {
    const id = ++request.current;
    setState({ phase: 'loading' });
    try {
      const result = await db.lookupRequest(reference, contact);
      if (id !== request.current) return;
      setState(result ? { phase: 'found', result, checkedAt: new Date() } : { phase: 'not-found' });
      if (result) setParams({ ref: result.reference }, { replace: true });
    } catch (error) {
      if (id !== request.current) return;
      setState({ phase: 'error', offline: isOffline(error) });
    }
    requestAnimationFrame(() => outcomeRef.current?.focus({ preventScroll: false }));
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.attempt()) return;
    void lookup();
  };

  const loading = state.phase === 'loading';

  return (
    <div className="pt-28 pb-24 min-h-screen">
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

          {state.phase === 'found' && <Result result={state.result} checkedAt={state.checkedAt} refreshing={loading} onRefresh={() => void lookup()} />}
        </div>

        <p className="mt-10 text-center text-sm text-ink/70">
          Nothing to track yet? <Link to="/order" className="font-bold text-primary underline underline-offset-2">Order online</Link>
          {config.features.reservations && <> or <Link to="/visit#book" className="font-bold text-primary underline underline-offset-2">book a table</Link></>}.
        </p>
      </div>
    </div>
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
            const done = index < currentIndex;
            const current = index === currentIndex;
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
      </dl>
      {result.items.length > 0 && (
        <ul className="mt-4 rounded-xl bg-paper/70 px-4 py-3 text-sm text-ink/80">
          {result.items.map((item) => <li key={item.name}><span className="font-bold text-primary">{item.qty}×</span> {item.name}</li>)}
        </ul>
      )}
      {refresh}
    </article>
  );
};
