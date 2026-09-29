import { useAdminResource } from './useAdminResource';
import { AdminRefresh } from './AdminRefresh';
import { matchesSearch, nextStatuses } from './operations';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { History, Mail, MessageSquareText, Phone } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { data as db, type ListView } from '../../core/data';
import { useIsDesktop } from '../../lib/useDesktop';
import {
  formatBookingDate,
  formatBookingTime,
  formatDayLabel,
  formatDayTime,
  isClosed,
  titleCase,
} from './adminUtils';
import { AdminEmpty, AdminError, AdminSkeleton } from './AdminStates';
import { AdminPageHeader } from './AdminPageHeader';
import { AdminStatusBadge } from './AdminStatusBadge';
import { Fact, ProgressRail, QueueFilter, QueueRow, QueueToolbar, TicketActions, TicketPlaceholder, WorkspaceSplit, type SavedChange } from './AdminWorkspace';
import { BOOKING_STATUSES, type Booking, type BookingStatus } from './types';

type BookingFilter = 'all' | BookingStatus;

const VIEWS = [
  { value: 'active', label: 'Upcoming' },
  { value: 'today', label: 'Today' },
  { value: 'history', label: 'Past bookings' },
  { value: 'all', label: 'All dates' },
];

const PROGRESS = ['pending', 'confirmed'] as const;
const PROGRESS_LABELS = { pending: 'Requested', confirmed: 'Confirmed' };

// Honest about what confirming is: the product has no floor plan and no
// availability check, so staff decide whether there is room.
const HINTS: Record<string, string> = {
  pending: 'Check you have room first. Confirming does not hold a specific table. The guest can see the confirmation on the tracking page.',
};

/** Today, Tomorrow and Yesterday need the calendar date beside them; a weekday label already carries it. */
const isRelativeDay = (date: string) => ['Today', 'Tomorrow', 'Yesterday'].includes(formatDayLabel(date));

const guestsLabel = (count: number) => `${count} ${count === 1 ? 'guest' : 'guests'}`;

const BookingTicket: React.FC<{ booking: Booking; actions: React.ReactNode; docked: boolean }> = ({ booking, actions, docked }) => {
  const received = formatDayTime(booking.created_at);
  return (
    <article
      aria-label={`Booking for ${booking.name}`}
      className={`admin-ticket-in flex flex-col overflow-hidden rounded-2xl bg-surface ring-1 ring-ink/10 shadow-[0_18px_44px_-26px_rgb(var(--color-ink)/0.5)] ${
        docked ? 'max-h-[calc(100dvh-3.5rem-var(--admin-bottom-inset,0px))]' : ''
      }`}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <header className="px-5 pb-4 pt-5 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <AdminStatusBadge status={booking.status} size="md" />
            <p className="text-xs text-ink/60">
              Received {received.day === 'Today' || received.day === 'Yesterday' ? received.day.toLowerCase() : received.day} at {received.time}
            </p>
          </div>
          <h2 className="mt-3 break-words font-display text-[1.9rem] font-bold leading-[1.1] text-primary">{booking.name}</h2>
          <p className="mt-1 text-sm text-ink/65">
            {booking.status === 'pending' ? 'Table request, waiting for you to confirm.' : booking.status === 'confirmed' ? 'Confirmed booking.' : 'Cancelled booking.'}
          </p>
        </header>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-4 border-y border-ink/10 bg-paper px-5 py-4 sm:grid-cols-4 sm:px-6">
          <Fact label="Date">
            {formatDayLabel(booking.booking_date)}
            {isRelativeDay(booking.booking_date) && <span className="block font-body text-sm font-semibold text-ink/65">{formatBookingDate(booking.booking_date)}</span>}
          </Fact>
          <Fact label="Time">
            <span className="text-2xl tabular-nums">{formatBookingTime(booking.booking_time)}</span>
          </Fact>
          <Fact label="Party">{guestsLabel(booking.guests)}</Fact>
          <Fact label="Seating">{booking.seating_preference}</Fact>
        </dl>

        {booking.status === 'cancelled' ? (
          <p className="mx-5 mt-5 rounded-xl bg-ink/[0.05] px-4 py-3 text-sm font-semibold text-ink/75 sm:mx-6">
            This booking was cancelled. It stays here for the record.
          </p>
        ) : (
          <div className="mx-auto max-w-xs px-4 pt-5">
            <ProgressRail steps={PROGRESS} current={booking.status} labels={PROGRESS_LABELS} />
          </div>
        )}

        <section className="mx-5 mt-5 sm:mx-6" aria-label="Guest note">
          {booking.notes ? (
            <div className="rounded-xl bg-accent/[0.14] px-4 py-3 ring-1 ring-accent/40">
              <h3 className="flex items-center gap-1.5 text-xs font-bold text-ink/70">
                <MessageSquareText size={14} aria-hidden="true" />
                Note from the guest
              </h3>
              <p className="mt-1 whitespace-pre-line break-words text-base leading-relaxed text-ink">{booking.notes}</p>
            </div>
          ) : (
            <p className="text-sm text-ink/60">No note from the guest.</p>
          )}
        </section>

        <section className="px-5 pb-5 pt-4 sm:px-6" aria-label="Guest contact">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <a href={`tel:${booking.phone}`} className="inline-flex min-h-10 items-center gap-1.5 rounded font-semibold text-ink hover:text-primary hover:underline">
              <Phone size={15} aria-hidden="true" className="text-ink/60" />
              {booking.phone}
            </a>
            <a href={`mailto:${booking.email}`} className="inline-flex min-h-10 min-w-0 items-center gap-1.5 rounded font-semibold text-ink hover:text-primary hover:underline">
              <Mail size={15} aria-hidden="true" className="shrink-0 text-ink/60" />
              <span className="truncate">{booking.email}</span>
            </a>
            {booking.customer_id && (
              <Link to={`/admin/customers/${booking.customer_id}`} className="inline-flex min-h-10 items-center gap-1.5 rounded font-bold text-primary hover:underline">
                <History size={15} aria-hidden="true" />
                Guest history
              </Link>
            )}
          </div>
        </section>
      </div>
      {actions}
    </article>
  );
};

