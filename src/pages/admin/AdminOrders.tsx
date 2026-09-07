import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bike, Clock3, Phone, ShoppingBag, UtensilsCrossed } from 'lucide-react';
import { formatZar } from '../../lib/cartStore';
import { supabase } from '../../lib/supabase';
import {
  actionableCardClass,
  cardClass,
  formatDateTime,
  formatTimeOnly,
  historicalCardClass,
  isActionable,
  isClosed,
  thClass,
  titleCase,
} from './adminUtils';
import { AdminEmpty, AdminError, AdminSkeleton } from './AdminStates';
import { AdminPageHeader } from './AdminPageHeader';
import { AdminStatusBadge, AdminStatusControl } from './AdminStatusBadge';
import { ORDER_STATUSES, type Order, type OrderItem, type OrderStatus } from './types';

type OrderWithItems = Order & { order_items: OrderItem[] };

const typeIcon = (type: string) =>
  type === 'delivery' ? Bike : type === 'table' ? UtensilsCrossed : ShoppingBag;

/** Where the order is going, in one line. */
const Destination: React.FC<{ order: OrderWithItems }> = ({ order }) => {
  const Icon = typeIcon(order.order_type);
  return (
    <p className="inline-flex items-center gap-1.5 font-semibold text-ink">
      <Icon size={14} aria-hidden="true" />
      {titleCase(order.order_type)}
      {order.order_type === 'table' && order.table_number && (
        <span className="font-normal text-ink/60">· Table {order.table_number}</span>
      )}
    </p>
  );
};

const ItemList: React.FC<{ items: OrderItem[] }> = ({ items }) =>
  items.length === 0 ? (
    <span className="text-ink/45">No items found</span>
  ) : (
    <ul className="space-y-1">
      {items.map((item) => (
        <li key={item.id} className="leading-snug">
          <span className="font-bold text-primary">{item.qty}×</span> {item.name}
        </li>
      ))}
    </ul>
  );

