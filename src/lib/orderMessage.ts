import { config } from '../config';
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

// Persisted reference with a UUID suffix to avoid the old 9,000-number collision space.
export const generateOrderNumber = (): string => {
  const digits = crypto.randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase();
  return `${config.ordering.orderPrefix}-${digits}`;
};
