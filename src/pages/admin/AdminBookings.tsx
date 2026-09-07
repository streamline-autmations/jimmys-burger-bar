import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock3, Mail, Phone, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  actionableCardClass,
  cardClass,
  formatBookingDate,
  formatBookingTime,
  historicalCardClass,
  isActionable,
  isClosed,
  thClass,
  titleCase,
} from './adminUtils';
import { AdminEmpty, AdminError, AdminSkeleton } from './AdminStates';
import { AdminPageHeader } from './AdminPageHeader';
import { AdminStatusBadge, AdminStatusControl } from './AdminStatusBadge';
import { BOOKING_STATUSES, type Booking, type BookingStatus } from './types';

type BookingFilter = 'all' | BookingStatus;

export const AdminBookings: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<BookingFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [updateErrors, setUpdateErrors] = useState<Record<string, string>>({});

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (fetchError) setError(fetchError.message);
    else setBookings(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchBookings();
  }, [fetchBookings]);

  const filteredBookings = useMemo(
    () => (filter === 'all' ? bookings : bookings.filter((booking) => booking.status === filter)),
    [bookings, filter],
  );

  const pendingCount = useMemo(
    () => bookings.filter((booking) => booking.status === 'pending').length,
    [bookings],
  );

  const updateStatus = async (booking: Booking, status: BookingStatus) => {
    if (booking.status === status) return;
    setSavingId(booking.id);
    setUpdateErrors((current) => {
      const next = { ...current };
      delete next[booking.id];
      return next;
    });

    const { error: updateError } = await supabase.from('bookings').update({ status }).eq('id', booking.id);
    if (updateError) {
      setUpdateErrors((current) => ({ ...current, [booking.id]: updateError.message }));
    } else {
      setBookings((current) => current.map((item) => (item.id === booking.id ? { ...item, status } : item)));
    }
    setSavingId(null);
  };

  const statusControl = (booking: Booking) => (
    <AdminStatusControl
      id={`booking-status-${booking.id}`}
      value={booking.status as BookingStatus}
      options={BOOKING_STATUSES}
      saving={savingId === booking.id}
      error={updateErrors[booking.id]}
      describedAs={`Update status for ${booking.name}`}
      onChange={(next) => void updateStatus(booking, next)}
    />
  );

  return (
    <section>
      <AdminPageHeader
        eyebrow="Reservations"
        title="Bookings"
        count={
          loading
            ? undefined
            : `${filteredBookings.length} shown${pendingCount ? ` · ${pendingCount} awaiting confirmation` : ''}`
        }
      >
        <div
          className="flex max-w-full gap-1 overflow-x-auto rounded-full bg-surface p-1 ring-1 ring-ink/10"
          role="group"
          aria-label="Filter bookings by status"
        >
          {(['all', ...BOOKING_STATUSES] as const).map((status) => (
            <button
              key={status}
              type="button"
              aria-pressed={filter === status}
              onClick={() => setFilter(status)}
              className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                filter === status ? 'bg-primary text-surface' : 'text-ink/60 hover:bg-paper hover:text-ink'
              }`}
            >
              {titleCase(status)}
            </button>
          ))}
        </div>
      </AdminPageHeader>

      {error && (
        <div className="mb-6">
          <AdminError message={error} onRetry={() => void fetchBookings()} />
        </div>
      )}

      {loading ? (
        <AdminSkeleton />
      ) : filteredBookings.length === 0 ? (
        <AdminEmpty
          title="Nothing here"
          hint={filter === 'all' ? 'Bookings will appear as guests reserve tables.' : 'No bookings have this status.'}
        />
      ) : (
        <>
          {/* Phones and tablets: one card per booking. A horizontally scrolling
              table put the status control off screen, so staff could not
              actually confirm a table from the floor. */}
          <ul className="space-y-3 lg:hidden">
            {filteredBookings.map((booking) => (
              <li
                key={booking.id}
                className={`p-4 ${
                  isActionable(booking.status)
                    ? actionableCardClass
                    : isClosed(booking.status)
                      ? historicalCardClass
                      : cardClass
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-display text-base font-bold text-primary">{booking.name}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink/60">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays size={14} aria-hidden="true" />
                        {formatBookingDate(booking.booking_date)}
                      </span>
                      <span className="inline-flex items-center gap-1.5 font-bold text-ink/80">
                        <Clock3 size={14} aria-hidden="true" />
                        {formatBookingTime(booking.booking_time)}
                      </span>
                    </p>
                  </div>
                  <AdminStatusBadge status={booking.status} />
                </div>

                <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink/70">
                  <span className="inline-flex items-center gap-1.5">
                    <Users size={14} aria-hidden="true" />
                    {booking.guests} {booking.guests === 1 ? 'guest' : 'guests'}
                  </span>
                  <span className="text-ink/30" aria-hidden="true">
                    ·
                  </span>
                  <span>{titleCase(booking.seating_preference)}</span>
                </p>

                {booking.notes && (
                  <p className="mt-2 rounded-xl bg-paper/80 px-3 py-2 text-sm leading-relaxed text-ink/70">
                    {booking.notes}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    href={`tel:${booking.phone}`}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-primary px-3.5 text-sm font-bold text-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  >
                    <Phone size={14} aria-hidden="true" />
                    Call
                  </a>
                  <a
                    href={`mailto:${booking.email}`}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-ink/15 px-3.5 text-sm font-bold text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  >
                    <Mail size={14} aria-hidden="true" />
                    Email
                  </a>
                </div>

                <div className="mt-3 border-t border-ink/10 pt-3">{statusControl(booking)}</div>
              </li>
            ))}
          </ul>

          {/* Desktop keeps the table: it is the denser, better read when a whole
              service fits on one screen. */}
          <div className={`${cardClass} hidden overflow-hidden lg:block`}>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink/10 bg-paper/60">
                <tr>
                  <th className={thClass}>Customer</th>
                  <th className={thClass}>Date &amp; time</th>
                  <th className={thClass}>Party</th>
                  <th className={thClass}>Notes</th>
                  <th className={`${thClass} w-56`}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10">
                {filteredBookings.map((booking) => (
                  <tr
                    key={booking.id}
                    className={`align-top transition-colors hover:bg-paper/50 ${
                      isClosed(booking.status) ? 'text-ink/55' : ''
                    }`}
                  >
                    <td className="relative px-4 py-4">
                      {isActionable(booking.status) && (
                        <span className="absolute inset-y-0 left-0 w-1 bg-accent" aria-hidden="true" />
                      )}
                      <p className="font-semibold text-ink">{booking.name}</p>
                      <a className="mt-1 block text-xs text-ink/55 hover:text-primary" href={`mailto:${booking.email}`}>
                        {booking.email}
                      </a>
                      <a className="block text-xs text-ink/55 hover:text-primary" href={`tel:${booking.phone}`}>
                        {booking.phone}
                      </a>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <p className="font-medium">{formatBookingDate(booking.booking_date)}</p>
                      <p className="mt-1 font-display text-base font-bold text-primary">
                        {formatBookingTime(booking.booking_time)}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <p className="font-medium">
                        {booking.guests} {booking.guests === 1 ? 'guest' : 'guests'}
                      </p>
                      <p className="mt-1 text-xs text-ink/55">{titleCase(booking.seating_preference)}</p>
                    </td>
                    <td className="max-w-64 px-4 py-4">
                      <p className="line-clamp-2 text-ink/70" title={booking.notes ?? undefined}>
                        {booking.notes || '—'}
                      </p>
                    </td>
                    <td className="w-56 px-4 py-4">
                      <div className="mb-2.5">
                        <AdminStatusBadge status={booking.status} />
                      </div>
                      {statusControl(booking)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
};
