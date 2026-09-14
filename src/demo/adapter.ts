// The demo build's data adapter: the same contract as the Supabase adapter,
// backed by fictional records in the browser.
//
// It enforces the same rules the database does, so the demo cannot show
// behaviour the real product does not have: status changes follow the same
// order and fail the same way on a conflict, orders are priced from the menu,
// breakfast stops at its cut-off, and a retried send is not a second order.

import type {
  Booking, BookingStatus, CustomerHistory, DashboardSnapshot, DataAdapter, ListOptions,
  LookupResult, NewBooking, NewOrder, OrderStatus,
} from '../core/data/types';
import { ConflictError } from '../core/data/errors';
import { SubmissionError } from '../core/data/submission';
import { config } from './config';
import { copy, restaurantDate, restaurantDayBounds } from '../core/tenant';
import { orderableCategories, orderableItems } from '../core/menu/orderable';
import { nextStatuses } from '../pages/admin/operations';
import { readRecords, subscribeRecords, updateRecords } from './store';

/** Enough latency that loading states are seen, not so much that a demo drags. */
let latencyMs = 280;
export const setDemoLatency = (ms: number): void => { latencyMs = ms; };
const settle = (extra = 0) => new Promise<void>((resolve) => setTimeout(resolve, latencyMs + extra));

const menu = new Map(
  orderableItems(orderableCategories(config.menu.categories, {
    label: copy.order.softDrinksLabel,
    note: copy.order.softDrinksNote,
    items: config.ordering.nonAlcoholicDrinks,
  })).map((item) => [item.name, item]),
);

