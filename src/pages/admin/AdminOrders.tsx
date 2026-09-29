import { useAdminResource } from './useAdminResource';
import { AdminRefresh } from './AdminRefresh';
import { matchesSearch, nextStatuses } from './operations';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bike, History, Mail, MapPin, Phone, ShoppingBag, UtensilsCrossed } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { formatCartMoney } from '../../lib/cartStore';
import { toMinor } from '../../core/domain/money';
import { data as db, type ListView } from '../../core/data';
import { useIsDesktop } from '../../lib/useDesktop';
import { formatDayTime, isActionable, isClosed, titleCase } from './adminUtils';
import { AdminEmpty, AdminError, AdminSkeleton } from './AdminStates';
import { AdminPageHeader } from './AdminPageHeader';
import { AdminStatusBadge } from './AdminStatusBadge';
import { Fact, ProgressRail, QueueFilter, QueueRow, QueueToolbar, TicketActions, TicketPlaceholder, WorkspaceSplit, type SavedChange } from './AdminWorkspace';
import { dishPhoto } from './dishPhotos';
import { ORDER_STATUSES, type Order, type OrderItem, type OrderStatus } from './types';

type OrderWithItems = Order & { order_items: OrderItem[] };
type OrderFilter = 'all' | OrderStatus;

const money = (amount: number) => formatCartMoney(toMinor(amount));

const typeIcon = (type: string) =>
  type === 'delivery' ? Bike : type === 'table' ? UtensilsCrossed : ShoppingBag;

const methodLabel = (order: Order) =>
  order.order_type === 'table' && order.table_number ? `Table ${order.table_number}` : titleCase(order.order_type);

/** Names the requested time for what it is, so nobody reads a table order's time as a collection slot. */
const timeLabel = (type: string) =>
  type === 'collection' ? 'Requested collection' : type === 'delivery' ? 'Requested delivery' : 'Requested time';

const PROGRESS = ['new', 'accepted', 'preparing', 'ready', 'completed'] as const;

// One sentence on what the next step means. "Accepted" in particular must not
// read as paid or ready: nothing in the product takes payment.
const HINTS: Record<string, string> = {
  new: 'Accepting tells the guest the kitchen has taken it on. It does not mark it ready. Guests can follow each step on the tracking page.',
  accepted: 'Start preparing when the kitchen begins on it.',
  preparing: 'Mark ready once it is packed or plated.',
  ready: 'Complete the order once the guest has it.',
};

const VIEWS = [
  { value: 'active', label: 'Open orders' },
  { value: 'today', label: 'Due today' },
  { value: 'history', label: 'History' },
  { value: 'all', label: 'All dates' },
];

const itemSummary = (items: OrderItem[]) => items.map((item) => `${item.qty}× ${item.name}`).join(', ');

