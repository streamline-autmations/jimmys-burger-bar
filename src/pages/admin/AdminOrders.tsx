import { useAdminResource } from './useAdminResource';
import { AdminRefresh } from './AdminRefresh';
import { matchesSearch, nextStatuses } from './operations';
import { getLocalDayBounds, controlClass } from './adminUtils';
import React, { useRef, useCallback, useMemo, useState } from 'react';
import { Bike, Clock3, Phone, ShoppingBag, UtensilsCrossed } from 'lucide-react';
import { formatZar } from '../../lib/cartStore';
import { supabase } from '../../lib/supabase';
import {
  actionableCardClass,
  cardClass,
  formatDateTime,
  historicalCardClass,
  isActionable,
  isClosed,
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
        <span className="font-normal text-ink/65">· Table {order.table_number}</span>
      )}
    </p>
  );
};

const ItemList: React.FC<{ items: OrderItem[] }> = ({ items }) =>
  items.length === 0 ? (
    <span className="text-ink/65">No items found</span>
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
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [view, setView] = useState('active');
  const [limit, setLimit] = useState(200);

  const mutation = useRef(false);
  const [feedback, setFeedback] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [updateErrors, setUpdateErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    let query = supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: view === 'active' }).order('id').limit(limit);
    if (view === 'active') query = query.not('status', 'in', '(completed,cancelled)');
    if (view === 'history') query = query.in('status', ['completed', 'cancelled']);
    if (view === 'today') { const { start, end } = getLocalDayBounds(); query = query.gte('requested_time', start).lt('requested_time', end); }
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }, [view, limit]);
  const { data: orders, setData: setOrders, loading, error, updatedAt, refresh: fetchOrders } = useAdminResource<OrderWithItems[]>(load, []);


  const openCount = useMemo(() => orders.filter((order) => isActionable(order.status)).length, [orders]);

  const updateStatus = async (order: OrderWithItems, status: OrderStatus) => {
    if (mutation.current || !nextStatuses(order.status).includes(status)) return;
    mutation.current = true;
    setFeedback('');
    setSavingId(order.id);
    setUpdateErrors((current) => {
      const next = { ...current };
      delete next[order.id];
      return next;
    });

    try {
      const { data, error: updateError } = await supabase.from('orders').update({ status }).eq('id', order.id).eq('status', order.status).select('id');
      if (updateError || data?.length !== 1) throw new Error('conflict');
      setOrders((current) => current.map((item) => item.id === order.id ? { ...item, status } : item));
      setFeedback('Status saved. Contact the customer if they need an update.');
      await fetchOrders();
    } catch {
      setUpdateErrors((current) => ({ ...current, [order.id]: 'Could not verify this change. Refresh before trying again; another staff member may have updated it.' }));
    } finally { mutation.current = false; setSavingId(null); }
  };

  const statusControl = (order: OrderWithItems) => (
    <AdminStatusControl
      value={order.status as OrderStatus}
      options={ORDER_STATUSES}
      saving={savingId !== null || loading || !!error}
      error={updateErrors[order.id]}
      describedAs={`Update status for order ${order.order_no}`}
      onChange={(next) => void updateStatus(order, next)}
    />
  );

  const filtered = orders.filter((item) => (status === 'all' || item.status === status) && matchesSearch(search, item.order_no, item.customer_name, item.phone, item.email));

  return (
    <section>
      <AdminPageHeader
        eyebrow="Kitchen queue"
        title="Orders"
        count={loading ? undefined : `${orders.length} shown · ${openCount} still open`}
      />

      <p role="status" className="mb-3 text-sm font-semibold">{feedback}</p>
      <AdminRefresh disabled={savingId !== null} loading={loading} updatedAt={updatedAt} onRefresh={() => void fetchOrders()} />
      <div role="group" aria-label="Order status filter" className="mb-4 flex flex-wrap gap-2">
        {['all', ...ORDER_STATUSES].map((value) => <button key={value} aria-pressed={status === value} onClick={() => setStatus(value)} className={`min-h-11 rounded-xl border border-ink/20 px-3 text-sm font-bold ${status === value ? 'bg-primary text-surface' : 'bg-surface'}`}>{titleCase(value)} ({value === 'all' ? orders.length : orders.filter((item) => item.status === value).length})</button>)}
      </div>
      <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_220px]">
        <label className="text-sm font-semibold">Search loaded records<input type="search" className={controlClass} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, contact or reference" /></label>
        <label className="text-sm font-semibold">Date / queue<select disabled={savingId !== null} className={controlClass} value={view} onChange={(event) => { setView(event.target.value); setLimit(200); }}><option value="active">Open orders</option><option value="today">Today</option><option value="history">History</option><option value="all">All dates</option></select></label>
      </div>
      <p className="mb-4 text-sm text-ink/75">{filtered.length} matching / {orders.length} loaded. Search applies to loaded records.</p>

      {error && (
        <div className="mb-6">
          <AdminError message={error} onRetry={() => void fetchOrders()} />
        </div>
      )}

      {loading && !updatedAt ? (
        <AdminSkeleton />
      ) : error && !updatedAt ? null : filtered.length === 0 ? (
        <AdminEmpty title="No matching orders" hint="Try another search, status or date view. Refresh to check for new requests." />
      ) : (
        <>
          {/* The same complete order detail is available at every width. */}
          <ul className="grid gap-4 lg:grid-cols-2">
            {filtered.map((order) => (
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
                    Requested {formatDateTime(order.requested_time)}
                  </span>
                </div>

                {order.order_type === 'delivery' && order.delivery_address && (
                  <p className="mt-2 rounded-xl bg-paper/80 px-3 py-2 text-sm leading-relaxed text-ink/70">
                    {order.delivery_address}
                    {order.delivery_notes && (
                      <span className="mt-1 block italic text-ink/65">{order.delivery_notes}</span>
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
                <a className="ml-3 inline-flex min-h-11 items-center underline text-sm" href={`mailto:${order.email}`}>Email customer</a>

                <div className="mt-3 border-t border-ink/10 pt-3">{statusControl(order)}</div>
              </li>
            ))}
          </ul>


        </>
      )}
      {orders.length >= limit && <button className="mt-5 min-h-11 rounded-xl border border-ink/20 px-5 font-bold" disabled={loading || savingId !== null} onClick={() => setLimit((value) => value + 200)}>Load more records</button>}
    </section>
  );
};
