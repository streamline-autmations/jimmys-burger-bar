import { supabase } from '../../lib/supabase';
import { restaurantDate, restaurantDayBounds } from '../tenant';
import { withTimeout } from './timeout';
import { classifySubmission } from './submission';
import type {
  Booking, Customer, CustomerHistory, DashboardSnapshot, DataAdapter, ListOptions,
  LookupResult, NewBooking, NewOrder, OrderWithItems,
} from './types';

import { ConflictError } from './errors';

export const supabaseAdapter: DataAdapter = {
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

  async listOrders({ view, limit }: ListOptions): Promise<OrderWithItems[]> {
    // Open work reads oldest-first so the queue is in service order; everything
    // else newest-first. The id is a deterministic tiebreak so the limit window
    // is stable between refreshes.
    let query = supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: view === 'active' })
      .order('id')
      .limit(limit);

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

    const [
      todayBookingsCount, todayOrdersCount, pendingBookingsCount,
      newOrdersCount, todayBookings, newOrders,
    ] = await withTimeout(Promise.all([
      supabase.from('bookings').select('*', { count: 'exact', head: true })
        .eq('booking_date', today).neq('status', 'cancelled'),
      supabase.from('orders').select('*', { count: 'exact', head: true })
        .neq('status', 'cancelled').gte('requested_time', start).lt('requested_time', end),
      supabase.from('bookings').select('*', { count: 'exact', head: true })
        .gte('booking_date', today).eq('status', 'pending'),
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'new'),
      supabase.from('bookings').select('*')
        .eq('booking_date', today).neq('status', 'cancelled')
        .order('booking_time', { ascending: true }).limit(8),
      supabase.from('orders').select('*')
        .eq('status', 'new').order('created_at', { ascending: true }).limit(8),
    ]));

    const firstError = [
      todayBookingsCount.error, todayOrdersCount.error, pendingBookingsCount.error,
      newOrdersCount.error, todayBookings.error, newOrders.error,
    ].find(Boolean);
    if (firstError) throw firstError;

    return {
      todayBookingsCount: todayBookingsCount.count ?? 0,
      todayOrdersCount: todayOrdersCount.count ?? 0,
      pendingBookingsCount: pendingBookingsCount.count ?? 0,
      newOrdersCount: newOrdersCount.count ?? 0,
      todayBookings: todayBookings.data ?? [],
      newOrders: newOrders.data ?? [],
    };
  },

  async advanceOrderStatus(id, from, to) {
    // .eq('status', from) is the compare-and-set predicate; .select('id') forces
    // PostgREST to report affected rows so zero can be told from one.
    const { data, error } = await withTimeout(
      Promise.resolve(
        supabase.from('orders').update({ status: to })
          .eq('id', id).eq('status', from).select('id'),
      ),
    );
    if (error || data?.length !== 1) throw new ConflictError();
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
