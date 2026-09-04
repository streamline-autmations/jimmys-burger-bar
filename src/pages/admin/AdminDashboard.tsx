import React, { useCallback, useEffect, useState } from 'react';
import { CalendarDays, Clock3, ShoppingBag, UtensilsCrossed } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatZar } from '../../lib/cartStore';
import { supabase } from '../../lib/supabase';
import {
  cardClass,
  formatBookingTime,
  formatDateTime,
  getLocalDayBounds,
  getLocalToday,
  titleCase,
} from './adminUtils';
import { AdminError, AdminLoading } from './AdminStates';
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

export const AdminDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    const today = getLocalToday();
    const { start, end } = getLocalDayBounds();

    const [
      todayBookingsCount,
      todayOrdersCount,
      pendingBookingsCount,
      newOrdersCount,
      todayBookings,
      newOrders,
    ] = await Promise.all([
      supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('booking_date', today),
      supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .gte('requested_time', start)
        .lt('requested_time', end),
      supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .gte('booking_date', today)
        .eq('status', 'pending'),
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'new'),
      supabase
        .from('bookings')
        .select('*')
        .eq('booking_date', today)
        .order('booking_time', { ascending: true })
        .limit(8),
      supabase.from('orders').select('*').eq('status', 'new').order('created_at', { ascending: false }).limit(8),
    ]);

    const firstError = [
      todayBookingsCount.error,
      todayOrdersCount.error,
      pendingBookingsCount.error,
      newOrdersCount.error,
      todayBookings.error,
      newOrders.error,
    ].find(Boolean);

    if (firstError) {
      setError(firstError.message);
    } else {
      setData({
        todayBookingsCount: todayBookingsCount.count ?? 0,
        todayOrdersCount: todayOrdersCount.count ?? 0,
        pendingBookingsCount: pendingBookingsCount.count ?? 0,
        newOrdersCount: newOrdersCount.count ?? 0,
        todayBookings: todayBookings.data ?? [],
        newOrders: newOrders.data ?? [],
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchDashboard();
  }, [fetchDashboard]);

  const stats = [
    { label: "Today's bookings", value: data.todayBookingsCount, icon: CalendarDays },
    { label: "Today's requested orders", value: data.todayOrdersCount, icon: Clock3 },
    { label: 'Upcoming pending bookings', value: data.pendingBookingsCount, icon: UtensilsCrossed },
    { label: 'New orders', value: data.newOrdersCount, icon: ShoppingBag },
  ];

  return (
    <section>
      <div className="mb-7">
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-ink/45">Overview</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-primary sm:text-4xl">Dashboard</h1>
      </div>

      {error && (
        <div className="mb-6 space-y-3">
          <AdminError message={error} />
          <button type="button" onClick={() => void fetchDashboard()} className="text-sm font-semibold text-primary hover:underline">
            Try again
          </button>
        </div>
      )}

      {loading ? (
        <AdminLoading label="Loading dashboard…" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map(({ label, value, icon: Icon }) => (
              <article key={label} className={cardClass}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-ink/55">{label}</p>
                    <p className="mt-2 font-display text-4xl font-bold text-primary">{value}</p>
                  </div>
                  <span className="rounded-xl bg-accent/25 p-2.5 text-primary">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <article className={cardClass}>
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className="font-display text-xl font-bold text-primary">Today&apos;s bookings</h2>
                <Link to="/admin/bookings" className="shrink-0 text-sm font-semibold text-primary hover:underline">
                  View all
                </Link>
              </div>
              {data.todayBookings.length === 0 ? (
                <p className="py-8 text-center text-ink/50">No bookings today.</p>
              ) : (
                <ul className="divide-y divide-ink/10">
                  {data.todayBookings.map((booking) => (
                    <li key={booking.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <time className="w-12 shrink-0 font-display font-bold text-primary">
                        {formatBookingTime(booking.booking_time)}
                      </time>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{booking.name}</p>
                        <p className="text-sm text-ink/50">
                          {booking.guests} {booking.guests === 1 ? 'guest' : 'guests'} · {titleCase(booking.seating_preference)}
                        </p>
                      </div>
                      <AdminStatusBadge status={booking.status} />
                    </li>
                  ))}
                </ul>
              )}
            </article>

            <article className={cardClass}>
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className="font-display text-xl font-bold text-primary">New orders</h2>
                <Link to="/admin/orders" className="shrink-0 text-sm font-semibold text-primary hover:underline">
                  View all
                </Link>
              </div>
              {data.newOrders.length === 0 ? (
                <p className="py-8 text-center text-ink/50">No new orders.</p>
              ) : (
                <ul className="divide-y divide-ink/10">
                  {data.newOrders.map((order) => (
                    <li key={order.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {order.order_no} · {order.customer_name}
                        </p>
                        <p className="text-sm text-ink/50">
                          {titleCase(order.order_type)} · {formatDateTime(order.requested_time)}
                        </p>
                      </div>
                      <span className="font-display font-bold text-primary">{formatZar(order.total)}</span>
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