export const AdminBookings: React.FC = () => {
  const desktop = useIsDesktop();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('booking');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<ListView>('active');
  const [limit, setLimit] = useState(200);
  const [filter, setFilter] = useState<BookingFilter>('all');

  const mutation = useRef(false);
  const [saving, setSaving] = useState<{ id: string; to: string } | null>(null);
  const [saved, setSaved] = useState<SavedChange | null>(null);
  const [updateErrors, setUpdateErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => db.listBookings({ view, limit }), [view, limit]);
  const { data: bookings, setData: setBookings, loading, error, updatedAt, refresh: fetchBookings } =
    useAdminResource<Booking[]>(load, [], { paused: saving !== null });

  const filtered = useMemo(
    () => bookings.filter((item) => (filter === 'all' || item.status === filter) && matchesSearch(search, item.id, item.name, item.phone, item.email)),
    [bookings, filter, search],
  );

  const counts = useMemo(() => {
    const result: Record<string, number> = { all: bookings.length };
    for (const booking of bookings) result[booking.status] = (result[booking.status] ?? 0) + 1;
    return result;
  }, [bookings]);

  // Consecutive runs of one date, in the adapter's order (soonest first for
  // upcoming, latest first for past bookings).
  const groups = useMemo(() => {
    const result: { date: string; rows: Booking[] }[] = [];
    for (const booking of filtered) {
      const last = result[result.length - 1];
      if (last && last.date === booking.booking_date) last.rows.push(booking);
      else result.push({ date: booking.booking_date, rows: [booking] });
    }
    return result;
  }, [filtered]);

  const selected = bookings.find((booking) => booking.id === selectedId) ?? null;

  const select = useCallback((id: string | null) => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (id) next.set('booking', id);
      else next.delete('booking');
      return next;
    }, { replace: true });
  }, [setParams]);

  useEffect(() => {
    if (!desktop || !updatedAt || selected || filtered.length === 0) return;
    select((filtered.find((booking) => booking.status === 'pending') ?? filtered[0]).id);
  }, [desktop, updatedAt, selected, filtered, select]);

  const updateStatus = async (booking: Booking, next: BookingStatus) => {
    if (mutation.current || !nextStatuses(booking.status).includes(next)) return;
    mutation.current = true;
    setSaved(null);
    setSaving({ id: booking.id, to: next });
    setUpdateErrors((current) => {
      const copy = { ...current };
      delete copy[booking.id];
      return copy;
    });

    try {
      await db.advanceBookingStatus(booking.id, booking.status, next);
      setBookings((current) => current.map((item) => (item.id === booking.id ? { ...item, status: next } : item)));
      setSaved({ id: booking.id, status: next, at: new Date() });
      await fetchBookings();
    } catch {
      setUpdateErrors((current) => ({ ...current, [booking.id]: 'Could not verify this change. Refresh before trying again; another staff member may have updated it.' }));
    } finally {
      mutation.current = false;
      setSaving(null);
    }
  };

  const ticketFor = (booking: Booking, docked: boolean) => (
    <BookingTicket
      key={booking.id}
      booking={booking}
      docked={docked}
      actions={
        <TicketActions
          status={booking.status}
          cancelLabel={booking.status === 'pending' ? 'Cancel request' : 'Cancel booking'}
          describedAs={`Booking for ${booking.name}`}
          disabled={saving !== null || (loading && !updatedAt)}
          saving={saving?.id === booking.id}
          savingTo={saving?.id === booking.id ? saving.to : null}
          error={updateErrors[booking.id]}
          saved={saved?.id === booking.id && saved.status === booking.status ? saved : null}
          hint={HINTS[booking.status]}
          onChange={(next) => void updateStatus(booking, next as BookingStatus)}
        />
      }
    />
  );

  const pending = counts.pending ?? 0;
  const summary = !updatedAt
    ? undefined
    : view === 'active'
      ? pending
        ? `${pending} table ${pending === 1 ? 'request' : 'requests'} to confirm, ${bookings.length} upcoming in total.`
        : `No requests waiting. ${bookings.length} upcoming ${bookings.length === 1 ? 'booking' : 'bookings'}.`
      : `${bookings.length} ${bookings.length === 1 ? 'booking' : 'bookings'} loaded.`;

  const queue = loading && !updatedAt ? (
    <AdminSkeleton rows={5} />
  ) : error && !updatedAt ? null : filtered.length === 0 ? (
    <AdminEmpty
      title={filter === 'all' && !search ? 'No bookings here' : 'No matching bookings'}
      hint={filter === 'all' && !search ? 'Table requests appear here as guests send them.' : 'Try another search, status or date view.'}
    />
  ) : (
    <div className="space-y-5">
      {groups.map((group) => (
        <section key={group.date} aria-label={formatBookingDate(group.date)}>
          <h2 className="mb-2 flex items-baseline gap-2 px-1">
            <span className="font-display text-lg font-bold text-primary">{formatDayLabel(group.date)}</span>
            {isRelativeDay(group.date) && <span className="text-sm font-medium text-ink/60">{formatBookingDate(group.date)}</span>}
          </h2>
          <ul className="space-y-2">
            {group.rows.map((booking) => {
              const isSelected = booking.id === selected?.id;
              const closed = isClosed(booking.status);
              return (
                <li key={booking.id}>
                  <QueueRow
                    selected={isSelected}
                    needsAction={booking.status === 'pending'}
                    closed={closed}
                    expanded={desktop ? undefined : isSelected}
                    label={`${booking.name}, ${titleCase(booking.status)}, ${formatDayLabel(booking.booking_date)} ${formatBookingTime(booking.booking_time)}, ${guestsLabel(booking.guests)}`}
                    onSelect={() => select(!desktop && isSelected ? null : booking.id)}
                  >
                    <span className={`w-14 shrink-0 font-display text-xl font-bold tabular-nums ${closed ? 'text-ink/50 line-through decoration-2' : 'text-primary'}`}>
                      {formatBookingTime(booking.booking_time)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-base font-bold ${closed ? 'text-ink/70' : 'text-ink'}`}>{booking.name}</span>
                      <span className="mt-0.5 block truncate text-sm text-ink/65">
                        {guestsLabel(booking.guests)}, {booking.seating_preference.toLowerCase()}
                        {booking.notes && <span className="font-semibold text-ink/75">. Has a note</span>}
                      </span>
                    </span>
                    <AdminStatusBadge status={booking.status} />
                  </QueueRow>
                  {!desktop && isSelected && <div className="mt-2">{ticketFor(booking, false)}</div>}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );

  const ticket = selected ? ticketFor(selected, true) : loading && !updatedAt ? (
    <TicketPlaceholder title="Loading bookings…" />
  ) : !updatedAt ? (
    <TicketPlaceholder title="Bookings could not load" hint="Use Try again once the connection is back." />
  ) : filtered.length === 0 ? (
    <TicketPlaceholder title="Nothing to review" hint="When a guest requests a table, it opens here." />
  ) : (
    <TicketPlaceholder title="No booking selected" hint="Choose one from the list to see the details and next step." />
  );

  return (
    <section>
      <WorkspaceSplit
        queue={
          <>
            <AdminPageHeader title="Bookings" count={summary}>
              <AdminRefresh compact className="" disabled={saving !== null} loading={loading} updatedAt={updatedAt} onRefresh={() => void fetchBookings()} />
            </AdminPageHeader>

            <QueueToolbar
              filter={
                <QueueFilter<BookingFilter>
                  label="Filter bookings by status"
                  options={['all', ...BOOKING_STATUSES] as BookingFilter[]}
                  value={filter}
                  counts={updatedAt ? counts : {}}
                  onChange={setFilter}
                  names={{ pending: 'To confirm' }}
                />
              }
              search={search}
              onSearch={setSearch}
              view={view}
              views={VIEWS}
              onView={(value) => { setView(value as ListView); setLimit(200); }}
              viewDisabled={saving !== null}
            />

            {error && (
              <div className="mb-5">
                <AdminError message={error} onRetry={() => void fetchBookings()} />
              </div>
            )}

            {queue}
            {updatedAt && bookings.length > 0 && (
              <p className="mt-3 text-xs text-ink/60">
                {filtered.length} of {bookings.length} loaded {bookings.length === 1 ? 'booking' : 'bookings'} shown. Search covers loaded records only.
              </p>
            )}
            {bookings.length >= limit && (
              <button className="mt-4 min-h-11 rounded-xl border border-ink/20 bg-surface px-5 font-bold" disabled={loading || saving !== null} onClick={() => setLimit((value) => value + 200)}>
                Load more records
              </button>
            )}
          </>
        }
        ticket={desktop ? ticket : null}
      />
    </section>
  );
};
