import type { Database } from '../../lib/database.types';

export type Booking = Database['public']['Tables']['bookings']['Row'];
export type Customer = Database['public']['Tables']['customers']['Row'];
export type Order = Database['public']['Tables']['orders']['Row'];
export type OrderItem = Database['public']['Tables']['order_items']['Row'];
export type OrderWithItems = Order & { order_items: OrderItem[] };

export const BOOKING_STATUSES = ['pending', 'confirmed', 'cancelled'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const ORDER_STATUSES = [
  'new', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Which slice of records a staff list is showing. */
export type ListView = 'active' | 'today' | 'history' | 'all';

export interface ListOptions {
  view: ListView;
  limit: number;
  /** Newest first even for the open queue, so a capped list always holds the latest order (kitchen screen). */
  newestFirst?: boolean;
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
  /** Pay-first delivery only. The server prices the fee from it; the browser never sends a fee. */
  deliverySuburb?: string | null;
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
      payment_status?: string;
      paid_at?: string | null;
      /** When the kitchen said it would be ready. Set on accept. */
      eta?: string | null;
      /** Pay-first delivery: the fee inside `total`. */
      delivery_fee?: number;
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

/**
 * Order value, not takings: guests pay on collection, so this is what was
 * ordered (every status except cancelled), by requested time.
 */
export interface SalesSummary {
  todayTotal: number;
  todayCount: number;
  /** Today and the six restaurant days before it. */
  weekTotal: number;
  weekCount: number;
}

export interface DashboardSnapshot {
  todayBookingsCount: number;
  todayOrdersCount: number;
  pendingBookingsCount: number;
  newOrdersCount: number;
  todayBookings: Booking[];
  newOrders: Order[];
  sales: SalesSummary;
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
/** What staff can switch off mid-shift. Names are orderable menu item names. */
export interface OrderingState {
  paused: boolean;
  unavailable: string[];
}

/** A signed hosted-checkout form. Post every field, in order, to `action`. */
export interface PaymentHandoff {
  action: string;
  fields: Record<string, string>;
}

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
   * `to`. Rejects with ConflictError when another staff member got there first,
   * and with the underlying error when the write itself failed. `eta`, when
   * given, is written in the same update.
   */
  advanceOrderStatus(id: string, from: string, to: OrderStatus, eta?: string | null): Promise<void>;
  advanceBookingStatus(id: string, from: string, to: BookingStatus): Promise<void>;

  /**
   * Optional push notification that records changed. Staff lists refresh
   * immediately instead of waiting for their next poll. The demo store and a
   * Supabase Realtime channel implement it. `onLive` reports whether the push
   * connection is currently up; it is never called where there is no push.
   */
  subscribe?(listener: () => void, onLive?: (live: boolean) => void): () => void;

  /**
   * Lock-screen alerts (20261117140000, the kitchen-push function). Pay-first
   * Supabase tenants only; the demo leaves them out, so it never offers them.
   * The public key comes from the function, so it cannot drift from its secret.
   */
  pushPublicKey?(): Promise<string>;
  /** Saves this browser's subscription for the signed-in staff member. Idempotent. */
  savePushSubscription?(subscription: { endpoint: string; p256dh: string; auth: string }): Promise<void>;
  deletePushSubscription?(endpoint: string): Promise<void>;
  /**
   * Guest order-ready alerts (20261119120000). The order reference plus the
   * email it was placed with prove ownership; resolves false when they do not
   * match, or the order is unpaid or already finished. Nothing can be read back.
   * `subscription` is null only in the demo, which simulates the alert on screen.
   */
  addGuestPush?(reference: string, email: string, subscription: { endpoint: string; p256dh: string; auth: string } | null): Promise<boolean>;
  removeGuestPush?(reference: string, email: string, endpoint: string): Promise<void>;
  /** The demo: alerts appear on screen, and the browser is never asked for permission. */
  pushSimulated?: boolean;
  /** Who stores orders and bookings, as the privacy page names them. Unset in the demo, which keeps them in the browser. */
  storedWith?: string;

  // Pay-first tenants only (ordering.payment = 'payfast'). Absent elsewhere, so
  // a tenant without the payments migration never calls a function it lacks.
  /**
   * Signed checkout fields for an order that is saved and still unpaid. The
   * amount comes from the server. Rejects with an Error whose message is the
   * server's code, e.g. ORDERING_PAUSED or PAYMENT_NOT_PENDING.
   */
  beginPayment?(reference: string, email: string): Promise<PaymentHandoff>;
  orderingState?(): Promise<OrderingState>;
  setOrderingPaused?(paused: boolean): Promise<void>;
  setItemAvailable?(name: string, available: boolean): Promise<void>;
  /** Delivery preview, managers only: a paid delivery that could not be handed over goes to refund pending. */
  markDeliveryFailed?(id: string): Promise<void>;
  /** The signed-in staff member's role, e.g. 'manager'. */
  staffRole?(): Promise<string | null>;
}
