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
  createOrder(order: NewOrder): Promise<{ id: string; order_no: string; created_at: string }>;
  createBooking(booking: NewBooking): Promise<void>;

  listOrders(options: ListOptions): Promise<OrderWithItems[]>;
  listBookings(options: ListOptions): Promise<Booking[]>;
  listCustomers(options: { limit: number }): Promise<Customer[]>;
  loadDashboard(): Promise<DashboardSnapshot>;

  /**
   * Compare-and-set. Resolves only when exactly one row moved from `from` to
   * `to`; anything else means another staff member got there first.
   */
  advanceOrderStatus(id: string, from: string, to: OrderStatus): Promise<void>;
  advanceBookingStatus(id: string, from: string, to: BookingStatus): Promise<void>;
}
