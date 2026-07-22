import { config } from '../config';
import { formatZar, type CartLine, type OrderType } from './cartStore';

interface BuildOrderMessageArgs {
  orderNo: string;
  lines: CartLine[];
  orderType: OrderType;
  tableNumber: string;
  total: number;
  name: string;
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
}: BuildOrderMessageArgs): string => {
  const typeLine =
    orderType === 'table'
      ? `Table order, Table ${tableNumber || '?'}`
      : 'Collection order';

  const itemLines = lines
    .map((line) => `${line.qty}x ${line.name}: ${formatZar(line.qty * line.price)}`)
    .join('\n');

  const messageParts = [
    `Hi! Order #${orderNo} from ${name || 'a customer'}.`,
    typeLine,
    '',
    itemLines,
    '',
    `Total: ${formatZar(total)}`,
  ];

  const message = messageParts.join('\n');

  return `https://wa.me/${config.venue.whatsapp}?text=${encodeURIComponent(message)}`;
};

// #JB-1042 style order number. Cosmetic only — nothing persists it.
export const generateOrderNumber = (): string => {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `${config.ordering.orderPrefix}-${digits}`;
};
