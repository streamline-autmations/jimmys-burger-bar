import { config } from '../config';
import { copy } from '../core/tenant';
import { GuestPdf, M, PAGE_W, GOLD, MUTED, MAX_BLOCK } from '../core/documents/guestPdf';
import { formatCartMoney, type CartLine, type OrderType } from './cartStore';

const METHOD: Record<OrderType, string> = { collection: 'Collection', delivery: 'Delivery', table: 'Table service' };

export async function generateOrderReceipt(order: {
  orderNo: string;
  name: string;
  email: string;
  phone: string;
  orderType: OrderType;
  tableNumber: string;
  deliveryAddress: string;
  lines: CartLine[];
  total: number;
  requestedTime?: string;
  placedAt?: string;
}): Promise<void> {
  const pdf = await GuestPdf.create({ reference: order.orderNo, refLabel: 'Order', headline: 'Order request received' });
  const { doc } = pdf;

  pdf.status('REQUEST', 'Request received. Subject to acceptance. Not proof of payment.');

  pdf.row('Order type', METHOD[order.orderType]);
  if (order.orderType === 'collection') pdf.row('Collect from', config.venue.address);
  if (order.orderType === 'delivery') pdf.row('Deliver to', order.deliveryAddress);
  if (order.orderType === 'table') pdf.row('Table', order.tableNumber);
  if (order.requestedTime) pdf.row('Requested time', `${order.requestedTime} (${config.venue.timeLabel})`);
  pdf.row('Name', order.name);
  pdf.row('Email', order.email);
  pdf.row('Phone', order.phone);

  pdf.y += 26;
  // Title, column headings and the first dish move to the next page together.
  pdf.ensure(24 + 17 + 50);
  pdf.heading('Order summary');

  const qtyX = M;
  const itemX = M + 40;
  const amountX = PAGE_W - M;
  const itemW = amountX - 84 - itemX;
  const columns = () => {
    pdf.font(9, 'bold', MUTED);
    doc.text('QTY', qtyX, pdf.y + 10);
    doc.text('ITEM', itemX, pdf.y + 10);
    doc.text('AMOUNT', amountX, pdf.y + 10, { align: 'right' });
    pdf.y += 17;
    pdf.rule(pdf.y, 1.5);
  };
  pdf.ensure(17 + 40);
  columns();
  pdf.onPageBreak = columns;

  order.lines.forEach((line, index) => {
    // The dish keeps its own amount and each extra gets a row of its own, so the lines add up to the total on the page.
    pdf.font(11, 'bold');
    const nameLines = pdf.wrap(line.name, itemW);
    pdf.font(10, 'normal');
    const extraLines = line.extras.map((extra) => pdf.wrap(`+ ${extra.name}`, itemW - 12));
    const height = 20 + nameLines.length * 15 + extraLines.reduce((sum, lines) => sum + lines.length * 14, 0);
    // Kept together when it fits; the last line travels with the total so the total never sits alone on a page.
    const block = index === order.lines.length - 1 ? height + 54 : height;
    pdf.ensure(block <= MAX_BLOCK ? block : 40);
    pdf.y += 10;

    nameLines.forEach((text, i) => {
      pdf.ensure(15);
      pdf.font(11, 'bold');
      if (i === 0) {
        doc.text(`${line.qty}×`, qtyX, pdf.y + 12);
        doc.text(formatCartMoney(line.qty * line.price), amountX, pdf.y + 12, { align: 'right' });
      }
      doc.text(text, itemX, pdf.y + 12);
      pdf.y += 15;
    });
    line.extras.forEach((extra, i) => {
      extraLines[i].forEach((text, j) => {
        pdf.ensure(14);
        pdf.font(10, 'normal', MUTED);
        if (j === 0) doc.text(formatCartMoney(line.qty * extra.price), amountX, pdf.y + 11, { align: 'right' });
        doc.text(text, itemX + 12, pdf.y + 11);
        pdf.y += 14;
      });
    });

    pdf.y += 10;
    pdf.rule(pdf.y, 0.75);
  });
  pdf.onPageBreak = null;

  pdf.ensure(54);
  pdf.y += 8;
  pdf.rule(pdf.y, 2.5, GOLD);
  pdf.font(18, 'bold');
  doc.text('Total', M, pdf.y + 28);
  doc.text(formatCartMoney(order.total), amountX, pdf.y + 28, { align: 'right' });
  pdf.y += 40;

  pdf.save(`${copy.documents.filePrefix}-order-${order.orderNo}.pdf`);
}
