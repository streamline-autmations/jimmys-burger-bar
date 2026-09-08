import { readSession, writeSession } from '../lib/sessionDraft';
import React, { useId, useRef, useState } from 'react';
import { CalendarCheck, Download, PartyPopper } from 'lucide-react';
import { motion } from 'framer-motion';
import { fadeInUp } from '../lib/motion';
import { supabase } from '../lib/supabase';

import { config } from '../config';
import { contactError, latestTime, requestedTimeError, restaurantDate, tradingHours } from '../lib/tradingHours';

export const Booking: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const [previousReference, setPreviousReference] = useState(() => readSession('jimmys-booking-attempt'));
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [booking, setBooking] = useState({ name: '', email: '', phone: '', guests: '2', date: '', time: '', seating: 'No preference', notes: '' });
  const sending = useRef(false);
  const attemptId = useRef(readSession('jimmys-booking-attempt') ?? crypto.randomUUID());
  const [reference, setReference] = useState('');
  const update = (key: keyof typeof booking, value: string) => setBooking((current) => ({ ...current, [key]: value }));
  const selectedHours = tradingHours(booking.date);
  const latestBookingTime = latestTime(selectedHours?.close);
  const updateDate = (date: string) => {
    const hours = tradingHours(date);
    setDateError(date && !hours ? "Sundays need an event-date check. Contact Jimmy's for Coffee & Cars." : null);
    setBooking((current) => ({ ...current, date, time: hours && current.time >= hours.open && current.time < hours.close ? current.time : '' }));
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (sending.current) return;
    const validation = contactError(booking.name, booking.phone, booking.email) || requestedTimeError(booking.date, booking.time);
    if (validation) { setSubmitError(validation); return; }
    sending.current = true;
    setSubmitting(true);
    setSubmitError(null);

    const id = attemptId.current;
    writeSession('jimmys-booking-attempt', id);
    const bookingReference = id;

    try {
      const { error } = await supabase.from('bookings').insert({
        id,
        name: booking.name.trim(),
        email: booking.email.trim(),
        phone: booking.phone.trim(),
        guests: Number(booking.guests),
        booking_date: booking.date,
        booking_time: booking.time,
        seating_preference: booking.seating,
        notes: booking.notes || null,
        marketing_consent: false,
      });

      if (error) {
        setSubmitError("We could not verify receipt. Contact Jimmy's before sending another request to avoid a duplicate.");
        return;
      }

      setReference(bookingReference);
      setSubmitted(true);
    } catch {
      setSubmitError("We could not verify receipt. Contact Jimmy's before sending another request to avoid a duplicate.");
    } finally {
      sending.current = false;
      setSubmitting(false);
    }
  };
  const downloadConfirmation = async () => {
    setDownloadError(null);
    try {
      const { generateBookingConfirmation } = await import('../lib/generateBookingConfirmation');
      await generateBookingConfirmation({ reference, ...booking });
    } catch {
      setDownloadError('Could not generate the booking slip. Please try again.');
    }
  };

  if (!config.features.reservations) return <p>Online booking requests are unavailable. Please contact Jimmy's.</p>;

  if (previousReference) return <div className="max-w-xl mx-auto py-8 px-4">
    <h2 className="font-display text-2xl font-bold">Check your last booking request</h2>
    <p className="mt-3 text-sm break-all">Reference: {previousReference}</p>
    <p className="mt-3">This tab previously sent a booking request. Check with Jimmy's before sending another.</p>
    <a className="inline-block my-4 underline" href={`https://wa.me/${config.venue.whatsapp}?text=${encodeURIComponent(`Please check existing booking ${previousReference}. This is not a new request.`)}`}>Check with Jimmy's on WhatsApp</a>
    <button className="block min-h-11 rounded-xl border border-ink/25 px-4" onClick={() => {
      if (!window.confirm('Have you checked the previous request with Jimmy’s? A new request may create a second booking.')) return;
      writeSession('jimmys-booking-attempt', null); attemptId.current = crypto.randomUUID(); setPreviousReference(null);
    }}>I have checked. Make another request</button>
  </div>;

  if (submitted) return (
    <div className={`${embedded ? 'py-8' : 'pt-32 pb-24 min-h-screen'} max-w-xl mx-auto px-4 text-center`}>
      <PartyPopper className="mx-auto text-primary mb-3" size={34} />
      <span className="font-script text-2xl text-primary">booking requested</span>
      <h2 className="font-display text-3xl font-extrabold text-ink mt-2">Request received</h2>
      <p className="mt-3 text-sm break-all">Reference: {reference}</p>
      <p className="text-ink/65 text-lg mt-5">A table for {booking.guests} on {booking.date} at {booking.time}, with {booking.seating.toLowerCase()} seating preferred.</p>
      <div className="bg-surface rounded-2xl p-6 mt-8 text-left shadow-[0_8px_30px_-14px_rgb(var(--color-ink)/0.2)] ring-1 ring-ink/[0.04]">
        <p className="font-display font-bold text-primary">What happens next</p>
        <p className="text-ink/60 mt-2">Your request is saved. Your table is not confirmed until Jimmy’s contacts you.</p>
      </div>
      <button onClick={downloadConfirmation} className="mt-6 inline-flex items-center gap-2 bg-primary text-surface px-6 py-3.5 rounded-full font-display font-bold"><Download size={16} /> Download booking slip</button>
      {downloadError && <p role="alert" className="text-primary/80 text-sm mt-3">{downloadError}</p>}
      <button onClick={() => { attemptId.current = crypto.randomUUID(); writeSession('jimmys-booking-attempt', null); setBooking({ name: '', email: '', phone: '', guests: '2', date: '', time: '', seating: 'No preference', notes: '' }); setSubmitted(false); }} className="block mx-auto mt-6 text-primary font-display font-bold hover:underline">Make another booking</button>
    </div>
  );

  return (
    <div className={embedded ? '' : 'pt-28 pb-24 min-h-screen'}>
      <div className="max-w-2xl mx-auto px-4 md:px-8">
        <motion.div {...fadeInUp} className="mb-10"><span className="font-script text-2xl text-primary">save your spot</span><h1 className="font-display text-4xl md:text-6xl font-extrabold text-ink mt-1">Book a table</h1><p className="text-ink/60 text-lg mt-3">Tell us when you’re coming and how you like to sit.</p></motion.div>
        <motion.form {...fadeInUp} onSubmit={submit} className="bg-surface rounded-2xl p-6 md:p-8 border border-ink/10 space-y-5">
          <fieldset disabled={submitting} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Your name"><input maxLength={100} autoComplete="name" required value={booking.name} onChange={(e) => update('name', e.target.value)} className="booking-input" placeholder="Your name" /></Field>
            <Field label="Phone number"><input maxLength={30} autoComplete="tel" required type="tel" value={booking.phone} onChange={(e) => update('phone', e.target.value)} className="booking-input" placeholder="082 123 4567" /></Field>
          </div>
          <Field label="Email address"><input maxLength={254} autoComplete="email" required type="email" value={booking.email} onChange={(e) => update('email', e.target.value)} className="booking-input" placeholder="you@email.com" /></Field>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Guests"><select value={booking.guests} onChange={(e) => update('guests', e.target.value)} className="booking-input">{Array.from({ length: 12 }, (_, i) => <option key={i + 1}>{i + 1}</option>)}</select></Field>
            <Field label="Date"><input required type="date" min={restaurantDate()} value={booking.date} onChange={(e) => updateDate(e.target.value)} className="booking-input" />{dateError && <span role="alert" className="block mt-2 text-primary/80 text-xs">{dateError}</span>}</Field>
            <Field label="Time"><input required disabled={!booking.date} type="time" min={selectedHours?.open} max={latestBookingTime} value={booking.time} onChange={(e) => update('time', e.target.value)} className="booking-input disabled:opacity-50 disabled:cursor-not-allowed" placeholder="Pick a date first" /></Field>
          </div>
          <Field label="Preferred seating"><select value={booking.seating} onChange={(e) => update('seating', e.target.value)} className="booking-input"><option>No preference</option><option>Inside</option><option>Outside</option><option>Smoking area</option><option>Non-smoking area</option></select></Field>
          <Field label="Anything else? (optional)"><textarea maxLength={500} value={booking.notes} onChange={(e) => update('notes', e.target.value)} className="booking-input min-h-24" placeholder="Birthday, wheelchair access, high chair…" /></Field>
          <p className="text-sm text-ink/75">Times are South African time. This is a request, subject to confirmation. We use your contact details to manage your booking. Marketing is not opted in.</p>
          <a className="inline-block underline text-sm" href={`https://wa.me/${config.venue.whatsapp}`}>Contact Jimmy's about your request</a>
          {submitError && <p role="alert" className="text-primary/80 text-sm">{submitError}</p>}
          <button disabled={submitting} className="w-full bg-primary text-surface py-4 rounded-full font-display font-bold inline-flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none"><CalendarCheck size={18} /> {submitting ? 'Sending…' : 'Request booking'}</button>
          </fieldset>
        </motion.form>
      </div>
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => {
  const id = useId();
  return <div className="block font-display font-bold text-ink text-sm">
    <label htmlFor={id}>{label}</label>
    <div className="mt-2">{React.Children.map(children, (child) =>
      React.isValidElement(child) && typeof child.type === 'string' && ['input', 'select', 'textarea'].includes(child.type)
        ? React.cloneElement(child as React.ReactElement<{ id?: string }>, { id })
        : child,
    )}</div>
  </div>;
};
