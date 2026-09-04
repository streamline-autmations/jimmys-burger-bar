import React, { useCallback, useEffect, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { formatZar } from '../../lib/cartStore';
import { supabase } from '../../lib/supabase';
import { cardClass, formatDateTime, titleCase } from './adminUtils';
import { AdminError, AdminLoading, EmptyTableRow } from './AdminStates';
import { AdminStatusBadge } from './AdminStatusBadge';
import { ORDER_STATUSES, type Order, type OrderItem, type OrderStatus } from './types';

type OrderWithItems = Order & { order_items: OrderItem[] };

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

  return (
    <section>
      <div className="mb-7">
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-ink/45">Kitchen queue</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-primary sm:text-4xl">Orders</h1>
      </div>

      {error && <div className="mb-6"><AdminError message={error} /></div>}
      {loading ? (
        <AdminLoading label="Loading orders…" />
      ) : (
        <div className={`${cardClass} overflow-hidden p-0`}>
          <div className="overflow-x-auto">
            <table className="min-w-[1250px] w-full text-left text-sm">
              <thead className="border-b border-ink/10 bg-paper/60 text-xs uppercase tracking-wider text-ink/50">
                <tr>
                  <th className="px-4 py-3 font-semibold">Order</th>
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Items</th>
                  <th className="px-4 py-3 font-semibold">Total</th>
                  <th className="px-4 py-3 font-semibold">Requested time</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10">
                {orders.length === 0 ? (
                  <EmptyTableRow colSpan={7} message="No orders yet." />
                ) : (
                  orders.map((order) => (
                    <tr key={order.id} className="align-top hover:bg-paper/35">
                      <td className="whitespace-nowrap px-4 py-4">
                        <p className="font-display font-bold text-primary">{order.order_no}</p>
                        <p className="mt-1 text-xs text-ink/45">Received {formatDateTime(order.created_at)}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium">{order.customer_name}</p>
                        <a className="mt-1 block text-xs text-ink/50 hover:text-primary" href={`tel:${order.phone}`}>
                          {order.phone}
                        </a>
                        <a className="block text-xs text-ink/50 hover:text-primary" href={`mailto:${order.email}`}>
                          {order.email}
                        </a>
                      </td>
                      <td className="max-w-60 px-4 py-4">
                        <p className="font-medium">{titleCase(order.order_type)}</p>
                        {order.order_type === 'table' && order.table_number && (
                          <p className="mt-1 text-xs text-ink/55">Table {order.table_number}</p>
                        )}
                        {order.order_type === 'delivery' && order.delivery_address && (
                          <p className="mt-1 text-xs leading-relaxed text-ink/55">{order.delivery_address}</p>
                        )}
                        {order.order_type === 'delivery' && order.delivery_notes && (
                          <p className="mt-1 text-xs italic leading-relaxed text-ink/45" title={order.delivery_notes}>
                            {order.delivery_notes}
                          </p>
                        )}
                      </td>
                      <td className="min-w-48 px-4 py-4">
                        {order.order_items.length === 0 ? (
                          <span className="text-ink/45">No items found</span>
                        ) : (
                          <ul className="space-y-1">
                            {order.order_items.map((item) => (
                              <li key={item.id} className="leading-snug">
                                <span className="font-semibold">{item.qty}×</span> {item.name}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 font-display font-bold text-primary">
                        {formatZar(order.total)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">{formatDateTime(order.requested_time)}</td>
                      <td className="w-56 px-4 py-4">
                        <div className="mb-2 flex items-center gap-2">
                          <AdminStatusBadge status={order.status} />
                          {savingId === order.id && (
                            <span className="inline-flex items-center gap-1 text-xs text-ink/50" role="status">
                              <LoaderCircle className="animate-spin" size={13} aria-hidden="true" /> Saving
                            </span>
                          )}
                        </div>
                        <select
                          value={order.status}
                          disabled={savingId === order.id}
                          onChange={(event) => void updateStatus(order, event.target.value as OrderStatus)}
                          aria-label={`Update status for order ${order.order_no}`}
                          className="w-full rounded-lg border border-ink/10 bg-paper/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                        >
                          {ORDER_STATUSES.map((status) => (
                            <option key={status} value={status}>{titleCase(status)}</option>
                          ))}
                        </select>
                        {updateErrors[order.id] && (
                          <p className="mt-2 text-xs text-red-700" role="alert">{updateErrors[order.id]}</p>
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
