// Shows, on screen, the emails the real product sends at each step: the parts
// of Restaurant Direct a prospect would otherwise never see.
//
// Only what the real product sends appears here (docs/NOTIFICATIONS.md): the
// kitchen and guest emails when an order or booking request is saved, and the
// nightly Google review request for orders completed that day. Confirming a
// booking or moving an order along sends nothing, so it shows nothing.
//
// Each window shows its own side. The customer site shows what the guest
// receives; the staff console shows what reaches the restaurant. With the
// two-window setup in DEMO.md, both appear at once for the same order.

import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { Mail, Star, X } from 'lucide-react';
import type { Booking, OrderWithItems } from '../core/data';
import { formatCartMoney } from '../lib/cartStore';
import { toMinor } from '../core/domain/money';
import { restaurantDate, restaurantInstant } from '../core/tenant';
import { config, REVIEW_REQUEST_TIME } from './config';
import { readRecords, subscribeRecords } from './store';

interface Preview {
  id: string;
  icon: 'mail' | 'star';
  title: string;
  to: string;
  lines: string[];
}

const SHOW_FOR_MS = 9000;
/** More than this many new records at once is a reset or a new day's seed, not a guest. */
const RESEED_THRESHOLD = 3;

const venue = config.venue.name;
const money = (amount: number) => formatCartMoney(toMinor(amount));
const clock = new Intl.DateTimeFormat('en-GB', { timeZone: config.timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const dayLabel = new Intl.DateTimeFormat(config.locale, { timeZone: config.timezone, weekday: 'short', day: 'numeric', month: 'short' });

function when(iso: string | null): string {
  if (!iso) return 'as soon as possible';
  const date = new Date(iso);
  const day = restaurantDate(date) === restaurantDate() ? 'today' : dayLabel.format(date);
  return `${day} at ${clock.format(date)}`;
}

const itemCount = (order: OrderWithItems) => order.order_items.reduce((sum, item) => sum + item.qty, 0);
const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

function orderPreviews(order: OrderWithItems, side: 'guest' | 'staff'): Preview[] {
  const summary = `${plural(itemCount(order), 'item', 'items')}, ${money(order.total)}`;
  if (side === 'guest') {
    return [{
      id: `order-guest-${order.id}`,
      icon: 'mail',
      title: 'Confirmation emailed to the guest',
      to: order.email,
      lines: [
        `Reference ${order.order_no}`,
        `${order.order_type === 'table' ? `Table ${order.table_number ?? ''}`.trim() : 'Collection'} requested for ${when(order.requested_time)}`,
        summary,
      ],
    }];
  }
  return [{
    id: `order-staff-${order.id}`,
    icon: 'mail',
    title: `New order emailed to ${venue}`,
    to: 'The restaurant inbox',
    lines: [
      `${order.customer_name}, ${order.order_no}`,
      order.order_items.map((item) => `${item.qty}x ${item.name}`).join(', '),
      `${summary}, for ${when(order.requested_time)}`,
    ],
  }];
}

function bookingPreviews(booking: Booking, side: 'guest' | 'staff'): Preview[] {
  const day = booking.booking_date === restaurantDate() ? 'today' : dayLabel.format(restaurantInstant(booking.booking_date, '12:00'));
  const table = `Table for ${booking.guests}, ${day} at ${booking.booking_time.slice(0, 5)}`;
  if (side === 'guest') {
    return [{
      id: `booking-guest-${booking.id}`,
      icon: 'mail',
      title: 'Request emailed to the guest',
      to: booking.email,
      lines: [table, `Says it is a request until ${venue} confirms it`],
    }];
  }
  return [{
    id: `booking-staff-${booking.id}`,
    icon: 'mail',
    title: `New table request emailed to ${venue}`,
    to: 'The restaurant inbox',
    lines: [booking.name, `${table}, ${booking.seating_preference.toLowerCase()}`, ...(booking.notes ? [`"${booking.notes}"`] : [])],
  }];
}

function reviewPreview(order: OrderWithItems): Preview | null {
  // The nightly job only covers orders completed that day before it runs.
  if (clock.format(new Date()) >= REVIEW_REQUEST_TIME) return null;
  return {
    id: `review-${order.id}`,
    icon: 'star',
    title: 'Google review request queued',
    to: order.email,
    lines: [`At ${REVIEW_REQUEST_TIME} tonight, ${order.customer_name.split(' ')[0]} gets one email asking for a Google review of ${venue}.`],
  };
}

interface Seen {
  orders: Map<string, string>;
  bookings: Set<string>;
}

const snapshot = (): Seen => {
  const records = readRecords();
  return {
    orders: new Map(records.orders.map((row) => [row.id, row.status])),
    bookings: new Set(records.bookings.map((row) => row.id)),
  };
};

export const EmailPreviews: React.FC = () => {
  const location = useLocation();
  const side: 'guest' | 'staff' = location.pathname.startsWith('/admin') ? 'staff' : 'guest';
  const sideRef = useRef(side);
  sideRef.current = side;
  const [previews, setPreviews] = useState<Preview[]>([]);
  const timers = useRef(new Map<string, number>());

  const dismiss = (id: string) => {
    window.clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setPreviews((list) => list.filter((item) => item.id !== id));
  };

  useEffect(() => {
    let seen = snapshot();
    const unsubscribe = subscribeRecords(() => {
      const records = readRecords();
      const newOrders = records.orders.filter((row) => !seen.orders.has(row.id));
      const newBookings = records.bookings.filter((row) => !seen.bookings.has(row.id));
      const completed = records.orders.filter((row) => row.status === 'completed' && seen.orders.has(row.id) && seen.orders.get(row.id) !== 'completed');
      seen = snapshot();
      if (newOrders.length + newBookings.length > RESEED_THRESHOLD) return;

      const current = sideRef.current;
      const next: Preview[] = [
        ...newOrders.flatMap((row) => orderPreviews(row, current)),
        ...newBookings.flatMap((row) => bookingPreviews(row, current)),
        ...(current === 'staff' ? completed.map(reviewPreview).filter((item): item is Preview => item !== null) : []),
      ];
      if (!next.length) return;
      setPreviews((list) => [...list.filter((item) => !next.some((fresh) => fresh.id === item.id)), ...next].slice(-3));
      for (const item of next) {
        window.clearTimeout(timers.current.get(item.id));
        timers.current.set(item.id, window.setTimeout(() => dismiss(item.id), SHOW_FOR_MS));
      }
    });
    const pending = timers.current;
    return () => {
      unsubscribe();
      pending.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <div
        aria-live="polite"
        aria-label="Emails sent"
        className="pointer-events-none fixed right-3 top-3 z-[305] flex w-[min(calc(100vw-1.5rem),23rem)] flex-col gap-2.5 sm:right-5 sm:top-5"
      >
        <AnimatePresence initial={false}>
          {previews.map((item) => (
            <motion.article
              key={item.id}
              layout
              initial={{ opacity: 0, x: 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 28, transition: { duration: 0.18 } }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-auto overflow-hidden rounded-2xl bg-surface text-ink shadow-[0_18px_40px_-18px_rgb(var(--color-ink)/0.55)] ring-1 ring-ink/10"
            >
              <header className="flex items-start gap-3 px-4 pb-2 pt-3.5">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-ink">
                  {item.icon === 'star' ? <Star size={15} aria-hidden="true" /> : <Mail size={15} aria-hidden="true" />}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-[0.95rem] font-bold leading-snug text-primary">{item.title}</h2>
                  <p className="truncate text-xs font-semibold text-ink/55">To {item.to}</p>
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(item.id)}
                  aria-label="Dismiss"
                  className="-mr-1.5 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink/50 hover:bg-paper hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  <X size={15} aria-hidden="true" />
                </button>
              </header>
              <div className="mx-4 mb-3.5 border-l-2 border-accent pl-3">
                {item.lines.map((line) => (
                  <p key={line} className="text-sm leading-relaxed text-ink/80">{line}</p>
                ))}
              </div>
            </motion.article>
          ))}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
};
