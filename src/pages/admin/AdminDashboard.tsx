import { useAdminResource } from './useAdminResource';
import { AdminRefresh } from './AdminRefresh';
import React, { useCallback } from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCartMoney } from '../../lib/cartStore';
import { toMinor } from '../../core/domain/money';
import { data as db } from '../../core/data';
import { config } from '../../config';
import { formatBookingTime, formatDayTime, titleCase } from './adminUtils';
import { AdminError, AdminSkeleton } from './AdminStates';
import { AdminStatusBadge } from './AdminStatusBadge';
import type { DashboardSnapshot, SalesSummary } from '../../core/data';
import { formatWholeMoney } from '../../core/data/sales';

const initialData: DashboardSnapshot = {
  todayBookingsCount: 0,
  todayOrdersCount: 0,
  pendingBookingsCount: 0,
  newOrdersCount: 0,
  todayBookings: [],
  newOrders: [],
  sales: { todayTotal: 0, todayCount: 0, weekTotal: 0, weekCount: 0 },
};

const todayLabel = new Intl.DateTimeFormat(config.locale, {
  timeZone: config.timezone,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/**
 * One of the two queues that need a decision. Gold-edged while anything is
 * waiting; every row opens that record's ticket on its own page.
 */
const ActionQueue: React.FC<{
  title: string;
  count: number;
  to: string;
  linkLabel: string;
  empty: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}> = ({ title, count, to, linkLabel, empty, children, footer }) => (
  <article
    className={`relative flex min-w-0 flex-col overflow-hidden rounded-2xl bg-surface ring-1 shadow-[0_10px_30px_-20px_rgb(var(--color-ink)/0.4)] ${
      count > 0 ? 'ring-accent/60' : 'ring-ink/10'
    }`}
  >
    {count > 0 && <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1.5 bg-accent" />}
    <header className="flex items-center justify-between gap-3 px-5 pb-3 pt-5">
      <h2 className="flex items-center gap-2.5 font-display text-lg font-bold leading-tight text-primary sm:text-xl">
        {title}
        <span className={`rounded-lg px-2 py-0.5 text-base tabular-nums ${count > 0 ? 'bg-accent text-ink' : 'bg-ink/[0.07] text-ink/60'}`}>{count}</span>
      </h2>
      <Link to={to} className="shrink-0 rounded text-sm font-bold text-primary hover:underline">
        {linkLabel}
      </Link>
    </header>
    {count === 0 ? <p className="px-5 pb-6 pt-2 text-sm text-ink/65">{empty}</p> : children}
    {footer}
  </article>
);

/** Whole units: the strip is read at a glance, and cents are noise here. */
const rands = formatWholeMoney;

const Figure: React.FC<{ label: string; value: string; note: string; highlight?: boolean; className?: string }> = ({ label, value, note, highlight, className = '' }) => (
  <div className={`min-w-0 px-5 py-4 ${highlight ? 'bg-accent text-ink' : ''} ${className}`}>
    <dt className={`text-sm font-bold ${highlight ? 'text-ink' : 'text-paper/75'}`}>{label}</dt>
    <dd className="mt-1 font-display text-[1.65rem] font-bold leading-none tabular-nums sm:text-3xl">{value}</dd>
    <dd className={`mt-1.5 text-xs font-semibold ${highlight ? 'text-ink/75' : 'text-paper/60'}`}>{note}</dd>
  </div>
);

/**
 * What came in directly. Order value rather than takings, since guests pay on
 * collection. The commission figure appears only when the restaurant's config
 * sets a comparison rate.
 */
const SalesStrip: React.FC<{ sales: SalesSummary }> = ({ sales }) => {
  const rate = config.reporting?.appCommissionRate;
  const average = sales.weekCount ? sales.weekTotal / sales.weekCount : 0;
  return (
    <dl
      aria-label="Direct orders"
      className={`mb-5 grid grid-cols-2 divide-paper/10 overflow-hidden rounded-2xl bg-ink text-paper ${rate ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} [&>div]:border-paper/10 [&>div:nth-child(n+3)]:border-t lg:[&>div]:border-l lg:[&>div:first-child]:border-l-0 lg:[&>div:nth-child(n+3)]:border-t-0`}
    >
      <Figure label="Ordered today" value={rands(sales.todayTotal)} note={plural(sales.todayCount, 'order', 'orders')} />
      <Figure label="Last 7 days" value={rands(sales.weekTotal)} note={plural(sales.weekCount, 'order', 'orders')} />
      {/* Without the commission figure, the average takes the whole second row on phones. */}
      <Figure label="Average order" value={rands(average)} note="Last 7 days" className={rate ? '' : 'col-span-2 lg:col-span-1'} />
      {rate ? (
        <Figure
          highlight
          label="Commission kept"
          value={rands(sales.weekTotal * rate)}
          note={`What a ${Math.round(rate * 100)}% delivery app would have taken`}
        />
      ) : null}
    </dl>
  );
};

const rowClass =
  'group flex items-center gap-4 border-t border-ink/10 px-5 py-3.5 transition-colors duration-150 hover:bg-paper';

export const AdminDashboard: React.FC = () => {
  const load = useCallback(() => db.loadDashboard(), []);
  const { data, loading, error, updatedAt, refresh: fetchDashboard } = useAdminResource(load, initialData);

  const pendingToday = data.todayBookings.filter((booking) => booking.status === 'pending');
  const morePending = Math.max(0, data.pendingBookingsCount - pendingToday.length);
  const moreOrders = Math.max(0, data.newOrdersCount - data.newOrders.length);

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="font-display text-[1.75rem] font-bold leading-tight text-primary sm:text-4xl">Today at {config.venue.name}</h1>
          <p className="mt-1 min-h-6 text-base font-medium text-ink/70">
            {todayLabel.format(new Date())}
            {updatedAt && `. ${plural(data.todayBookingsCount, 'booking', 'bookings')} and ${plural(data.todayOrdersCount, 'order', 'orders')} due today.`}
          </p>
        </div>
        <AdminRefresh compact className="" loading={loading} updatedAt={updatedAt} onRefresh={() => void fetchDashboard()} />
      </div>

      {error && (
        <div className="mb-6">
          <AdminError message={error} onRetry={() => void fetchDashboard()} />
        </div>
      )}

      {loading && !updatedAt ? (
        <AdminSkeleton rows={4} />
      ) : error && !updatedAt ? null : (
        <>
          <SalesStrip sales={data.sales} />
          <div className="grid items-start gap-5 lg:grid-cols-2">
            <ActionQueue
              title="Orders to accept"
              count={data.newOrdersCount}
              to="/admin/orders"
              linkLabel="All orders"
              empty="Nothing waiting. New orders appear here as guests place them."
              footer={moreOrders > 0 && (
                <Link to="/admin/orders" className="border-t border-ink/10 px-5 py-3 text-sm font-bold text-primary hover:bg-paper">
                  {plural(moreOrders, 'more order', 'more orders')} waiting
                </Link>
              )}
            >
              <ul>
                {data.newOrders.map((order) => {
                  const requested = formatDayTime(order.requested_time);
                  return (
                    <li key={order.id}>
                      <Link to={`/admin/orders?order=${order.id}`} className={rowClass} aria-label={`Review order from ${order.customer_name}, ${formatCartMoney(toMinor(order.total))}`}>
                        <span className="w-14 shrink-0">
                          <span className="block font-display text-xl font-bold leading-none text-primary tabular-nums">{requested.time}</span>
                          <span className="mt-1 block text-xs font-semibold text-ink/60">{requested.day}</span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-bold text-ink">{order.customer_name}</span>
                          <span className="block text-sm text-ink/65">
                            {order.order_type === 'table' && order.table_number ? `Table ${order.table_number}` : titleCase(order.order_type)}
                          </span>
                        </span>
                        <span className="shrink-0 font-display text-base font-bold text-primary tabular-nums">{formatCartMoney(toMinor(order.total))}</span>
                        <span className="inline-flex shrink-0 items-center gap-0.5 text-sm font-bold text-primary">
                          <span className="hidden sm:inline">Review</span>
                          <ChevronRight size={16} aria-hidden="true" className="transition-transform duration-150 group-hover:translate-x-0.5" />
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </ActionQueue>

            <ActionQueue
              title="Table requests to confirm"
              count={data.pendingBookingsCount}
              to="/admin/bookings"
              linkLabel="All bookings"
              empty="No table requests waiting."
              footer={morePending > 0 && (
                <Link to="/admin/bookings" className="border-t border-ink/10 px-5 py-3 text-sm font-bold text-primary hover:bg-paper">
                  {plural(morePending, 'more request', 'more requests')} for later dates
                </Link>
              )}
            >
              {pendingToday.length === 0 ? (
                <p className="border-t border-ink/10 px-5 py-4 text-sm text-ink/65">None for today.</p>
              ) : (
                <ul>
                  {pendingToday.map((booking) => (
                    <li key={booking.id}>
                      <Link to={`/admin/bookings?booking=${booking.id}`} className={rowClass} aria-label={`Review table request from ${booking.name}`}>
                        <span className="w-14 shrink-0">
                          <span className="block font-display text-xl font-bold leading-none text-primary tabular-nums">{formatBookingTime(booking.booking_time)}</span>
                          <span className="mt-1 block text-xs font-semibold text-ink/60">Today</span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-bold text-ink">{booking.name}</span>
                          <span className="block truncate text-sm text-ink/65">
                            {plural(booking.guests, 'guest', 'guests')}, {booking.seating_preference.toLowerCase()}
                          </span>
                        </span>
                        <span className="inline-flex shrink-0 items-center gap-0.5 text-sm font-bold text-primary">
                          <span className="hidden sm:inline">Review</span>
                          <ChevronRight size={16} aria-hidden="true" className="transition-transform duration-150 group-hover:translate-x-0.5" />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </ActionQueue>
          </div>

          <article className="mt-5 overflow-hidden rounded-2xl bg-surface ring-1 ring-ink/10">
            <header className="flex items-center justify-between gap-3 px-5 pb-3 pt-5">
              <h2 className="font-display text-xl font-bold text-primary">Today&apos;s tables</h2>
              <Link to="/admin/bookings" className="shrink-0 rounded text-sm font-bold text-primary hover:underline">
                All bookings
              </Link>
            </header>
            {data.todayBookings.length === 0 ? (
              <p className="px-5 pb-6 pt-1 text-sm text-ink/65">No bookings today.</p>
            ) : (
              <ul className="grid border-t border-ink/10 sm:grid-cols-2 xl:grid-cols-4">
                {data.todayBookings.map((booking) => (
                  <li key={booking.id} className="border-b border-ink/10 sm:border-r">
                    <Link to={`/admin/bookings?booking=${booking.id}`} className="flex h-full items-start gap-3 px-5 py-3.5 transition-colors duration-150 hover:bg-paper">
                      <span className="w-12 shrink-0 font-display text-lg font-bold leading-6 text-primary tabular-nums">{formatBookingTime(booking.booking_time)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-ink">{booking.name}</span>
                        <span className="mb-1.5 block text-xs text-ink/65">{plural(booking.guests, 'guest', 'guests')}, {booking.seating_preference.toLowerCase()}</span>
                        <AdminStatusBadge status={booking.status} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {data.todayBookingsCount > data.todayBookings.length && (
              <Link to="/admin/bookings" className="block px-5 py-3 text-sm font-bold text-primary hover:bg-paper">
                {plural(data.todayBookingsCount - data.todayBookings.length, 'more booking', 'more bookings')} today
              </Link>
            )}
          </article>
        </>
      )}
    </section>
  );
};
