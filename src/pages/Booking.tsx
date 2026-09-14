import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, Download, PartyPopper, Search, WifiOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { fadeInUp } from '../lib/motion';
import { readSession, writeSession } from '../lib/sessionDraft';
import { data as db, SubmissionError, type NewBooking, type SubmissionFailure } from '../core/data';
import { config } from '../config';
import { storageKey, copy } from '../core/tenant';
import { addDays, contactFieldErrors, latestTime, restaurantDate, slotFieldErrors, tradingHours } from '../lib/tradingHours';
import { FormField } from '../components/forms/FormField';
import { ErrorSummary } from '../components/forms/ErrorSummary';
import { SubmissionNotice, UnconfirmedRequest } from '../components/forms/SubmissionNotice';
import { useFormErrors } from '../lib/useFormErrors';
import { useOnlineStatus } from '../lib/useOnlineStatus';

type BookingField = 'name' | 'phone' | 'email' | 'date' | 'time';

const FIELD_IDS: Record<BookingField, string> = {
  name: 'booking-name',
  phone: 'booking-phone',
  email: 'booking-email',
  date: 'booking-date',
  time: 'booking-time',
};

const FIELD_ORDER: BookingField[] = ['name', 'phone', 'email', 'date', 'time'];

const ATTEMPT_KEY = storageKey('booking-attempt');

const emptyBooking = () => ({
  name: '', email: '', phone: '',
  guests: String(Math.min(2, config.booking.maxGuests)),
  date: '', time: '',
  seating: config.booking.seatingOptions[0],
  notes: '',
});

