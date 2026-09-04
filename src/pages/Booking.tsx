import React, { useState } from 'react';
import { CalendarCheck, Download, PartyPopper } from 'lucide-react';
import { motion } from 'framer-motion';
import { fadeInUp } from '../lib/motion';
import { supabase } from '../lib/supabase';

type TradingHours = { open: string; close: string } | null;

// Keep this booking lookup in sync with config.venue.hours.
const BOOKING_HOURS: Record<number, TradingHours> = {
  0: null,
  1: { open: '09:00', close: '20:00' },
  2: { open: '09:00', close: '20:00' },
  3: { open: '09:00', close: '21:00' },
  4: { open: '09:00', close: '21:00' },
  5: { open: '09:00', close: '00:00' },
  6: { open: '09:00', close: '00:00' },
};

export const Booking: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [booking, setBooking] = useState({ name: '', email: '', phone: '', guests: '2', date: '', time: '', seating: 'No preference', notes: '' });
  const [reference, setReference] = useState('');
  const update = (key: keyof typeof booking, value: string) => setBooking((current) => ({ ...current, [key]: value }));
  const selectedHours = booking.date ? BOOKING_HOURS[new Date(`${booking.date}T00:00:00`).getDay()] : null;
  const latestBookingTime = selectedHours?.close === '00:00' ? '23:59' : selectedHours?.close;
  const updateDate = (date: string) => {
    const hours = date ? BOOKING_HOURS[new Date(`${date}T00:00:00`).getDay()] : null;

    if (date && !hours) {
      setDateError("Jimmy's is closed on Sundays - pick another day");
      return;
    }

    setDateError(null);
    setBooking((current) => {
      const latestTime = hours?.close === '00:00' ? '23:59' : hours?.close;
      const timeIsValid = hours && current.time >= hours.open && current.time <= latestTime!;
      return { ...current, date, time: timeIsValid ? current.time : '' };
    });
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    const id = crypto.randomUUID();
    const bookingReference = `JB-T${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      const { error } = await supabase.from('bookings').insert({
        id,
        name: booking.name,
        email: booking.email,
        phone: booking.phone,
        guests: Number(booking.guests),
        booking_date: booking.date,
        booking_time: booking.time,
        seating_preference: booking.seating,
        notes: booking.notes || null,
        marketing_consent: false,
      });

      if (error) {
        setSubmitError('We couldn’t send your booking request. Please try again.');
        return;
      }

      setReference(bookingReference);
      setSubmitted(true);
    } catch {
      setSubmitError('We couldn’t send your booking request. Please try again.');
    } finally {
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

  if (submitted) return (
    <div className={`${embedded ? 'py-8' : 'pt-32 pb-24 min-h-screen'} max-w-xl mx-auto px-4 text-center`}>
      <PartyPopper className="mx-auto text-primary mb-3" size={34} />
      <span className="font-script text-2xl text-primary">booking requested</span>
      <h1 className="font-display text-3xl md:text-5xl font-extrabold text-ink mt-1">{reference}</h1>
      <p className="text-ink/65 text-lg mt-5">A table for {booking.guests} on {booking.date} at {booking.time}, with {booking.seating.toLowerCase()} seating preferred.</p>
      <div className="bg-surface rounded-2xl p-6 mt-8 text-left shadow-[0_8px_30px_-14px_rgb(var(--color-ink)/0.2)] ring-1 ring-ink/[0.04]">
        <p className="font-display font-bold text-primary">What happens next</p>
        <p className="text-ink/60 mt-2">We’ve received your booking request. Jimmy’s will confirm it shortly.</p>
      </div>
      <button onClick={downloadConfirmation} className="mt-6 inline-flex items-center gap-2 bg-primary text-surface px-6 py-3.5 rounded-full font-display font-bold"><Download size={16} /> Download booking slip</button>
      {downloadError && <p role="alert" className="text-primary/80 text-sm mt-3">{downloadError}</p>}
      <button onClick={() => setSubmitted(false)} className="block mx-auto mt-6 text-primary font-display font-bold hover:underline">Make another booking</button>
    </div>
  );

  return (
    <div className={embedded ? '' : 'pt-28 pb-24 min-h-screen'}>
      <div className="max-w-2xl mx-auto px-4 md:px-8">
        <motion.div {...fadeInUp} className="mb-10"><span className="font-script text-2xl text-primary">save your spot</span><h1 className="font-display text-4xl md:text-6xl font-extrabold text-ink mt-1">Book a table</h1><p className="text-ink/60 text-lg mt-3">Tell us when you’re coming and how you like to sit.</p></motion.div>
        <motion.form {...fadeInUp} onSubmit={submit} className="bg-surface rounded-2xl p-6 md:p-8 border border-ink/10 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Your name"><input required value={booking.name} onChange={(e) => update('name', e.target.value)} className="booking-input" placeholder="Your name" /></Field>
            <Field label="Phone number"><input required type="tel" value={booking.phone} onChange={(e) => update('phone', e.target.value)} className="booking-input" placeholder="082 123 4567" /></Field>
          </div>
          <Field label="Email address"><input required type="email" value={booking.email} onChange={(e) => update('email', e.target.value)} className="booking-input" placeholder="you@email.com" /></Field>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Guests"><select value={booking.guests} onChange={(e) => update('guests', e.target.value)} className="booking-input">{Array.from({ length: 12 }, (_, i) => <option key={i + 1}>{i + 1}</option>)}</select></Field>
            <Field label="Date"><input required type="date" min={new Date().toISOString().slice(0, 10)} value={booking.date} onChange={(e) => updateDate(e.target.value)} className="booking-input" />{dateError && <span role="alert" className="block mt-2 text-primary/80 text-xs">{dateError}</span>}</Field>
            <Field label="Time"><input required disabled={!booking.date} type="time" min={selectedHours?.open} max={latestBookingTime} value={booking.time} onChange={(e) => update('time', e.target.value)} className="booking-input disabled:opacity-50 disabled:cursor-not-allowed" placeholder="Pick a date first" /></Field>
          </div>
          <Field label="Preferred seating"><select value={booking.seating} onChange={(e) => update('seating', e.target.value)} className="booking-input"><option>No preference</option><option>Inside</option><option>Outside</option><option>Smoking area</option><option>Non-smoking area</option></select></Field>
          <Field label="Anything else? (optional)"><textarea value={booking.notes} onChange={(e) => update('notes', e.target.value)} className="booking-input min-h-24" placeholder="Birthday, wheelchair access, high chair…" /></Field>
          {submitError && <p role="alert" className="text-primary/80 text-sm">{submitError}</p>}
          <button disabled={submitting} className="w-full bg-primary text-surface py-4 rounded-full font-display font-bold inline-flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none"><CalendarCheck size={18} /> {submitting ? 'Sending…' : 'Request booking'}</button>
        </motion.form>
      </div>
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => <label className="block font-display font-bold text-ink text-sm">{label}<span className="block mt-2">{children}</span></label>;
