import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cardClass, formatBookingDate, formatBookingTime, titleCase } from './adminUtils';
import { AdminError, AdminLoading, EmptyTableRow } from './AdminStates';
import { AdminStatusBadge } from './AdminStatusBadge';
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

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-ink/45">Reservations</p>
          <h1 className="mt-1 font-display text-3xl font-bold text-primary sm:text-4xl">Bookings</h1>
        </div>
        <div className="flex max-w-full gap-1 overflow-x-auto rounded-full bg-surface p-1 ring-1 ring-ink/10">
          {(['all', ...BOOKING_STATUSES] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilter(status)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                filter === status ? 'bg-primary text-surface' : 'text-ink/60 hover:text-ink'
              }`}
            >
              {titleCase(status)}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="mb-6"><AdminError message={error} /></div>}
      {loading ? (
        <AdminLoading label="Loading bookings…" />
      ) : (
        <div className={`${cardClass} overflow-hidden p-0`}>
          <div className="overflow-x-auto">
            <table className="min-w-[1000px] w-full text-left text-sm">
              <thead className="border-b border-ink/10 bg-paper/60 text-xs uppercase tracking-wider text-ink/50">
                <tr>
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold">Date &amp; time</th>
                  <th className="px-4 py-3 font-semibold">Guests</th>
                  <th className="px-4 py-3 font-semibold">Seating</th>
                  <th className="px-4 py-3 font-semibold">Notes</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10">
                {filteredBookings.length === 0 ? (
                  <EmptyTableRow colSpan={6} message="No bookings match this status." />
                ) : (
                  filteredBookings.map((booking) => (
                    <tr key={booking.id} className="align-top hover:bg-paper/35">
                      <td className="px-4 py-4">
                        <p className="font-medium text-ink">{booking.name}</p>
                        <a className="mt-1 block text-xs text-ink/50 hover:text-primary" href={`mailto:${booking.email}`}>
                          {booking.email}
                        </a>
                        <a className="block text-xs text-ink/50 hover:text-primary" href={`tel:${booking.phone}`}>
                          {booking.phone}
                        </a>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <p>{formatBookingDate(booking.booking_date)}</p>
                        <p className="mt-1 text-ink/50">{formatBookingTime(booking.booking_time)}</p>
                      </td>
                      <td className="px-4 py-4">{booking.guests}</td>
                      <td className="px-4 py-4">{titleCase(booking.seating_preference)}</td>
                      <td className="max-w-56 px-4 py-4">
                        <p className="line-clamp-2 text-ink/65" title={booking.notes ?? undefined}>
                          {booking.notes || '—'}
                        </p>
                      </td>
                      <td className="w-56 px-4 py-4">
                        <div className="mb-2 flex items-center gap-2">
                          <AdminStatusBadge status={booking.status} />
                          {savingId === booking.id && (
                            <span className="inline-flex items-center gap-1 text-xs text-ink/50" role="status">
                              <LoaderCircle className="animate-spin" size={13} aria-hidden="true" /> Saving
                            </span>
                          )}
                        </div>
                        <select
                          value={booking.status}
                          disabled={savingId === booking.id}
                          onChange={(event) => void updateStatus(booking, event.target.value as BookingStatus)}
                          aria-label={`Update status for ${booking.name}`}
                          className="w-full rounded-lg border border-ink/10 bg-paper/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                        >
                          {BOOKING_STATUSES.map((status) => (
                            <option key={status} value={status}>{titleCase(status)}</option>
                          ))}
                        </select>
                        {updateErrors[booking.id] && (
                          <p className="mt-2 text-xs text-red-700" role="alert">{updateErrors[booking.id]}</p>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
};
