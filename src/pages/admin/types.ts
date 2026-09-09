// Staff-console types now live with the data layer, since they describe rows
// the adapter returns. Re-exported here so existing imports keep working.
export type {
  Booking, Customer, Order, OrderItem, OrderWithItems,
  BookingStatus, OrderStatus,
} from '../../core/data';
export { BOOKING_STATUSES, ORDER_STATUSES } from '../../core/data';
