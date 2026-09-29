// The close of the pitch: the last seven days of the demo's direct orders, and
// what a delivery app's commission on them would have been.
//
// Only commission is compared. Restaurant Direct's own price is quoted by the
// presenter, not shown here (Christiaan's decision, 2026-09-29), and the rate
// is labelled as the assumption it is.

import React, { useEffect, useMemo, useRef } from 'react';
import { MotionConfig, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Starburst } from '../components/Starburst';
import { restaurantDate } from '../core/tenant';
import { addDays } from '../lib/tradingHours';
import { formatWholeMoney, salesWindow, summariseSales } from '../core/data/sales';
import { config, REVIEW_REQUEST_TIME } from './config';
import { readRecords } from './store';

const rands = formatWholeMoney;
const clock = new Intl.DateTimeFormat('en-GB', { timeZone: config.timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

function weekFigures() {
  const { orders, bookings } = readRecords();
  const range = salesWindow();
  const week = orders.filter((row) => row.status !== 'cancelled' && row.requested_time
    && row.requested_time >= range.weekStart && row.requested_time < range.end);
  const sales = summariseSales(week, range);
  const today = restaurantDate();
  const from = addDays(today, -6);
  const tables = bookings.filter((row) => row.status === 'confirmed' && row.booking_date >= from && row.booking_date <= today);
  // The nightly job asks each guest whose order was completed that day, before it runs.
  const reviewsSent = week.filter((row) => row.status === 'completed'
    && (restaurantDate(new Date(row.requested_time!)) < today || clock.format(new Date()) >= REVIEW_REQUEST_TIME)).length;
  return {
    ...sales,
    guests: new Set(week.map((row) => row.customer_id)).size,
    tables: tables.length,
    covers: tables.reduce((sum, row) => sum + row.guests, 0),
    reviewsSent,
  };
}

export const WeekInNumbers: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const rate = config.reporting?.appCommissionRate ?? 0.25;
  const percent = `${Math.round(rate * 100)}%`;
  const figures = useMemo(weekFigures, []);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  const facts = [
    { value: String(figures.weekCount), label: `orders placed direct, worth ${rands(figures.weekTotal)}` },
    { value: String(figures.guests), label: 'guests now in the restaurant’s own guest list' },
    { value: String(figures.tables), label: `tables booked, ${figures.covers} people` },
    { value: String(figures.reviewsSent), label: 'guests asked for a Google review, automatically' },
  ];

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rd-week-title"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-[310] overflow-y-auto bg-ink text-paper"
      >
        <div className="mx-auto flex min-h-full max-w-6xl flex-col px-5 pb-16 pt-6 sm:px-10 sm:pt-10">
          <div className="flex items-center justify-between gap-4">
            <img src={config.assets.logo} alt={config.venue.name} className="h-10 w-auto sm:h-12" />
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-paper/10 px-4 font-display text-sm font-bold text-paper transition-colors hover:bg-paper/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <X size={16} aria-hidden="true" />
              Back to the demo
            </button>
          </div>

          <div className="relative mt-12 sm:mt-20">
            <p className="font-script text-2xl text-accent sm:text-3xl">the last 7 days</p>
            <h2 id="rd-week-title" className="mt-3 max-w-[18ch] font-display text-[clamp(1.6rem,3.6vw,2.6rem)] font-bold leading-tight">
              Commission {config.venue.name} kept instead of paying a delivery app
            </h2>
            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="mt-4 pr-24 font-display text-[clamp(3.4rem,15vw,11rem)] sm:pr-0 font-extrabold leading-[0.9] tracking-tight tabular-nums"
            >
              {rands(figures.weekTotal * rate)}
            </motion.p>
            <Starburst
              label="at"
              value={percent}
              className="absolute bottom-[-0.5rem] right-0 h-24 w-24 rotate-6 text-[1.6rem] sm:bottom-auto sm:right-4 sm:top-0 sm:h-44 sm:w-44 sm:text-[3rem] lg:top-10"
            />
          </div>

          <dl className="mt-14 grid gap-x-8 gap-y-7 border-t border-paper/15 pt-8 sm:grid-cols-2 lg:grid-cols-4">
            {facts.map((fact) => (
              <div key={fact.label} className="flex flex-col-reverse justify-end">
                <dt className="mt-1.5 max-w-[24ch] text-base leading-snug text-paper/80">{fact.label}</dt>
                <dd className="font-display text-4xl font-bold tabular-nums text-accent">{fact.value}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-auto max-w-2xl pt-14 text-sm leading-relaxed text-paper/55">
            Worked out as {percent} of the order value of these direct orders, the kind of cut a delivery app takes on the same
            orders. Every figure comes from this demo&apos;s fictional records.
          </p>
        </div>
      </motion.div>
    </MotionConfig>
  );
};