const localTime = new Intl.DateTimeFormat('en-GB', { timeZone: config.timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

const digits = (value: string | null) => (value ?? '').replace(/\D/g, '').slice(-9);
// A guest checking status types their real details; stored records hold the
// fictional version of them (see fictionalContact), so compare like with like.
const sameContact = (row: { email: string; phone: string }, contact: string) => {
  const typed = contact.trim();
  if (row.email.toLowerCase() === typed.toLowerCase()) return true;
  if (typed.includes('@')) return row.email.toLowerCase() === fictionalContact(typed, '').email;
  return digits(typed).length === 9 && (digits(row.phone) === digits(typed) || row.phone === fictionalContact('', typed).phone);
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const byCreated = (a: { created_at: string }, b: { created_at: string }) => a.created_at.localeCompare(b.created_at);

/**
 * Whatever a presenter or prospect types, the demo stores a fictional contact:
 * the mailbox name is kept so the record is recognisable, the domain becomes
 * example.com, and the phone becomes a number no line can have. So even a real
 * email typed into the demo never appears in its staff console.
 */
export function fictionalContact(email: string, phone: string): { email: string; phone: string } {
  const mailbox = (email.split('@')[0] || 'guest').toLowerCase().replace(/[^a-z0-9._-]/g, '') || 'guest';
  // From the last nine digits, so "082 ..." and "+27 82 ..." map to the same fictional number.
  const key = phone.replace(/\D/g, '').slice(-9);
  const tail = String([...key].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) % 100, 7)).padStart(2, '0');
  return { email: `${mailbox}@example.com`, phone: `+27 00 000 00${tail}` };
}

const sameOrderOrReject = (row: { id: string; order_no: string; created_at: string; email: string }, email: string) => {
  if (row.email.toLowerCase() !== email.toLowerCase()) throw new SubmissionError('rejected');
  return { id: row.id, order_no: row.order_no, created_at: row.created_at };
};

function upsertCustomer(records: ReturnType<typeof readRecords>, name: string, email: string, phone: string, at: string): string {
  const found = records.customers.find((row) => row.email?.toLowerCase() === email.toLowerCase())
    ?? records.customers.find((row) => digits(row.phone) && digits(row.phone) === digits(phone));
  if (found) {
    Object.assign(found, { name, last_interaction_at: at, interaction_count: found.interaction_count + 1 });
    return found.id;
  }
  const id = crypto.randomUUID();
  records.customers.push({ id, name, email, phone, created_at: at, last_interaction_at: at, interaction_count: 1, marketing_consent: false });
  return id;
}

/** Compare-and-set, checked inside the write so a stale tab cannot also succeed. */
function advance(table: 'orders' | 'bookings', id: string, from: string, to: string): void {
  let moved = false;
  updateRecords((next) => {
    const row = next[table].find((item) => item.id === id);
    if (!row || row.status !== from || !nextStatuses(from).includes(to)) return false;
    row.status = to;
    row.updated_at = new Date().toISOString();
    moved = true;
    return true;
  });
  if (!moved) throw new ConflictError();
}

export const adapter: DataAdapter = {
  async createOrder(order: NewOrder) {
    await settle(420);
    const contact = fictionalContact(order.email, order.phone);

    const existing = readRecords().orders.find((row) => row.order_no === order.orderNo);
    if (existing) return sameOrderOrReject(existing, contact.email);

    // The same rules as create_order, in the same order.
    if (new Date(order.requestedTime).getTime() < Date.now() - 10 * 60000) {
      throw new SubmissionError('rejected', false, undefined, 'time');
    }
    if (!order.items.length || order.items.length > 100) throw new SubmissionError('rejected');
    const requestedLocal = localTime.format(new Date(order.requestedTime));
    let total = 0;
    for (const line of order.items) {
      if (!Number.isInteger(line.qty) || line.qty < 1 || line.qty > 99) throw new SubmissionError('rejected');
      const item = menu.get(line.name);
      if (!item || item.price !== line.unit_price) throw new SubmissionError('rejected', false, undefined, 'menu');
      if (item.availableUntil && requestedLocal >= item.availableUntil) throw new SubmissionError('rejected', false, undefined, 'served');
      total = Math.round((total + line.qty * item.price) * 100) / 100;
    }
    // Exact, like the database: a total a fraction of a cent off is refused.
    if (order.total !== total) throw new SubmissionError('rejected');
    if (total <= 0 || total > 50000) throw new SubmissionError('rejected');

    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    let result: { id: string; order_no: string; created_at: string } = { id, order_no: order.orderNo, created_at: now };
    updateRecords((next) => {
      // Checked again against the freshest records: another tab may have
      // written the same reference since the read above.
      const raced = next.orders.find((row) => row.order_no === order.orderNo);
      if (raced) {
        result = sameOrderOrReject(raced, contact.email);
        return false;
      }
      const customerId = upsertCustomer(next, order.customerName, contact.email, contact.phone, now);
      next.orders.push({
        id,
        order_no: order.orderNo,
        customer_id: customerId,
        customer_name: order.customerName,
        email: contact.email,
        phone: contact.phone,
        order_type: order.orderType,
        table_number: order.tableNumber,
        delivery_address: order.deliveryAddress,
        delivery_notes: order.deliveryNotes,
        requested_time: order.requestedTime,
        total,
        status: 'new',
        marketing_consent: false,
        created_at: now,
        updated_at: now,
        order_items: order.items.map((line) => ({ id: crypto.randomUUID(), order_id: id, name: line.name, qty: line.qty, unit_price: line.unit_price })),
      });
      return true;
    });
    return result;
  },

  async createBooking(booking: NewBooking) {
    await settle(300);
    const contact = fictionalContact(booking.email, booking.phone);
    const now = new Date().toISOString();
    updateRecords((next) => {
      if (next.bookings.some((row) => row.id === booking.id)) return false;
      const customerId = upsertCustomer(next, booking.name, contact.email, contact.phone, now);
      next.bookings.push({
        id: booking.id,
        customer_id: customerId,
        name: booking.name,
        email: contact.email,
        phone: contact.phone,
        guests: booking.guests,
        booking_date: booking.bookingDate,
        booking_time: `${booking.bookingTime}:00`,
        seating_preference: booking.seatingPreference,
        notes: booking.notes,
        status: 'pending',
        marketing_consent: false,
        created_at: now,
        updated_at: now,
      });
      return true;
    });
  },

  async listOrders({ view, limit }: ListOptions) {
    await settle();
    let rows = readRecords().orders;
    if (view === 'active') rows = rows.filter((row) => !['completed', 'cancelled'].includes(row.status)).sort(byCreated);
    else if (view === 'history') rows = rows.filter((row) => ['completed', 'cancelled'].includes(row.status)).sort(byCreated).reverse();
    else if (view === 'today') {
      const { start, end } = restaurantDayBounds();
      rows = rows.filter((row) => row.requested_time && row.requested_time >= start && row.requested_time < end).sort(byCreated).reverse();
    } else rows = [...rows].sort(byCreated).reverse();
    return clone(rows.slice(0, limit));
  },

  async listBookings({ view, limit }: ListOptions) {
    await settle();
    const today = restaurantDate();
    const slot = (row: Booking) => `${row.booking_date} ${row.booking_time}`;
    let rows = readRecords().bookings;
    if (view === 'active') rows = rows.filter((row) => row.status !== 'cancelled' && row.booking_date >= today).sort((a, b) => slot(a).localeCompare(slot(b)));
    else if (view === 'today') rows = rows.filter((row) => row.booking_date === today).sort((a, b) => slot(a).localeCompare(slot(b)));
    else if (view === 'history') rows = rows.filter((row) => row.booking_date < today).sort((a, b) => slot(b).localeCompare(slot(a)));
    else rows = [...rows].sort(byCreated).reverse();
    return clone(rows.slice(0, limit));
  },

  async listCustomers({ limit }) {
    await settle();
    return clone([...readRecords().customers].sort(byCreated).reverse().slice(0, limit));
  },

  async loadCustomerHistory(customerId: string): Promise<CustomerHistory | null> {
    await settle();
    const records = readRecords();
    const customer = records.customers.find((row) => row.id === customerId);
    if (!customer) return null;
    return clone({
      customer,
      orders: records.orders.filter((row) => row.customer_id === customerId).sort(byCreated).reverse(),
      bookings: records.bookings.filter((row) => row.customer_id === customerId)
        .sort((a, b) => `${b.booking_date} ${b.booking_time}`.localeCompare(`${a.booking_date} ${a.booking_time}`)),
    });
  },

  async lookupRequest(reference: string, contact: string): Promise<LookupResult | null> {
    await settle();
    const records = readRecords();
    const ref = reference.trim().toUpperCase();
    const order = records.orders.find((row) => row.order_no.toUpperCase() === ref);
    if (order && sameContact(order, contact)) {
      return {
        kind: 'order', reference: order.order_no, status: order.status as OrderStatus,
        order_type: order.order_type as 'collection' | 'delivery' | 'table',
        requested_time: order.requested_time, total: order.total,
        created_at: order.created_at, updated_at: order.updated_at,
        items: order.order_items.map((item) => ({ name: item.name, qty: item.qty })),
      };
    }
    const booking = records.bookings.find((row) => row.id.toUpperCase() === ref);
    if (booking && sameContact(booking, contact)) {
      return {
        kind: 'booking', reference: booking.id, status: booking.status as BookingStatus,
        guests: booking.guests, booking_date: booking.booking_date, booking_time: booking.booking_time.slice(0, 5),
        seating_preference: booking.seating_preference, created_at: booking.created_at, updated_at: booking.updated_at,
      };
    }
    return null;
  },

  async loadDashboard(): Promise<DashboardSnapshot> {
    await settle();
    const { orders, bookings } = readRecords();
    const today = restaurantDate();
    const { start, end } = restaurantDayBounds(today);
    const todays = bookings.filter((row) => row.booking_date === today && row.status !== 'cancelled')
      .sort((a, b) => a.booking_time.localeCompare(b.booking_time));
    const fresh = orders.filter((row) => row.status === 'new').sort(byCreated);
    return clone({
      todayBookingsCount: todays.length,
      todayOrdersCount: orders.filter((row) => row.status !== 'cancelled' && row.requested_time && row.requested_time >= start && row.requested_time < end).length,
      pendingBookingsCount: bookings.filter((row) => row.booking_date >= today && row.status === 'pending').length,
      newOrdersCount: fresh.length,
      todayBookings: todays.slice(0, 8),
      newOrders: fresh.slice(0, 8),
    });
  },

  async advanceOrderStatus(id, from, to) {
    await settle();
    advance('orders', id, from, to);
  },

  async advanceBookingStatus(id, from, to) {
    await settle();
    advance('bookings', id, from, to);
  },

  subscribe: subscribeRecords,
};
