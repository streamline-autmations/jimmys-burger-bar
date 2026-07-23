import { jsPDF } from 'jspdf';
import { formatZar, type CartLine, type OrderType } from './cartStore';

export function generateOrderReceipt(order: {
  orderNo: string; name: string; email: string; phone: string; orderType: OrderType;
  tableNumber: string; deliveryAddress: string; lines: CartLine[]; total: number;
}) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const width = doc.internal.pageSize.getWidth();
  const margin = 48;
  doc.setFillColor(30, 42, 78); doc.rect(0, 0, width, 96, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(25); doc.text("JIMMY'S", margin, 43);
  doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.text('ORDER CONFIRMATION', margin, 68);
  doc.setTextColor(30, 42, 78); doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.text(`#${order.orderNo}`, margin, 136);
  doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.text(`Placed ${new Date().toLocaleString('en-ZA')}`, margin, 158);
  const fulfilment = order.orderType === 'delivery' ? `Delivery: ${order.deliveryAddress}` : order.orderType === 'table' ? `Table service: Table ${order.tableNumber}` : 'Collection from 57 Loch Street, Meyerton';
  doc.setFont('helvetica', 'bold'); doc.text(order.name, margin, 196); doc.setFont('helvetica', 'normal'); doc.text(`${order.email} · ${order.phone}`, margin, 214); doc.text(fulfilment, margin, 234);
  let y = 280; doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text('YOUR ORDER', margin, y); y += 24;
  order.lines.forEach((line) => { doc.setFontSize(11); doc.text(`${line.qty}x  ${line.name}`, margin, y); doc.text(formatZar(line.qty * line.price), width - margin, y, { align: 'right' }); y += 24; });
  doc.setDrawColor(205, 214, 225); doc.line(margin, y, width - margin, y); y += 30;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text('TOTAL', margin, y); doc.text(formatZar(order.total), width - margin, y, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(110, 118, 138); doc.text('Demo confirmation only — no payment has been taken and no order was sent to the kitchen.', margin, 760);
  doc.save(`jimmys-order-${order.orderNo}.pdf`);
}