export const AdminOrders: React.FC = () => {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [updateErrors, setUpdateErrors] = useState<Record<string, string>>({});

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false })
      .limit(200);

    if (fetchError) setError(fetchError.message);
    else setOrders(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  const openCount = useMemo(() => orders.filter((order) => isActionable(order.status)).length, [orders]);

  const updateStatus = async (order: OrderWithItems, status: OrderStatus) => {
    if (order.status === status) return;
    setSavingId(order.id);
    setUpdateErrors((current) => {
      const next = { ...current };
      delete next[order.id];
      return next;
    });

    const { error: updateError } = await supabase.from('orders').update({ status }).eq('id', order.id);
    if (updateError) {
      setUpdateErrors((current) => ({ ...current, [order.id]: updateError.message }));
    } else {
      setOrders((current) => current.map((item) => (item.id === order.id ? { ...item, status } : item)));
    }
    setSavingId(null);
  };

  const statusControl = (order: OrderWithItems) => (
    <AdminStatusControl
      id={`order-status-${order.id}`}
      value={order.status as OrderStatus}
      options={ORDER_STATUSES}
      saving={savingId === order.id}
      error={updateErrors[order.id]}
      describedAs={`Update status for order ${order.order_no}`}
      onChange={(next) => void updateStatus(order, next)}
    />
  );

  return (
    <section>
      <AdminPageHeader
        eyebrow="Kitchen queue"
        title="Orders"
        count={loading ? undefined : `${orders.length} shown · ${openCount} still open`}
      />

      {error && (
        <div className="mb-6">
          <AdminError message={error} onRetry={() => void fetchOrders()} />
        </div>
      )}

      {loading ? (
        <AdminSkeleton />
      ) : orders.length === 0 ? (
        <AdminEmpty title="No orders yet" hint="New online orders will land here as they come in." />
      ) : (
        <>
          {/* Phone and tablet: a card per order. The desktop table is 1250px
              wide, so on a phone everything from the items rightwards - the
              total, the requested time, the status control - sat off screen. */}
          <ul className="space-y-3 xl:hidden">
            {orders.map((order) => (
              <li
                key={order.id}
                className={`p-4 ${
                  isActionable(order.status)
                    ? actionableCardClass
                    : isClosed(order.status)
                      ? historicalCardClass
                      : cardClass
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-base font-bold text-primary">{order.order_no}</p>
                    <p className="mt-0.5 truncate text-sm font-medium text-ink/75">{order.customer_name}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <AdminStatusBadge status={order.status} />
                    <p className="mt-1.5 font-display text-lg font-bold text-primary">{formatZar(order.total)}</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <Destination order={order} />
                  <span className="inline-flex items-center gap-1.5 font-semibold text-ink/75">
                    <Clock3 size={14} aria-hidden="true" />
                    Wants it {formatTimeOnly(order.requested_time)}
                  </span>
                </div>

                {order.order_type === 'delivery' && order.delivery_address && (
                  <p className="mt-2 rounded-xl bg-paper/80 px-3 py-2 text-sm leading-relaxed text-ink/70">
                    {order.delivery_address}
                    {order.delivery_notes && (
                      <span className="mt-1 block italic text-ink/55">{order.delivery_notes}</span>
                    )}
                  </p>
                )}

                <div className="mt-3 rounded-xl bg-paper/60 px-3 py-2.5 text-sm text-ink/80">
                  <ItemList items={order.order_items} />
                </div>

                <a
                  href={`tel:${order.phone}`}
                  className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-full bg-primary px-3.5 text-sm font-bold text-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  <Phone size={14} aria-hidden="true" />
                  Call customer
                </a>

                <div className="mt-3 border-t border-ink/10 pt-3">{statusControl(order)}</div>
              </li>
            ))}
          </ul>

          <div className={`${cardClass} hidden overflow-hidden xl:block`}>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink/10 bg-paper/60">
                <tr>
                  <th className={thClass}>Order</th>
                  <th className={thClass}>Customer</th>
                  <th className={thClass}>Destination</th>
                  <th className={thClass}>Items</th>
                  <th className={thClass}>Total</th>
                  <th className={thClass}>Wanted</th>
                  <th className={`${thClass} w-56`}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10">
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className={`align-top transition-colors hover:bg-paper/50 ${
                      isClosed(order.status) ? 'text-ink/55' : ''
                    }`}
                  >
                    <td className="relative whitespace-nowrap px-4 py-4">
                      {isActionable(order.status) && (
                        <span className="absolute inset-y-0 left-0 w-1 bg-accent" aria-hidden="true" />
                      )}
                      <p className="font-display font-bold text-primary">{order.order_no}</p>
                      <p className="mt-1 text-xs text-ink/45">{formatDateTime(order.created_at)}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold">{order.customer_name}</p>
                      <a className="mt-1 block text-xs text-ink/55 hover:text-primary" href={`tel:${order.phone}`}>
                        {order.phone}
                      </a>
                      <a className="block text-xs text-ink/55 hover:text-primary" href={`mailto:${order.email}`}>
                        {order.email}
                      </a>
                    </td>
                    <td className="max-w-60 px-4 py-4">
                      <Destination order={order} />
                      {order.order_type === 'delivery' && order.delivery_address && (
                        <p className="mt-1 text-xs leading-relaxed text-ink/60">{order.delivery_address}</p>
                      )}
                      {order.order_type === 'delivery' && order.delivery_notes && (
                        <p className="mt-1 text-xs italic leading-relaxed text-ink/45">{order.delivery_notes}</p>
                      )}
                    </td>
                    <td className="min-w-48 px-4 py-4">
                      <ItemList items={order.order_items} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 font-display text-base font-bold text-primary">
                      {formatZar(order.total)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <p className="font-display text-base font-bold text-primary">
                        {formatTimeOnly(order.requested_time)}
                      </p>
                      <p className="mt-1 text-xs text-ink/45">{formatDateTime(order.requested_time)}</p>
                    </td>
                    <td className="w-56 px-4 py-4">
                      <div className="mb-2.5">
                        <AdminStatusBadge status={order.status} />
                      </div>
                      {statusControl(order)}
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
