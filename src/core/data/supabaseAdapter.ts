import { config } from '../../config';
import { supabase } from '../../lib/supabase';
import { restaurantDate, restaurantDayBounds } from '../tenant';
import { withTimeout } from './timeout';
import { classifySubmission } from './submission';
import { salesWindow, summariseSales } from './sales';
import type {
  Booking, Customer, CustomerHistory, DashboardSnapshot, DataAdapter, ListOptions,
  LookupResult, NewBooking, NewOrder, OrderingState, OrderWithItems,
} from './types';

import { ConflictError } from './errors';

// One private channel per page, shared by every staff list on it. realtime-js
// hands back the same channel object for a repeated topic, so each list cannot
// own its own. Only staff can join it (20261117130000); the payload is an order
// id that is never read, only taken as "re-read now".
type Subscriber = { listener: () => void; onLive?: (live: boolean) => void };
const subscribers = new Set<Subscriber>();
let orderSignal: ReturnType<typeof supabase.channel> | null = null;
let signalLive = false;

function joinOrderSignal() {
  orderSignal = supabase.channel('staff:orders', { config: { private: true } })
    .on('broadcast', { event: 'changed' }, () => subscribers.forEach((s) => s.listener()))
    // SUBSCRIBED fires again after every automatic rejoin, so a reconnect re-reads too.
    .subscribe((status) => {
      signalLive = status === 'SUBSCRIBED';
      subscribers.forEach((s) => {
        s.onLive?.(signalLive);
        if (signalLive) s.listener();
      });
    });
}