// No photo: a quiet tile keeps the names aligned. A dish never borrows another's photo.
const Thumb: React.FC<{ name: string }> = ({ name }) => {
  const src = dishPhoto(name);
  return (
    <span className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg ${src ? 'bg-ink/[0.05] ring-1 ring-ink/10' : 'bg-paper'}`}>
      {src ? (
        <img src={src} alt="" width={96} height={96} loading="lazy" decoding="async" className="h-full w-full object-cover" />
      ) : (
        <UtensilsCrossed size={16} aria-hidden="true" className="text-ink/25" />
      )}
    </span>
  );
};

const OrderTicket: React.FC<{ order: OrderWithItems; actions: React.ReactNode; docked: boolean }> = ({ order, actions, docked }) => {
  const Icon = typeIcon(order.order_type);
  const requested = formatDayTime(order.requested_time);
  const placed = formatDayTime(order.created_at);
  const count = order.order_items.reduce((sum, item) => sum + item.qty, 0);

  return (
    <article
      aria-label={`Order from ${order.customer_name}`}
      className={`admin-ticket-in flex flex-col overflow-hidden rounded-2xl bg-surface ring-1 ring-ink/10 shadow-[0_18px_44px_-26px_rgb(var(--color-ink)/0.5)] ${
        docked ? 'max-h-[calc(100dvh-3.5rem-var(--admin-bottom-inset,0px))]' : ''
      }`}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <header className="px-5 pb-4 pt-5 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <AdminStatusBadge status={order.status} size="md" />
            <p className="truncate text-xs text-ink/60">
              Ref <span className="font-semibold text-ink/75">{order.order_no}</span>
            </p>
          </div>
          <h2 className="mt-3 break-words font-display text-[1.9rem] font-bold leading-[1.1] text-primary">{order.customer_name}</h2>
          <p className="mt-1 text-sm text-ink/65">Placed {placed.day === 'Today' || placed.day === 'Yesterday' ? placed.day.toLowerCase() : `on ${placed.day}`} at {placed.time}</p>
        </header>

        <dl className="grid grid-cols-3 gap-4 border-y border-ink/10 bg-paper px-5 py-4 sm:px-6">
          <Fact label="Order type">
            <span className="inline-flex items-center gap-1.5">
              <Icon size={17} aria-hidden="true" className="shrink-0 text-primary" />
              {methodLabel(order)}
            </span>
          </Fact>
          <Fact label={timeLabel(order.order_type)}>
            {requested.time}
            <span className="ml-1.5 font-body text-sm font-semibold text-ink/65">{requested.day}</span>
          </Fact>
          <Fact label="Total">{money(order.total)}</Fact>
        </dl>

        {order.status === 'cancelled' ? (
          <p className="mx-5 mt-5 rounded-xl bg-ink/[0.05] px-4 py-3 text-sm font-semibold text-ink/75 sm:mx-6">
            This order was cancelled. It stays here for the record.
          </p>
        ) : (
          <div className="px-4 pt-5 sm:px-5">
            <ProgressRail steps={PROGRESS} current={order.status} />
          </div>
        )}

        {order.order_type === 'delivery' && (order.delivery_address || order.delivery_notes) && (
          <section className="mx-5 mt-5 rounded-xl bg-paper px-4 py-3 ring-1 ring-ink/10 sm:mx-6">
            <h3 className="flex items-center gap-1.5 text-xs font-bold text-ink/65">
              <MapPin size={14} aria-hidden="true" />
              Deliver to
            </h3>
            {order.delivery_address && <p className="mt-1 font-semibold leading-snug text-ink">{order.delivery_address}</p>}
            {order.delivery_notes && <p className="mt-1.5 text-sm leading-relaxed text-ink/75">Guest note: {order.delivery_notes}</p>}
          </section>
        )}

        <section className="px-5 pt-5 sm:px-6" aria-label="Items">
          <h3 className="text-sm font-bold text-ink/70">
            {count} {count === 1 ? 'item' : 'items'}
          </h3>
          {order.order_items.length === 0 ? (
            <p className="py-3 text-sm text-ink/65">No items found on this order.</p>
          ) : (
            <ul className="mt-1 divide-y divide-ink/10">
              {order.order_items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-2.5">
                  <Thumb name={item.name} />
                  <span className="w-9 shrink-0 font-display text-lg font-bold text-primary tabular-nums">{item.qty}×</span>
                  <span className="min-w-0 flex-1 font-semibold leading-snug text-ink">{item.name}</span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-ink/75">{money(item.qty * item.unit_price)}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-1 flex items-baseline justify-between border-t-2 border-ink/80 pt-3">
            <span className="font-bold text-ink">Total</span>
            <span className="font-display text-xl font-bold text-primary tabular-nums">{money(order.total)}</span>
          </div>
        </section>

        <section className="px-5 pb-5 pt-5 sm:px-6" aria-label="Guest contact">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <a href={`tel:${order.phone}`} className="inline-flex min-h-10 items-center gap-1.5 rounded font-semibold text-ink hover:text-primary hover:underline">
              <Phone size={15} aria-hidden="true" className="text-ink/60" />
              {order.phone}
            </a>
            <a href={`mailto:${order.email}`} className="inline-flex min-h-10 min-w-0 items-center gap-1.5 rounded font-semibold text-ink hover:text-primary hover:underline">
              <Mail size={15} aria-hidden="true" className="shrink-0 text-ink/60" />
              <span className="truncate">{order.email}</span>
            </a>
            {order.customer_id && (
              <Link to={`/admin/customers/${order.customer_id}`} className="inline-flex min-h-10 items-center gap-1.5 rounded font-bold text-primary hover:underline">
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

export const AdminOrders: React.FC = () => {
  const desktop = useIsDesktop();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('order');
  const [status, setStatus] = useState<OrderFilter>('all');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<ListView>('active');
  const [limit, setLimit] = useState(200);

  const mutation = useRef(false);
  const [saving, setSaving] = useState<{ id: string; to: string } | null>(null);
  const [saved, setSaved] = useState<SavedChange | null>(null);
  const [updateErrors, setUpdateErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => db.listOrders({ view, limit }), [view, limit]);
  const { data: orders, setData: setOrders, loading, error, updatedAt, refresh: fetchOrders } =
    useAdminResource<OrderWithItems[]>(load, [], { paused: saving !== null });

  // The open queue reads in kitchen order: soonest requested time first.
  // History views keep the adapter's newest-first order.
  const sorted = useMemo(() => {
    if (view !== 'active' && view !== 'today') return orders;
    const at = (order: Order) => order.requested_time ?? order.created_at;
    return [...orders].sort((a, b) => at(a).localeCompare(at(b)) || a.created_at.localeCompare(b.created_at));
  }, [orders, view]);

  const counts = useMemo(() => {
    const result: Record<string, number> = { all: orders.length };
    for (const order of orders) result[order.status] = (result[order.status] ?? 0) + 1;
    return result;
  }, [orders]);

  const filtered = sorted.filter(
    (item) => (status === 'all' || item.status === status) && matchesSearch(search, item.order_no, item.customer_name, item.phone, item.email),
  );

  // The ticket reads from every loaded order, not the filtered list, so
  // accepting an order under the "New" filter keeps it on screen.
  const selected = orders.find((order) => order.id === selectedId) ?? null;

  const select = useCallback((id: string | null) => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (id) next.set('order', id);
      else next.delete('order');
      return next;
    }, { replace: true });
  }, [setParams]);

  // Desktop always has a ticket open: the first order waiting for a decision,
  // otherwise the first in the queue. Phones open one only when tapped.
  useEffect(() => {
    if (!desktop || !updatedAt || selected || filtered.length === 0) return;
    select((filtered.find((order) => order.status === 'new') ?? filtered[0]).id);
  }, [desktop, updatedAt, selected, filtered, select]);

  const updateStatus = async (order: OrderWithItems, next: OrderStatus) => {
    if (mutation.current || !nextStatuses(order.status).includes(next)) return;
    mutation.current = true;
    setSaved(null);
    setSaving({ id: order.id, to: next });
    setUpdateErrors((current) => {
      const copy = { ...current };
      delete copy[order.id];
      return copy;
    });

    try {
      await db.advanceOrderStatus(order.id, order.status, next);
      setOrders((current) => current.map((item) => (item.id === order.id ? { ...item, status: next } : item)));
      setSaved({ id: order.id, status: next, at: new Date() });
      await fetchOrders();
    } catch {
      setUpdateErrors((current) => ({ ...current, [order.id]: 'Could not verify this change. Refresh before trying again; another staff member may have updated it.' }));
    } finally {
      mutation.current = false;
      setSaving(null);
    }
  };

  const ticketFor = (order: OrderWithItems, docked: boolean) => (
    <OrderTicket
      key={order.id}
      order={order}
      docked={docked}
      actions={
        <TicketActions
          status={order.status}
          cancelLabel="Cancel order"
          describedAs={`Order ${order.order_no} for ${order.customer_name}`}
          disabled={saving !== null || (loading && !updatedAt)}
          saving={saving?.id === order.id}
          savingTo={saving?.id === order.id ? saving.to : null}
          error={updateErrors[order.id]}
          saved={saved?.id === order.id && saved.status === order.status ? saved : null}
          hint={HINTS[order.status]}
          onChange={(next) => void updateStatus(order, next as OrderStatus)}
        />
      }
    />
  );

  const waiting = counts.new ?? 0;
  const open = orders.filter((order) => isActionable(order.status)).length;
  const summary = !updatedAt
    ? undefined
    : view === 'active'
      ? waiting
        ? `${waiting} new ${waiting === 1 ? 'order' : 'orders'} to accept, ${open} open in total.`
        : `No new orders waiting. ${open} open in total.`
      : `${orders.length} ${orders.length === 1 ? 'order' : 'orders'} loaded.`;

  // Only statuses that are present, plus "New", so the open queue does not
  // list empty "Completed" and "Cancelled" buttons.
  const filterOptions = (['all', ...ORDER_STATUSES] as OrderFilter[]).filter(
    (option) => option === 'all' || option === 'new' || option === status || (counts[option] ?? 0) > 0,
  );

  const queue = loading && !updatedAt ? (
    <AdminSkeleton rows={5} />
  ) : error && !updatedAt ? null : filtered.length === 0 ? (
    <AdminEmpty
      title={view === 'active' && status === 'all' && !search ? 'No open orders' : 'No matching orders'}
      hint={view === 'active' && status === 'all' && !search ? 'New orders appear here as guests place them.' : 'Try another search, status or date view.'}
    />
  ) : (
    <ul className="space-y-2">
      {filtered.map((order) => {
        const requested = formatDayTime(order.requested_time);
        const Icon = typeIcon(order.order_type);
        const isSelected = order.id === selected?.id;
        return (
          <li key={order.id}>
            <QueueRow
              selected={isSelected}
              needsAction={order.status === 'new'}
              closed={isClosed(order.status)}
              expanded={desktop ? undefined : isSelected}
              label={`${order.customer_name}, ${titleCase(order.status)}, ${methodLabel(order)} ${requested.day} ${requested.time}, ${money(order.total)}`}
              onSelect={() => select(!desktop && isSelected ? null : order.id)}
            >
              <span className="w-14 shrink-0">
                <span className="block font-display text-xl font-bold leading-none text-primary tabular-nums">{requested.time}</span>
                <span className="mt-1 block text-xs font-semibold text-ink/60">{requested.day}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block truncate text-base font-bold ${isClosed(order.status) ? 'text-ink/70' : 'text-ink'}`}>{order.customer_name}</span>
                <span className="mt-0.5 flex items-center gap-1.5 text-sm text-ink/65">
                  <Icon size={14} aria-hidden="true" className="shrink-0" />
                  <span className="shrink-0 font-semibold">{methodLabel(order)}</span>
                  <span className="truncate">{itemSummary(order.order_items)}</span>
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1.5">
                <AdminStatusBadge status={order.status} />
                <span className="font-display text-base font-bold text-primary tabular-nums">{money(order.total)}</span>
              </span>
            </QueueRow>
            {!desktop && isSelected && <div className="mt-2">{ticketFor(order, false)}</div>}
          </li>
        );
      })}
    </ul>
  );

  const ticket = selected ? ticketFor(selected, true) : loading && !updatedAt ? (
    <TicketPlaceholder title="Loading orders…" />
  ) : !updatedAt ? (
    <TicketPlaceholder title="Orders could not load" hint="Use Try again once the connection is back." />
  ) : filtered.length === 0 ? (
    <TicketPlaceholder title="Nothing to review" hint="When a guest places an order, it opens here." />
  ) : (
    <TicketPlaceholder title="No order selected" hint="Choose one from the list to see the details and next step." />
  );

  return (
    <section>
      <WorkspaceSplit
        queue={
          <>
            <AdminPageHeader title="Orders" count={summary}>
              <AdminRefresh compact className="" disabled={saving !== null} loading={loading} updatedAt={updatedAt} onRefresh={() => void fetchOrders()} />
            </AdminPageHeader>

            <QueueToolbar
              filter={<QueueFilter<OrderFilter> label="Filter orders by status" options={filterOptions} value={status} counts={updatedAt ? counts : {}} onChange={setStatus} />}
              search={search}
              onSearch={setSearch}
              view={view}
              views={VIEWS}
              onView={(value) => { setView(value as ListView); setLimit(200); }}
              viewDisabled={saving !== null}
            />

            {error && (
              <div className="mb-5">
                <AdminError message={error} onRetry={() => void fetchOrders()} />
              </div>
            )}

            {queue}
            {updatedAt && orders.length > 0 && (
              <p className="mt-3 text-xs text-ink/60">
                {filtered.length} of {orders.length} loaded {orders.length === 1 ? 'order' : 'orders'} shown. Search covers loaded records only.
              </p>
            )}
            {orders.length >= limit && (
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
