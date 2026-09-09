import { useAdminResource } from './useAdminResource';
import { AdminRefresh } from './AdminRefresh';
import React, { useCallback } from 'react';
import { ArrowRight, CalendarDays, Clock3, ShoppingBag, UtensilsCrossed } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCartMoney } from '../../lib/cartStore';
import { toMinor } from '../../core/domain/money';
import { data as db } from '../../core/data';
import { config } from '../../config';
import {
  cardClass,
  eyebrowClass,
  formatBookingTime,
  formatTimeOnly,
  panelClass,
  panelHeadingClass,
  titleCase,
} from './adminUtils';
import { AdminError, AdminSkeleton } from './AdminStates';
import { AdminStatusBadge } from './AdminStatusBadge';
import type { Booking, Order } from './types';

interface DashboardData {
  todayBookingsCount: number;
  todayOrdersCount: number;
  pendingBookingsCount: number;
  newOrdersCount: number;
  todayBookings: Booking[];
  newOrders: Order[];
}

const initialData: DashboardData = {
  todayBookingsCount: 0,
  todayOrdersCount: 0,
  pendingBookingsCount: 0,
  newOrdersCount: 0,
  todayBookings: [],
  newOrders: [],
};

const todayLabel = new Intl.DateTimeFormat(config.locale, {
  timeZone: config.timezone,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

export const AdminDashboard: React.FC = () => {
  const load = useCallback(() => db.loadDashboard(), []);
  const { data, loading, error, updatedAt, refresh: fetchDashboard } = useAdminResource(load, initialData);

  // Two tiers, deliberately. The top row is what somebody has to DO something
  // about; the strip underneath is context. The previous four identical tiles
  // gave "new orders" exactly the same weight as "today's total", which is the
  // wrong emphasis for a screen that gets glanced at mid-service.
  const needsAction = [
    {
      label: 'New orders',
      value: data.newOrdersCount,
      hint: 'waiting to be accepted',
      to: '/admin/orders',
      icon: ShoppingBag,
    },
    {
      label: 'Pending bookings',
      value: data.pendingBookingsCount,
      hint: 'upcoming, awaiting confirmation',
      to: '/admin/bookings',
      icon: UtensilsCrossed,
    },
  ];

  const context = [
    { label: "Bookings today", value: data.todayBookingsCount, icon: CalendarDays },
    { label: 'Orders due today', value: data.todayOrdersCount, icon: Clock3 },
  ];

  return (
    <section>
      <div className="mb-6">
        <p className={eyebrowClass}>{todayLabel.format(new Date())}</p>
        <h1 className="mt-1 font-display text-[1.75rem] font-bold leading-tight text-primary sm:text-4xl">
          Today at Jimmy&apos;s
        </h1>
      </div>

      <AdminRefresh loading={loading} updatedAt={updatedAt} onRefresh={() => void fetchDashboard()} />
      {error && (
        <div className="mb-6">
          <AdminError message={error} onRetry={() => void fetchDashboard()} />
        </div>
      )}

      {loading && !updatedAt ? (
        <AdminSkeleton rows={3} />
      ) : error && !updatedAt ? null : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {needsAction.map(({ label, value, hint, to, icon: Icon }) => {
              const active = value > 0;
              return (
                <Link
                  key={label}
                  to={to}
                  className={`group flex items-center gap-4 rounded-2xl p-5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                    active
                      ? 'bg-primary text-surface ring-1 ring-primary hover:bg-primary/95'
                      : `${cardClass} text-ink hover:bg-paper/60`
                  }`}
                >
                  <span
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                      active ? 'bg-accent text-ink' : 'bg-accent/20 text-primary'
                    }`}
                  >
                    <Icon size={22} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-3xl font-bold leading-none">{value}</span>
                    <span className={`mt-1 block text-sm font-bold ${active ? 'text-surface' : 'text-ink'}`}>
                      {label}
                    </span>
                    <span className={`block text-xs ${active ? 'text-surface/70' : 'text-ink/65'}`}>{hint}</span>
                  </span>
                  <ArrowRight
                    size={18}
                    aria-hidden="true"
                    className={`shrink-0 transition-transform group-hover:translate-x-0.5 ${
                      active ? 'text-surface/80' : 'text-ink/65'
                    }`}
                  />
                </Link>
              );
            })}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            {context.map(({ label, value, icon: Icon }) => (
              <div key={label} className={`${cardClass} flex items-center gap-3 px-4 py-3.5`}>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink/[0.06] text-primary">
                  <Icon size={17} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block font-display text-xl font-bold leading-none text-primary">{value}</span>
                  <span className="mt-0.5 block truncate text-xs font-medium text-ink/65">{label}</span>
                </span>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <article className={`${panelClass} min-w-0`}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className={panelHeadingClass}>Today&apos;s service (up to 8)</h2>
                <Link
                  to="/admin/bookings"
                  className="shrink-0 rounded text-sm font-bold text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  All bookings
                </Link>
              </div>
              {data.todayBookings.length === 0 ? (
                <p className="py-8 text-center text-sm text-ink/65">No bookings today.</p>
              ) : (
                <ul className="divide-y divide-ink/10">
                  {data.todayBookings.map((booking) => (
                    <li key={booking.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <time className="w-14 shrink-0 font-display text-base font-bold text-primary">
                        {formatBookingTime(booking.booking_time)}
                      </time>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{booking.name}</p>
                        <p className="text-xs text-ink/65">
                          {booking.guests} {booking.guests === 1 ? 'guest' : 'guests'} ·{' '}
                          {titleCase(booking.seating_preference)}
                        </p>
                      </div>
                      <AdminStatusBadge status={booking.status} />
                    </li>
                  ))}
                </ul>
              )}
            </article>

            <article className={`${panelClass} min-w-0`}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className={panelHeadingClass}>Waiting to be accepted</h2>
                <Link
                  to="/admin/orders"
                  className="shrink-0 rounded text-sm font-bold text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  All orders
                </Link>
              </div>
              {data.newOrders.length === 0 ? (
                <p className="py-8 text-center text-sm text-ink/65">No orders waiting for acceptance.</p>
              ) : (
                <ul className="divide-y divide-ink/10">
                  {data.newOrders.map((order) => (
                    <li key={order.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <span className="w-14 shrink-0 font-display text-base font-bold text-primary">
                        {formatTimeOnly(order.requested_time)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">
                          {order.order_no} · {order.customer_name}
                        </p>
                        <p className="text-xs text-ink/65">{titleCase(order.order_type)}</p>
                      </div>
                      <span className="shrink-0 font-display font-bold text-primary">{formatCartMoney(toMinor(order.total))}</span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </div>
        </>
      )}
    </section>
  );
};