export const supabaseAdapter: DataAdapter = {
  subscribe(listener, onLive) {
    // Only pay-first projects have the order signal; elsewhere the console keeps
    // polling and says so.
    if (config.ordering.payment !== 'payfast') return () => {};
    const subscriber = { listener, onLive };
    subscribers.add(subscriber);
    if (orderSignal) onLive?.(signalLive);
    else joinOrderSignal();
    return () => {
      subscribers.delete(subscriber);
      if (subscribers.size === 0 && orderSignal) {
        void supabase.removeChannel(orderSignal);
        orderSignal = null;
        signalLive = false;
      }
    };
  },
  async beginPayment(reference, email) {
    // Plain fetch: the function checks the Origin itself and takes no Supabase JWT.
    const response = await withTimeout(fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payfast/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurant: config.slug, reference, contact: email }),
    }));
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.fields) throw new Error(typeof body.error === 'string' ? body.error : 'TEMPORARY_FAILURE');
    return { action: body.action, fields: body.fields };
  },
  async pushPublicKey() {
    const response = await withTimeout(fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/kitchen-push`));
    const body = await response.json().catch(() => ({}));
    if (!response.ok || typeof body.publicKey !== 'string') throw new Error('PUSH_UNAVAILABLE');
    return body.publicKey;
  },
  async savePushSubscription(subscription) {
    const { error } = await withTimeout(Promise.resolve(supabase.from('staff_push_subscriptions').upsert(subscription)));
    if (error) throw error;
  },
  async deletePushSubscription(endpoint) {
    const { error } = await withTimeout(Promise.resolve(supabase.from('staff_push_subscriptions').delete().eq('endpoint', endpoint)));
    if (error) throw error;
  },
  async orderingState() {
    const { data, error } = await withTimeout(Promise.resolve(supabase.rpc('ordering_state')));
    if (error) throw error;
    return data as unknown as OrderingState;
  },
  async setOrderingPaused(paused) {
    const { error } = await withTimeout(Promise.resolve(supabase.rpc('set_ordering_paused', { p_paused: paused })));
    if (error) throw error;
  },
  async setItemAvailable(name, available) {
    const { error } = await withTimeout(Promise.resolve(supabase.rpc('set_menu_item_available', { p_name: name, p_available: available })));
    if (error) throw error;
  },
  async createOrder(order: NewOrder) {
    let result;
    try {
      result = await withTimeout(
        Promise.resolve(
          supabase.rpc('create_order', {
            p_order_no: order.orderNo,
            p_customer_name: order.customerName,
            p_email: order.email,
            p_phone: order.phone,
            p_order_type: order.orderType,
            p_table_number: order.tableNumber,
            p_delivery_address: order.deliveryAddress,
            p_delivery_notes: order.deliveryNotes,
            p_requested_time: order.requestedTime,
            p_total: order.total,
            p_marketing_consent: order.marketingConsent,
            p_items: order.items,
          }),
        ),
      );
    } catch (error) {
      result = { data: null, error };
    }

    const { data, error } = result;
    if (!error && data?.[0]) return data[0];

    // create_order answers a same-reference retry with the existing order, so
    // a collision on the reference only surfaces in a concurrent race. Either
    // way it proves the order is saved.
    const outcome = classifySubmission(error ?? new Error('create_order returned no row'), 'orders_order_no_key');
    if (outcome === 'saved') {
      return { id: '', order_no: order.orderNo, created_at: new Date().toISOString() };
    }
    throw outcome;
  },

  async createBooking(booking: NewBooking) {
    // No .select() here on purpose: the anon insert-only policy makes a
    // RETURNING clause trigger an implicit SELECT check, which fails. The id is
    // generated client-side instead and doubles as the customer's reference,
    // which also makes a retry safe: a second insert collides on the key.
    let error: unknown;
    try {
      ({ error } = await withTimeout(
        Promise.resolve(
          supabase.from('bookings').insert({
            id: booking.id,
            name: booking.name,
            email: booking.email,
            phone: booking.phone,
            guests: booking.guests,
            booking_date: booking.bookingDate,
            booking_time: booking.bookingTime,
            seating_preference: booking.seatingPreference,
            notes: booking.notes,
            marketing_consent: booking.marketingConsent,
          }),
        ),
      ));
    } catch (thrown) {
      error = thrown;
    }
    if (!error) return;

    const outcome = classifySubmission(error, 'bookings_pkey');
    if (outcome !== 'saved') throw outcome;
  },

  async listOrders({ view, limit, newestFirst = false }: ListOptions): Promise<OrderWithItems[]> {
    // Open work reads oldest-first so the queue is in service order; everything
    // else newest-first. The id is a deterministic tiebreak so the limit window
    // is stable between refreshes.
    let query = supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: view === 'active' && !newestFirst })
      .order('id')
      .limit(limit);

    if (config.ordering.payment === 'payfast' && view !== 'history') query = query.in('payment_status', ['paid', 'not_required']).neq('status', 'cancelled');
    if (view === 'active') query = query.not('status', 'in', '(completed,cancelled)');
    if (view === 'history') query = query.in('status', ['completed', 'cancelled']);
    if (view === 'today') {
      const { start, end } = restaurantDayBounds();
      query = query.gte('requested_time', start).lt('requested_time', end);
    }

    const { data, error } = await withTimeout(Promise.resolve(query));
    if (error) throw error;
    return (data ?? []) as OrderWithItems[];
  },

  async listBookings({ view, limit }: ListOptions): Promise<Booking[]> {
    // Upcoming service is ordered by when the table is actually booked, not by
    // when the request happened to arrive.
    let query = supabase.from('bookings').select('*').limit(limit);

    if (view === 'active') {
      query = query
        .neq('status', 'cancelled')
        .gte('booking_date', restaurantDate())
        .order('booking_date', { ascending: true })
        .order('booking_time', { ascending: true });
    } else if (view === 'today') {
      query = query
        .eq('booking_date', restaurantDate())
        .order('booking_time', { ascending: true });
    } else if (view === 'history') {
      query = query
        .lt('booking_date', restaurantDate())
        .order('booking_date', { ascending: false })
        .order('booking_time', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await withTimeout(Promise.resolve(query.order('id')));
    if (error) throw error;
    return data ?? [];
  },

  async listCustomers({ limit }: { limit: number }): Promise<Customer[]> {
    const { data, error } = await withTimeout(
      Promise.resolve(
        supabase.from('customers').select('*')
          .order('created_at', { ascending: false }).order('id').limit(limit),
      ),
    );
    if (error) throw error;
    return data ?? [];
  },

  async loadCustomerHistory(customerId: string): Promise<CustomerHistory | null> {
    const [customer, orders, bookings] = await withTimeout(Promise.all([
      supabase.from('customers').select('*').eq('id', customerId).maybeSingle(),
      supabase.from('orders').select('*, order_items(*)')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false }).order('id').limit(100),
      supabase.from('bookings').select('*')
        .eq('customer_id', customerId)
        .order('booking_date', { ascending: false })
        .order('booking_time', { ascending: false }).order('id').limit(100),
    ]));

    const firstError = [customer.error, orders.error, bookings.error].find(Boolean);
    if (firstError) throw firstError;
    if (!customer.data) return null;

    return {
      customer: customer.data,
      orders: (orders.data ?? []) as OrderWithItems[],
      bookings: bookings.data ?? [],
    };
  },

  async lookupRequest(reference: string, contact: string): Promise<LookupResult | null> {
    const { data, error } = await withTimeout(
      Promise.resolve(
        supabase.rpc('lookup_request', { p_reference: reference.trim(), p_contact: contact.trim() }),
      ),
    );
    if (error) throw error;
    return (data as LookupResult | null) ?? null;
  },

  async loadDashboard(): Promise<DashboardSnapshot> {
    const today = restaurantDate();
    const { start, end } = restaurantDayBounds(today);

    const range = salesWindow();

    const payable = <T,>(query: T): T =>
      config.ordering.payment === 'payfast' ? (query as T & { in: (column: string, values: string[]) => T }).in('payment_status', ['paid', 'not_required']) : query;

    const [
      todayBookingsCount, todayOrdersCount, pendingBookingsCount,
      newOrdersCount, todayBookings, newOrders, weekOrders,
    ] = await withTimeout(Promise.all([
      supabase.from('bookings').select('*', { count: 'exact', head: true })
        .eq('booking_date', today).neq('status', 'cancelled'),
      payable(supabase.from('orders').select('*', { count: 'exact', head: true }))
        .neq('status', 'cancelled').gte('requested_time', start).lt('requested_time', end),
      supabase.from('bookings').select('*', { count: 'exact', head: true })
        .gte('booking_date', today).eq('status', 'pending'),
      payable(supabase.from('orders').select('*', { count: 'exact', head: true })).eq('status', 'new'),
      supabase.from('bookings').select('*')
        .eq('booking_date', today).neq('status', 'cancelled')
        .order('booking_time', { ascending: true }).limit(8),
      payable(supabase.from('orders').select('*'))
        .eq('status', 'new').order('created_at', { ascending: true }).limit(8),
      // Two small columns for a week of orders. PostgREST caps a response at its
      // max-rows setting (1,000 by default), far above a week of collection orders.
      payable(supabase.from('orders').select('total, requested_time'))
        .neq('status', 'cancelled').gte('requested_time', range.weekStart).lt('requested_time', range.end),
    ]));

    const firstError = [
      todayBookingsCount.error, todayOrdersCount.error, pendingBookingsCount.error,
      newOrdersCount.error, todayBookings.error, newOrders.error, weekOrders.error,
    ].find(Boolean);
    if (firstError) throw firstError;

    return {
      todayBookingsCount: todayBookingsCount.count ?? 0,
      todayOrdersCount: todayOrdersCount.count ?? 0,
      pendingBookingsCount: pendingBookingsCount.count ?? 0,
      newOrdersCount: newOrdersCount.count ?? 0,
      todayBookings: todayBookings.data ?? [],
      newOrders: newOrders.data ?? [],
      sales: summariseSales(weekOrders.data ?? [], range),
    };
  },

  async advanceOrderStatus(id, from, to, eta) {
    // .eq('status', from) is the compare-and-set predicate; .select('id') forces
    // PostgREST to report affected rows so zero can be told from one. The ETA
    // rides in the same update, so the screen that wins also sets the time.
    const { data, error } = await withTimeout(
      Promise.resolve(
        supabase.from('orders').update(eta === undefined ? { status: to } : { status: to, eta })
          .eq('id', id).eq('status', from).select('id'),
      ),
    );
    // A refused or failed write is not "someone else got there first".
    if (error) throw error;
    if (data?.length !== 1) throw new ConflictError();
  },

  async advanceBookingStatus(id, from, to) {
    const { data, error } = await withTimeout(
      Promise.resolve(
        supabase.from('bookings').update({ status: to })
          .eq('id', id).eq('status', from).select('id'),
      ),
    );
    if (error || data?.length !== 1) throw new ConflictError();
  },
};
