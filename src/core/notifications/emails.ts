import { createMoneyFormatter, toMinor } from '../domain/money';
import { dayOfWeek } from '../domain/hours';
import { describeLine, storedLineTotal, type StoredExtra } from '../menu/extras';
import { httpsUrl, renderEmailLayout, type EmailBrand, type EmailCopy, type EmailRow } from './emailLayout';

/** Saved snapshots. Amounts are decimal rand as posted by the database. */
export interface OrderEmailData {
  order_no: string;
  customer_name: string;
  email: string;
  phone: string;
  order_type: 'collection' | 'delivery' | 'table';
  table_number?: string | null;
  delivery_address?: string | null;
  delivery_notes?: string | null;
  requested_time: string | null;
  total: number;
  items: { name: string; qty: number; unit_price: number; extras?: StoredExtra[] }[];
  /** Optional enrichment from the saved order. Neither field is on today's webhook. */
  paid_at?: string | null;
  delivery_fee?: number;
}

export interface BookingEmailData {
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  guests: number;
  seating?: string;
  notes?: string;
}

export type EmailEvent =
  | { kind: 'order.received'; audience: 'guest' | 'staff'; order: OrderEmailData }
  | { kind: 'order.accepted'; order_no: string; eta: string | null }
  | { kind: 'order.preparing' | 'order.out_for_delivery' | 'order.completed'; order_no: string }
  | { kind: 'order.ready'; order_no: string; order_type: OrderEmailData['order_type'] }
  | { kind: 'order.cancelled'; order_no: string; paid_at: string | null; previouslyAccepted: boolean; reason?: string }
  | { kind: 'refund.pending' | 'refund.recorded'; order_no: string; amount: number }
  | { kind: 'booking.requested'; audience: 'guest' | 'staff'; booking: BookingEmailData }
  | { kind: 'booking.confirmed' | 'booking.cancelled'; booking: BookingEmailData }
  | { kind: 'review.requested'; eligible: boolean; optOutUrl: string };

