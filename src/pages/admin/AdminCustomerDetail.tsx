import React, { useCallback, useMemo } from 'react';
import { ArrowLeft, Mail, Phone } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { data as db, type CustomerHistory, type OrderWithItems } from '../../core/data';
import { toMinor } from '../../core/domain/money';
import { formatCartMoney } from '../../lib/cartStore';
import { AdminPageHeader } from './AdminPageHeader';
import { AdminEmpty, AdminError, AdminSkeleton } from './AdminStates';
import { AdminStatusBadge } from './AdminStatusBadge';
import {
  cardClass,
  formatBookingDate,
  formatBookingTime,
  formatDateTime,
  getLocalToday,
  historicalCardClass,
  panelClass,
  panelHeadingClass,
  titleCase,
} from './adminUtils';
import { useAdminResource } from './useAdminResource';

const backLinkClass =
  'inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-bold text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50';

const itemSummary = (order: OrderWithItems) =>
  order.order_items.length > 0
    ? order.order_items.map((item) => `${item.qty}× ${item.name}`).join(', ')
    : 'No items found';

const countLabel = (count: number, singular: string, plural = `${singular}s`) =>
  `${count} ${count === 1 ? singular : plural}`;

export const AdminCustomerDetail: React.FC = () => {
  const { customerId = '' } = useParams<{ customerId: string }>();
  const load = useCallback(() => db.loadCustomerHistory(customerId), [customerId]);
  const { data: history, loading, error, updatedAt, refresh } = useAdminResource<CustomerHistory | null>(
    load,
    null,
    { pollMs: 0 },
  );

  const summary = useMemo(() => {
    if (!history) {
      return { totalSpent: 0, completedOrders: 0, cancelled: 0, upcomingBookings: 0 };
    }

    const completedOrders = history.orders.filter((order) => order.status === 'completed');
    const cancelled =
      history.orders.filter((order) => order.status === 'cancelled').length
      + history.bookings.filter((booking) => booking.status === 'cancelled').length;
    const today = getLocalToday();

    return {
      totalSpent: completedOrders.reduce((total, order) => total + order.total, 0),
      completedOrders: completedOrders.length,
      cancelled,
      upcomingBookings: history.bookings.filter(
        (booking) => booking.booking_date >= today && booking.status !== 'cancelled',
      ).length,
    };
  }, [history]);

  if (loading && !updatedAt) {
    return (
      <section>
        <Link to="/admin/customers" className={backLinkClass}>
          <ArrowLeft size={18} aria-hidden="true" />
          All customers
        </Link>
        <div className="mt-5"><AdminSkeleton rows={4} /></div>
      </section>
    );
  }

  if (error && !updatedAt) {
    return (
      <section>
        <Link to="/admin/customers" className={backLinkClass}>
          <ArrowLeft size={18} aria-hidden="true" />
          All customers
        </Link>
        <div className="mt-5 [&_button]:min-h-11"><AdminError message={error} onRetry={() => void refresh()} /></div>
      </section>
    );
  }

  if (!history) {
    return (
      <section>
        <Link to="/admin/customers" className={backLinkClass}>
          <ArrowLeft size={18} aria-hidden="true" />
          All customers
        </Link>
        <div className="mt-5"><AdminEmpty title="Guest not found" hint="This guest record may no longer exist." /></div>
      </section>
    );
  }

  const { customer, orders, bookings } = history;

  return (
    <section>
      <Link to="/admin/customers" className={backLinkClass}>
        <ArrowLeft size={18} aria-hidden="true" />
        All customers
      </Link>

      <div className="mt-4">
        <AdminPageHeader
          eyebrow="Guest history"
          title={customer.name}
          count={`${countLabel(orders.length, 'order')} · ${countLabel(bookings.length, 'booking')}`}
        />
      </div>

      {error && <div className="mb-6 [&_button]:min-h-11"><AdminError message={error} onRetry={() => void refresh()} /></div>}

      <article className={panelClass}>
        <h2 className={panelHeadingClass}>Contact and activity</h2>
        <div className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-xs font-bold text-ink/50">Phone</p>
            {customer.phone ? (
              <a href={`tel:${customer.phone}`} className="inline-flex min-h-11 items-center gap-2 rounded text-sm font-semibold text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
                <Phone size={16} aria-hidden="true" />
                {customer.phone}
              </a>
            ) : <p className="mt-2 text-sm text-ink/65">Not provided</p>}
          </div>
          <div>
            <p className="text-xs font-bold text-ink/50">Email</p>
            {customer.email ? (
              <a href={`mailto:${customer.email}`} className="inline-flex min-h-11 max-w-full items-center gap-2 rounded text-sm font-semibold text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
                <Mail className="shrink-0" size={16} aria-hidden="true" />
                <span className="truncate">{customer.email}</span>
              </a>
            ) : <p className="mt-2 text-sm text-ink/65">Not provided</p>}
          </div>
          <dl className="grid grid-cols-2 gap-4 sm:col-span-2 lg:col-span-1 lg:grid-cols-1">
            <div>
              <dt className="text-xs font-bold text-ink/50">First seen</dt>
              <dd className="mt-1 text-sm font-semibold">{formatDateTime(customer.created_at)}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold text-ink/50">Last interaction</dt>
              <dd className="mt-1 text-sm font-semibold">{formatDateTime(customer.last_interaction_at)}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold text-ink/50">Interactions</dt>
              <dd className="mt-1 text-sm font-semibold">{customer.interaction_count}</dd>
            </div>
          </dl>
        </div>
      </article>

      <dl className={`${cardClass} mt-4 grid grid-cols-2 overflow-hidden lg:grid-cols-4`}>
        {[
          ['Total spent', formatCartMoney(toMinor(summary.totalSpent))],
          ['Completed orders', String(summary.completedOrders)],
          ['Cancelled requests', String(summary.cancelled)],
          ['Upcoming bookings', String(summary.upcomingBookings)],
        ].map(([label, value], index) => (
          <div
            key={label}
            className={`border-ink/10 px-4 py-4 sm:px-5 ${index % 2 === 1 ? 'border-l' : ''} ${index >= 2 ? 'border-t' : ''} ${index > 0 ? 'lg:border-l' : ''} lg:border-t-0`}
          >
            <dt className="text-xs font-bold text-ink/50">{label}</dt>
            <dd className="mt-1 font-display text-xl font-bold text-primary">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="min-w-0">
          <h2 className={`${panelHeadingClass} mb-3`}>Orders</h2>
          {orders.length === 0 ? (
            <AdminEmpty title="No orders yet" />
          ) : (
            <ul className="space-y-3">
              {orders.map((order) => (
                <li key={order.id} className={`${historicalCardClass} p-4`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display font-bold text-primary">{order.order_no}</p>
                      <p className="mt-1 text-xs font-medium text-ink/65">Requested {formatDateTime(order.requested_time)}</p>
                    </div>
                    <AdminStatusBadge status={order.status} />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-ink">{titleCase(order.order_type)}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink/70">{itemSummary(order)}</p>
                  <p className="mt-3 font-display text-lg font-bold text-primary">{formatCartMoney(toMinor(order.total))}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="min-w-0">
          <h2 className={`${panelHeadingClass} mb-3`}>Bookings</h2>
          {bookings.length === 0 ? (
            <AdminEmpty title="No bookings yet" />
          ) : (
            <ul className="space-y-3">
              {bookings.map((booking) => (
                <li key={booking.id} className={`${historicalCardClass} p-4`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display font-bold text-primary">
                        {formatBookingDate(booking.booking_date)} · {formatBookingTime(booking.booking_time)}
                      </p>
                      <p className="mt-1 text-sm text-ink/70">
                        {countLabel(booking.guests, 'guest')} · {titleCase(booking.seating_preference)}
                      </p>
                    </div>
                    <AdminStatusBadge status={booking.status} />
                  </div>
                  {booking.notes && (
                    <p className="mt-3 rounded-xl bg-paper/80 px-3 py-2 text-sm leading-relaxed text-ink/70">{booking.notes}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </section>
  );
};