export const Booking: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const online = useOnlineStatus();
  const [previousReference, setPreviousReference] = useState(() => readSession(ATTEMPT_KEY));
  const [booking, setBooking] = useState(emptyBooking);
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<{ kind: SubmissionFailure; offline: boolean; message: string } | null>(null);
  const [confirmed, setConfirmed] = useState<{ reference: string; details: ReturnType<typeof emptyBooking> } | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // One reference per attempt. It survives a failed send, so a retry after a
  // timeout re-sends the same booking instead of creating a second one.
  const attemptId = useRef<string>(crypto.randomUUID());
  // The exact payload that went out, so "Try again" repeats it even if the
  // form below were somehow edited in the meantime.
  const sentPayload = useRef<NewBooking | null>(null);
  // What the customer saw when that payload went out, for the confirmation.
  const sentDetails = useRef<ReturnType<typeof emptyBooking> | null>(null);
  // Once an attempt has been uncertain it stays uncertain until it succeeds:
  // a later refusal only proves the RETRY saved nothing, not the first send.
  const attemptWasUncertain = useRef(false);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);
  const sending = useRef(false);
  const noticeRef = useRef<HTMLDivElement>(null);
  const confirmedHeadingRef = useRef<HTMLHeadingElement>(null);

  // Move focus to the confirmation once, so a screen reader announces it and a
  // phone user is not left looking at where the submit button used to be.
  useEffect(() => { if (confirmed) confirmedHeadingRef.current?.focus(); }, [confirmed]);

  const today = restaurantDate();
  const lastDate = addDays(today, config.booking.maxDaysAhead);
  const selectedHours = tradingHours(booking.date);

  // Validation reads the clock, so it is re-run at submit with a fresh time.
  const validate = (at: Date): Partial<Record<BookingField, string>> => ({
    ...contactFieldErrors(booking.name, booking.phone, booking.email),
    ...slotFieldErrors(booking.date, booking.time, at),
    ...(booking.date > lastDate ? { date: `Choose a date within the next ${config.booking.maxDaysAhead} days.` } : {}),
  });
  const [clock, setClock] = useState(() => Date.now());
  const errors = useMemo(() => validate(new Date(clock)), [booking, lastDate, clock]); // eslint-disable-line react-hooks/exhaustive-deps
  const form = useFormErrors<BookingField>(errors);

  const summaryItems = FIELD_ORDER
    .filter((field) => form.visible[field])
    .map((field) => ({ fieldId: FIELD_IDS[field], message: form.visible[field]! }));

  const locked = submitting || failure?.kind === 'uncertain';

  const update = (key: keyof ReturnType<typeof emptyBooking>, value: string) => {
    setBooking((current) => ({ ...current, [key]: value }));
    if (failure && failure.kind !== 'uncertain') setFailure(null);
  };

  const updateDate = (date: string) => {
    const hours = tradingHours(date);
    setBooking((current) => ({
      ...current,
      date,
      // Keep the chosen time only if it still falls inside the new day's hours.
      time: hours && current.time >= hours.open && current.time < hours.close ? current.time : '',
    }));
    if (failure && failure.kind !== 'uncertain') setFailure(null);
  };

  const focusNotice = () => requestAnimationFrame(() => {
    noticeRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    noticeRef.current?.focus({ preventScroll: true });
  });

  const send = async (payload: NewBooking) => {
    if (sending.current) return;
    if (!navigator.onLine) {
      setFailure({ kind: failure?.kind === 'uncertain' ? 'uncertain' : 'rejected', offline: true, message: 'Nothing was sent because this device has no connection. Reconnect, then try again.' });
      focusNotice();
      return;
    }

    sending.current = true;
    setSubmitting(true);
    if (sentPayload.current?.id !== payload.id) sentDetails.current = booking;
    sentPayload.current = payload;
    writeSession(ATTEMPT_KEY, payload.id);
    // Only clear the checkpoint if it is still ours. A send that finishes after
    // the customer left and started another must not erase the newer one.
    const clearCheckpoint = () => { if (readSession(ATTEMPT_KEY) === payload.id) writeSession(ATTEMPT_KEY, null); };

    try {
      await db.createBooking(payload);
      clearCheckpoint();
      attemptWasUncertain.current = false;
      if (!mounted.current) return;
      setFailure(null);
      setConfirmed({ reference: payload.id, details: sentDetails.current ?? booking });
    } catch (error) {
      const failed = error instanceof SubmissionError ? error : new SubmissionError('uncertain');
      const stillUncertain = failed.kind === 'uncertain' || attemptWasUncertain.current;
      if (stillUncertain) attemptWasUncertain.current = true;
      else clearCheckpoint();
      if (!mounted.current) return;
      setFailure({
        kind: stillUncertain ? 'uncertain' : failed.kind,
        offline: failed.offline,
        message: failed.kind !== 'uncertain' && stillUncertain
          ? `Trying again did not go through either. Your first attempt may still have reached ${config.venue.name}, so check its status before sending anything new.`
          : failed.kind === 'throttled' ? copy.booking.throttled
          : failed.kind === 'rejected' ? copy.booking.rejected
          : failed.offline ? 'The connection dropped while sending, so we could not confirm it arrived.'
          : 'The connection timed out before we heard back, so we cannot tell whether it arrived.',
      });
      focusNotice();
    } finally {
      sending.current = false;
      if (mounted.current) setSubmitting(false);
    }
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (locked) return;
    const now = Date.now();
    setClock(now);
    if (!form.attempt(validate(new Date(now)))) return;
    void send({
      id: attemptId.current,
      name: booking.name.trim(),
      email: booking.email.trim(),
      phone: booking.phone.trim(),
      guests: Number(booking.guests),
      bookingDate: booking.date,
      bookingTime: booking.time,
      seatingPreference: booking.seating,
      notes: booking.notes.trim() || null,
      marketingConsent: false,
    });
  };

  const retry = () => { if (sentPayload.current) void send(sentPayload.current); };

  const discardAttempt = () => {
    writeSession(ATTEMPT_KEY, null);
    attemptId.current = crypto.randomUUID();
    sentPayload.current = null;
    sentDetails.current = null;
    attemptWasUncertain.current = false;
    setFailure(null);
  };

  const startAgain = () => {
    discardAttempt();
    setPreviousReference(null);
    setConfirmed(null);
    setBooking(emptyBooking());
    form.reset();
  };

  const downloadConfirmation = async () => {
    if (!confirmed) return;
    setDownloadError(null);
    try {
      const { generateBookingConfirmation } = await import('../lib/generateBookingConfirmation');
      await generateBookingConfirmation({ reference: confirmed.reference, ...confirmed.details });
    } catch {
      setDownloadError('Could not generate the booking slip. Please try again.');
    }
  };

  if (!config.features.reservations) {
    return <p className="mx-auto max-w-xl px-4 py-8 text-ink/75">{copy.booking.disabled}</p>;
  }

  if (previousReference) {
    return <UnconfirmedRequest noun="booking" reference={previousReference} onStartAgain={startAgain} className={embedded ? 'py-8' : 'min-h-screen pb-24 pt-32'} />;
  }

  if (confirmed) {
    const { details, reference } = confirmed;
    return (
      <div className={`${embedded ? 'py-8' : 'pt-32 pb-24 min-h-screen'} max-w-xl mx-auto px-4 text-center`}>
        <PartyPopper className="mx-auto text-primary mb-3" size={34} aria-hidden="true" />
        <span className="font-script text-2xl text-primary">booking requested</span>
        <h2 className="font-display text-3xl font-extrabold text-ink mt-2" tabIndex={-1} ref={confirmedHeadingRef}>
          {copy.booking.confirmedHeading}
        </h2>
        <p className="text-ink/65 text-lg mt-5">
          A table for {details.guests} on {details.date} at {details.time}, with {details.seating.toLowerCase()} seating preferred.
        </p>
        <p className="mt-4 text-sm text-ink/65">
          Reference <span className="block break-all font-display text-base font-bold text-primary">{reference}</span>
        </p>
        <div className="bg-surface rounded-2xl p-6 mt-8 text-left shadow-[0_8px_30px_-14px_rgb(var(--color-ink)/0.2)] ring-1 ring-ink/[0.04]">
          <p className="font-display font-bold text-primary">What happens next</p>
          <p className="text-ink/65 mt-2">{copy.booking.pendingNote}</p>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button onClick={downloadConfirmation} className="inline-flex min-h-12 items-center gap-2 bg-primary text-surface px-6 rounded-full font-display font-bold">
            <Download size={16} aria-hidden="true" /> Download booking slip
          </button>
          <Link to={`/track?ref=${encodeURIComponent(reference)}`} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-ink/15 bg-surface px-5 font-display font-bold text-ink hover:bg-paper">
            <Search size={16} aria-hidden="true" /> Check status later
          </Link>
        </div>
        {downloadError && <p role="alert" className="text-ink text-sm mt-3">{downloadError}</p>}
        <button onClick={startAgain} className="block mx-auto mt-6 min-h-11 text-primary font-display font-bold hover:underline">Make another booking</button>
      </div>
    );
  }

  const guestOptions = Array.from(
    { length: config.booking.maxGuests - config.booking.minGuests + 1 },
    (_, index) => config.booking.minGuests + index,
  );

  return (
    <div className={embedded ? '' : 'pt-28 pb-24 min-h-screen'}>
      <div className="max-w-2xl mx-auto px-4 md:px-8">
        <motion.div {...fadeInUp} className="mb-10">
          <span className="font-script text-2xl text-primary">save your spot</span>
          <h1 className="font-display text-4xl md:text-6xl font-extrabold text-ink mt-1">{copy.booking.heading}</h1>
          <p className="text-ink/60 text-lg mt-3">Tell us when you’re coming and how you like to sit.</p>
        </motion.div>
        <motion.form {...fadeInUp} noValidate onSubmit={submit} className="bg-surface rounded-2xl p-6 md:p-8 border border-ink/10 space-y-5" aria-busy={submitting}>
          <ErrorSummary ref={form.summaryRef} items={form.submitted ? summaryItems : []} />

          <fieldset disabled={locked} className="space-y-5">
            <legend className="sr-only">Booking details</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField id={FIELD_IDS.name} label="Your name" required error={form.visible.name}>
                {(control) => <input {...control} maxLength={100} autoComplete="name" value={booking.name} onChange={(e) => update('name', e.target.value)} onBlur={() => form.blur('name')} className="booking-input" />}
              </FormField>
              <FormField id={FIELD_IDS.phone} label="Phone number" required error={form.visible.phone}>
                {(control) => <input {...control} maxLength={30} autoComplete="tel" type="tel" inputMode="tel" value={booking.phone} onChange={(e) => update('phone', e.target.value)} onBlur={() => form.blur('phone')} className="booking-input" placeholder="082 123 4567" />}
              </FormField>
            </div>
            <FormField id={FIELD_IDS.email} label="Email address" required error={form.visible.email} hint="We send your booking request confirmation here.">
              {(control) => <input {...control} maxLength={254} autoComplete="email" type="email" inputMode="email" value={booking.email} onChange={(e) => update('email', e.target.value)} onBlur={() => form.blur('email')} className="booking-input" placeholder="you@email.com" />}
            </FormField>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField label="Guests">
                {(control) => (
                  <select {...control} value={booking.guests} onChange={(e) => update('guests', e.target.value)} className="booking-input">
                    {guestOptions.map((count) => <option key={count} value={count}>{count}</option>)}
                  </select>
                )}
              </FormField>
              <FormField id={FIELD_IDS.date} label="Date" required error={form.visible.date}>
                {(control) => <input {...control} type="date" min={today} max={lastDate} value={booking.date} onChange={(e) => updateDate(e.target.value)} onBlur={() => form.blur('date')} className="booking-input" />}
              </FormField>
              <FormField
                id={FIELD_IDS.time}
                label="Time"
                required
                error={form.visible.time}
                hint={selectedHours ? `Open ${selectedHours.open} to ${selectedHours.close === '24:00' ? 'midnight' : selectedHours.close}` : booking.date ? 'Closed that day' : 'Pick a date first'}
              >
                {(control) => <input {...control} disabled={!booking.date || !selectedHours} type="time" min={selectedHours?.open} max={latestTime(selectedHours?.close)} value={booking.time} onChange={(e) => update('time', e.target.value)} onBlur={() => form.blur('time')} className="booking-input" />}
              </FormField>
            </div>
            <FormField label="Preferred seating">
              {(control) => (
                <select {...control} value={booking.seating} onChange={(e) => update('seating', e.target.value)} className="booking-input">
                  {config.booking.seatingOptions.map((option) => <option key={option}>{option}</option>)}
                </select>
              )}
            </FormField>
            <FormField label="Anything else?" required={false}>
              {(control) => <textarea {...control} maxLength={500} value={booking.notes} onChange={(e) => update('notes', e.target.value)} className="booking-input min-h-24" placeholder="Birthday, wheelchair access, high chair…" />}
            </FormField>
            <p className="text-sm text-ink/75">
              Times are {config.venue.timeLabel}. This is a request, subject to confirmation. We use your contact details to manage your booking. Marketing is not opted in.
            </p>
          </fieldset>

          {!online && !failure && (
            <p role="status" className="flex items-center gap-2 rounded-xl bg-accent/15 px-4 py-3 text-sm font-semibold text-ink ring-1 ring-accent/50">
              <WifiOff size={16} aria-hidden="true" /> You are offline. Reconnect before sending your request.
            </p>
          )}

          {failure && (
            <SubmissionNotice
              ref={noticeRef}
              kind={failure.kind}
              offline={failure.offline}
              message={failure.message}
              reference={attemptId.current}
              noun="booking"
              retrying={submitting}
              onRetry={retry}
              onDiscard={discardAttempt}
            />
          )}

          {failure?.kind !== 'uncertain' && (
            <button type="submit" disabled={submitting} className="w-full min-h-14 bg-primary text-surface rounded-full font-display font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50">
              <CalendarCheck size={18} aria-hidden="true" /> {submitting ? 'Sending…' : 'Request booking'}
            </button>
          )}
          <p className="text-center text-sm">
            <a className="underline text-ink/75" href={`https://wa.me/${config.venue.whatsapp}`} target="_blank" rel="noopener noreferrer">
              Questions? Message {config.venue.name} on WhatsApp
            </a>
          </p>
        </motion.form>
      </div>
    </div>
  );
};