export function renderNotificationEmail(brand: EmailBrand, siteUrl: string, event: EmailEvent) {
  const origin = httpsUrl(siteUrl).origin;
  const { venue } = brand;
  const format = createMoneyFormatter(brand.currency);
  const money = (amount: number) => {
    if (!Number.isFinite(amount) || amount < 0) throw new Error('A stored amount is required');
    return format(toMinor(amount));
  };
  const localTime = (iso: string) => {
    if (!/(Z|[+-]\d\d:\d\d)$/i.test(iso)) throw new Error('A timestamp with a UTC offset is required');
    return new Intl.DateTimeFormat(brand.locale, {
      timeZone: brand.timezone, day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).format(new Date(iso));
  };
  const track = (reference: string) => ({
    label: 'Track your order', url: origin + '/track?ref=' + encodeURIComponent(reference),
  });
  const output = (copy: EmailCopy) => renderEmailLayout(brand, origin, copy);

  switch (event.kind) {
    case 'order.received': {
      const { order } = event;
      const staff = event.audience === 'staff';
      const paid = Boolean(order.paid_at && localTime(order.paid_at));
      const heading = staff ? 'New order request' : paid ? 'Payment received' : 'Order request received';
      const method = { collection: 'Collection', delivery: 'Delivery', table: 'Table service' }[order.order_type];
      const details: EmailRow[] = [['Order type', method]];
      if (order.order_type === 'collection') details.push(['Collect from', venue.address]);
      if (order.order_type === 'delivery' && order.delivery_address) details.push(['Deliver to', order.delivery_address]);
      if (order.order_type === 'delivery' && order.delivery_notes) details.push(['Delivery notes', order.delivery_notes]);
      if (order.order_type === 'table' && order.table_number) details.push(['Table', order.table_number]);
      if (order.requested_time) details.push(['Requested time', localTime(order.requested_time) + ' (' + venue.timeLabel + ')']);
      if (staff) {
        details.push(['Guest', order.customer_name], ['Guest phone', order.phone], ['Guest email', order.email]);
        if (paid) details.push(['Payment', 'Received']);
      }
      const items: EmailRow[] = order.items.map(item => {
        if (!Number.isInteger(item.qty) || item.qty < 1 || !Number.isFinite(item.unit_price) || item.unit_price < 0 ||
          item.extras?.some(extra => !Number.isFinite(extra.price) || extra.price < 0)) throw new Error('Invalid order line');
        return [describeLine(item), money(storedLineTotal(item))];
      });
      if (order.order_type === 'delivery' && order.delivery_fee != null) items.push(['Delivery fee', money(order.delivery_fee)]);
      return output({
        subject: `${venue.name} ${staff ? 'new order' : paid ? 'payment received' : 'order request'} · ${order.order_no}`,
        reference: 'Order ' + order.order_no, heading,
        message: staff ? 'Check the items and requested details before accepting this order.'
          : paid ? `We’ve received your payment. The kitchen still needs to accept your order. You can check its progress below.`
            : `Thanks for your order. The kitchen will confirm whether it can take your request. You can check its progress below.`,
        details, items, total: money(order.total),
        action: staff ? { label: 'Open staff orders', url: origin + '/admin/orders' } : track(order.order_no),
      });
    }
    case 'order.accepted':
      return output({
        subject: `${venue.name} accepted your order · ${event.order_no}`, reference: 'Order ' + event.order_no, heading: 'Order accepted',
        message: event.eta ? 'The kitchen has accepted your order and given an estimated ready time.' : 'The kitchen has accepted your order.',
        details: event.eta ? [['Estimated ready time', localTime(event.eta) + ' (' + venue.timeLabel + ')']] : [],
        action: track(event.order_no),
      });
    case 'order.preparing':
    case 'order.ready':
    case 'order.out_for_delivery':
    case 'order.completed': {
      let heading: string;
      let message: string;
      switch (event.kind) {
        case 'order.preparing':
          heading = 'Your order is cooking';
          message = 'The kitchen has started preparing your order.';
          break;
        case 'order.ready':
          if (event.order_type === 'collection') {
            heading = 'Ready to collect';
            message = `Your order is ready. Come to ${venue.address} and give the team your order reference.`;
          } else if (event.order_type === 'delivery') {
            heading = 'Ready for dispatch';
            message = 'The kitchen has finished your order. We’ll let you know when it leaves for delivery.';
          } else if (event.order_type === 'table') {
            heading = 'Your table order is ready';
            message = 'The kitchen has finished preparing your table order.';
          } else {
            throw new Error('A valid order type is required for a ready email');
          }
          break;
        case 'order.out_for_delivery':
          heading = 'Out for delivery';
          message = 'Your order has left the restaurant and is on its way to you.';
          break;
        case 'order.completed':
          heading = 'Order complete';
          message = `The team has marked your order as complete. Thanks for ordering from ${venue.name}.`;
          break;
      }
      return output({ subject: `${venue.name} · ${heading} · ${event.order_no}`,
        reference: 'Order ' + event.order_no, heading, message, action: track(event.order_no) });
    }
    case 'order.cancelled': {
      if (!event.paid_at && !event.previouslyAccepted) throw new Error('Cancellation email requires an accepted or paid order');
      if (event.paid_at) localTime(event.paid_at);
      return output({
        subject: `${venue.name} order cancelled · ${event.order_no}`, reference: 'Order ' + event.order_no, heading: 'Order cancelled',
        message: event.paid_at ? 'Your order has been cancelled. We received your payment. Contact us below for an update about your refund.'
          : 'Your order has been cancelled. We have no online payment recorded for this order. Please call if you have a question.',
        details: event.reason ? [['Reason', event.reason]] : [], action: track(event.order_no),
      });
    }
    case 'refund.pending':
    case 'refund.recorded': {
      if (!(event.amount > 0)) throw new Error('A positive refund event amount is required');
      const pending = event.kind === 'refund.pending';
      const heading = pending ? 'Refund pending' : 'Refund recorded';
      // PLACEHOLDER: Jimmy's to approve the wording before staging sends. No bank timing estimate.
      return output({
        subject: `${venue.name} · ${heading} · ${event.order_no}`, reference: 'Order ' + event.order_no, heading,
        message: pending ? 'Your refund is awaiting confirmation. You can contact us below about this amount.'
          : 'We’ve recorded a confirmed refund against your order. Please quote your order reference if you contact us.',
        details: [[pending ? 'Pending amount' : 'Refund amount', money(event.amount)]], action: track(event.order_no),
      });
    }
    case 'booking.requested':
    case 'booking.confirmed':
    case 'booking.cancelled': {
      const { booking } = event;
      if (dayOfWeek(booking.date) === null || !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(booking.time)) throw new Error('Invalid local booking date or time');
      const date = new Intl.DateTimeFormat(brand.locale, { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
        .format(new Date(booking.date + 'T12:00:00Z'));
      const staff = event.kind === 'booking.requested' && event.audience === 'staff';
      const heading = event.kind === 'booking.confirmed' ? 'Your table is confirmed' : event.kind === 'booking.cancelled' ? 'Booking cancelled'
        : staff ? 'New table request' : 'Table request received';
      const details: EmailRow[] = [['Date', date], ['Time', booking.time.slice(0, 5) + ' (' + venue.timeLabel + ')'], ['Guests', String(booking.guests)]];
      if (booking.seating) details.push(['Seating preference', booking.seating]);
      if (booking.notes) details.push(['Booking notes', booking.notes]);
      if (staff) details.push(['Guest', booking.name], ['Guest phone', booking.phone], ['Guest email', booking.email]);
      return output({
        subject: `${venue.name} · ${heading} · ${date}`, reference: 'Table booking', heading,
        message: event.kind === 'booking.confirmed' ? `We’ll see you at ${venue.address}. Please call us if your plans change.`
          : event.kind === 'booking.cancelled' ? 'Your table booking has been cancelled. Please call us if you have a question.'
            : staff ? 'A guest has requested a table. Review the details and confirm availability.'
              : 'We’ve received your request. Your table is still awaiting confirmation from the team.',
        details, action: staff ? { label: 'Open staff bookings', url: origin + '/admin/bookings' } : undefined,
      });
    }
    case 'review.requested':
      if (event.eligible !== true || !event.optOutUrl) throw new Error('Review eligibility and an opt-out URL are required');
      return output({
        subject: `How was your visit to ${venue.name}?`, reference: 'Guest feedback', heading: 'How was your visit?',
        message: `Thanks for choosing ${venue.name}. If you’d like to share how it went, you can leave a Google review.`,
        action: { label: 'Leave a Google review', url: httpsUrl(venue.googleReviews).href }, optOut: httpsUrl(event.optOutUrl).href,
      });
    default:
      throw new Error('Unknown notification email');
  }
}
