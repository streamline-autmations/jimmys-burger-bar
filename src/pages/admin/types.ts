import type { Database } from '../../lib/database.types';

export type Booking = Database['public']['Tables']['bookings']['Row'];
export type Customer = Database['public']['Tables']['customers']['Row'];
export type Order = Database['public']['Tables']['orders']['Row'];
export type OrderItem = Database['public']['Tables']['order_items']['Row'];

export const BOOKING_STATUSES = ['pending', 'confirmed', 'cancelled'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const ORDER_STATUSES = [
  'new',
  'accepted',
  'preparing',
  'ready',
  'completed',
  'cancelled',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
