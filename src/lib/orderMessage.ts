import { config } from '../config';
import { restaurantDate } from '../core/tenant';
import { formatCartMoney, type CartLine, type OrderType } from './cartStore';

interface BuildOrderMessageArgs {
  orderNo: string;
  lines: CartLine[];
  orderType: OrderType;
  tableNumber: string;
  total: number;
  name: string;
  requestedTime?: string;
  deliveryAddress?: string;
}

// Builds the wa.me deep link that carries the whole order as pre-filled
// WhatsApp text — same pattern as the `whatsappHref` builders already used
// in Navbar.tsx / Home.tsx, just with a longer itemised body.
export const buildOrderWhatsAppUrl = ({
  orderNo,
  lines,
  orderType,
  tableNumber,
  total,
  name,
  requestedTime,
  deliveryAddress,
}: BuildOrderMessageArgs): string => {
  const typeLine =
    orderType === 'table'
      ? `Table order, Table ${tableNumber || '?'}`
      : orderType === 'delivery' ? 'Delivery request' : 'Collection request';

  const itemLines = lines
    .map((line) => `${line.qty}x ${line.name}: ${formatCartMoney(line.qty * line.price)}`)
    .join('\n');

  const messageParts = [
    `Hi! Please check existing order #${orderNo} from ${name || 'a customer'}. This is a follow-up, not a new order.`,
    typeLine,
    requestedTime ? `Requested time: ${requestedTime} (SAST)` : '',
    orderType === 'delivery' && deliveryAddress ? `Address: ${deliveryAddress}` : '',
    '',
    itemLines,
    '',
    `Total: ${formatCartMoney(total)}`,
  ];

  const message = messageParts.join('\n');

  return `https://wa.me/${config.venue.whatsapp}?text=${encodeURIComponent(message)}`;
};

// No 0/O, 1/I/L: a guest reads the reference out at the counter or over the phone.
const REFERENCE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

/**
 * A reference like JB-0929-7KQ4MX: the restaurant-local month and day, then six
 * random characters from a 31-letter alphabet.
 *
 * It is also the retry key (create_order returns the existing order for the
 * same reference and email) and is unique across all time, so it cannot be a
 * short counter: the old 4-digit numbers collided. With the date in front, two
 * orders can only clash on the same calendar date (in any year), one in 887
 * million per pair. At 40 orders a day that is about a 1-in-120 chance of a
 * single clash anywhere in five years. A clash with another guest's order is
 * refused as `rejected`, which gives the next attempt a new reference
 * (Order.tsx), so that guest taps "Place order" again.
 */
export const generateOrderNumber = (now: Date = new Date()): string => {
  const [, month, day] = restaurantDate(now).split('-');
  const bytes = new Uint8Array(1);
  let code = '';
  while (code.length < 6) {
    crypto.getRandomValues(bytes);
    // 248 is the largest multiple of 31 under 256; rejecting above it keeps every letter equally likely.
    if (bytes[0] < 248) code += REFERENCE_ALPHABET[bytes[0] % 31];
  }
  return `${config.ordering.orderPrefix}-${month}${day}-${code}`;
};
