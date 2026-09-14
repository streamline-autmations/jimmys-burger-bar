import type { Database } from '../../lib/database.types';

export type Booking = Database['public']['Tables']['bookings']['Row'];
export type Customer = Database['public']['Tables']['customers']['Row'];
export type Order = Database['public']['Tables']['orders']['Row'];
export type OrderItem = Database['public']['Tables']['order_items']['Row'];
export type OrderWithItems = Order & { order_items: OrderItem[] };

export const BOOKING_STATUSES = ['pending', 'confirmed', 'cancelled'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const ORDER_STATUSES = [
  'new', 'accepted', 'preparing', 'ready', 'completed', 'cancelled',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Which slice of records a staff list is showing. */
export type ListView = 'active' | 'today' | 'history' | 'all';

export interface ListOptions {
  view: ListView;
  limit: number;
}

export interface NewOrder {
  orderNo: string;
  customerName: string;
  email: string;
  phone: string;
  orderType: 'collection' | 'delivery' | 'table';
  tableNumber: string | null;
  deliveryAddress: string | null;
  deliveryNotes: string | null;
  requestedTime: string;
  /** Decimal amount, as the orders table stores it - not minor units. */
  total: number;
  marketingConsent: boolean;
  items: { name: string; qty: number; unit_price: number }[];
}

export interface NewBooking {
  id: string;
  name: string;
  email: string;
  phone: string;
  guests: number;
  bookingDate: string;
  bookingTime: string;
  seatingPreference: string;
  notes: string | null;
  marketingConsent: boolean;
}

/** What a customer can see about their own request, looked up by reference. */
export type LookupResult =
  | {
      kind: 'order';
      reference: string;
      status: OrderStatus;
      order_type: 'collection' | 'delivery' | 'table';
      requested_time: string | null;
      total: number;
      created_at: string;
      updated_at: string;
      items: { name: string; qty: number }[];
    }
  | {
      kind: 'booking';
      reference: string;
      status: BookingStatus;
      guests: number;
      booking_date: string;
      booking_time: string;
      seating_preference: string;
      created_at: string;
      updated_at: string;
    };

export interface CustomerHistory {
  customer: Customer;
  orders: OrderWithItems[];
  bookings: Booking[];
}

export interface DashboardSnapshot {
  todayBookingsCount: number;
  todayOrdersCount: number;
  pendingBookingsCount: number;
  newOrdersCount: number;
  todayBookings: Booking[];
  newOrders: Order[];
}

/**
 * Every read and write the product performs, in one place.
 *
 * Two reasons this exists. It is the only seam a demo build has to replace, so
 * a sales walkthrough needs no route interception and can never reach a real
 * database. And it is the one place to put timeouts and retries, which
 * previously existed nowhere - a hung request left the order button saying
 * "Placing order…" forever with no way out.
 */
export interface DataAdapter {
  /**
   * Safe to repeat with the same `orderNo`: a retry after a lost response
   * resolves with the order that already landed rather than creating another.
   * Failures reject with a SubmissionError saying whether anything was saved.
   */
  createOrder(order: NewOrder): Promise<{ id: string; order_no: string; created_at: string }>;
  /** Same retry contract as createOrder, keyed on the client-generated `id`. */
  createBooking(booking: NewBooking): Promise<void>;

  listOrders(options: ListOptions): Promise<OrderWithItems[]>;
  listBookings(options: ListOptions): Promise<Booking[]>;
  listCustomers(options: { limit: number }): Promise<Customer[]>;
  /** One guest and everything they have booked or ordered. Null if the customer does not exist. */
  loadCustomerHistory(customerId: string): Promise<CustomerHistory | null>;

  /**
   * Customer-side status check. Needs the reference and the email or phone
   * used on the request; resolves null for any mismatch.
   */
  lookupRequest(reference: string, contact: string): Promise<LookupResult | null>;
  loadDashboard(): Promise<DashboardSnapshot>;

  /**
   * Compare-and-set. Resolves only when exactly one row moved from `from` to
   * `to`; anything else means another staff member got there first.
   */
  advanceOrderStatus(id: string, from: string, to: OrderStatus): Promise<void>;
  advanceBookingStatus(id: string, from: string, to: BookingStatus): Promise<void>;
}
