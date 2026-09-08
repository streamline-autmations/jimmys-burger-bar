import { jsPDF } from 'jspdf';
import { config } from '../config';
import { formatZar, type CartLine, type OrderType } from './cartStore';

const NAVY: [number, number, number] = [23, 37, 68];
const GOLD: [number, number, number] = [242, 169, 59];

async function loadLogoDataUrl(): Promise<string> {
  const response = await fetch('/images/logo.png');
  if (!response.ok) throw new Error(`Unable to load Jimmy's logo (${response.status})`);

  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error(`Unable to read Jimmy's logo`));
    reader.readAsDataURL(blob);
  });
}

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
  const logoDataUrl = await loadLogoDataUrl();
  const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
  const width = doc.internal.pageSize.getWidth();
  const margin = 48;

  doc.setFillColor(...NAVY);
  doc.rect(0, 0, width, 100, 'F');
  doc.addImage(logoDataUrl, 'PNG', margin, 17, 69, 36);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text("JIMMY'S", 134, 42);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('ORDER CONFIRMATION', 134, 64);
  doc.setFillColor(...GOLD);
  doc.rect(0, 100, width, 3, 'F');

  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('ORDER REFERENCE', margin, 130);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(`#${order.orderNo}`, margin, 153);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(92, 101, 119);
  doc.text(`Requested ${order.requestedTime ?? 'Time to be confirmed'} (SAST)`, margin, 173);

  const fulfilment = order.orderType === 'delivery'
    ? `Delivery: ${order.deliveryAddress}`
    : order.orderType === 'table'
      ? `Table service: Table ${order.tableNumber}`
      : 'Collection from 57 Loch Street, Meyerton';

  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(order.name, margin, 211);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(74, 85, 105);
  doc.text(`${order.email} · ${order.phone}`, margin, 231);
  doc.text(fulfilment, margin, 251, { maxWidth: width - margin * 2 });

  let y = 294;
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('YOUR ORDER', margin, y);

  y += 18;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1.5);
  doc.line(margin, y, width - margin, y);

  y += 25;
  doc.setFillColor(244, 246, 249);
  doc.rect(margin, y - 17, width - margin * 2, 26, 'F');
  doc.setFontSize(9);
  doc.text('ITEM', margin + 10, y);
  doc.text('AMOUNT', width - margin - 10, y, { align: 'right' });

  y += 31;
  order.lines.forEach((line, index) => {
    if (y > 650) { doc.addPage(); y = 60; }
    if (index % 2 === 0) {
      doc.setFillColor(255, 252, 246);
      doc.rect(margin, y - 18, width - margin * 2, 28, 'F');
    }

    doc.setTextColor(...NAVY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`${line.qty}x  ${line.name}`, margin + 10, y);
    doc.text(formatZar(line.qty * line.price), width - margin - 10, y, { align: 'right' });
    y += 28;
  });

  if (y > 620) { doc.addPage(); y = 60; }
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1.5);
  doc.line(margin, y, width - margin, y);
  y += 31;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('TOTAL', margin, y);
  doc.text(formatZar(order.total), width - margin, y, { align: 'right' });

  doc.setDrawColor(220, 224, 231);
  doc.setLineWidth(0.75);
  doc.line(margin, 706, width - margin, 706);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(92, 101, 119);
  doc.text(config.venue.address, margin, 730);
  doc.text(config.venue.phone, width - margin, 730, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text("Request received. Subject to acceptance. Not proof of payment.", margin, 757);

  doc.save(`jimmys-order-${order.orderNo}.pdf`);
}
