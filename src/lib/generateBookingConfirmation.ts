import { jsPDF } from 'jspdf';
import { config } from '../config';
import { copy } from '../core/tenant';
import { docInk as NAVY, docAccent as GOLD, docWordmark } from '../core/documents/brand';



async function loadLogoDataUrl(): Promise<string> {
  const response = await fetch(config.assets.logo);
  if (!response.ok) throw new Error(`Unable to load logo (${response.status})`);

  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error(`Unable to read logo`));
    reader.readAsDataURL(blob);
  });
}

export async function generateBookingConfirmation(booking: {
  reference: string;
  name: string;
  email: string;
  phone: string;
  guests: string;
  date: string;
  time: string;
  seating: string;
  notes: string;
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
  doc.text(docWordmark, 134, 42);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('TABLE BOOKING REQUEST', 134, 64);
  doc.setFillColor(...GOLD);
  doc.rect(0, 100, width, 3, 'F');

  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('BOOKING REFERENCE', margin, 130);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`#${booking.reference}`, margin, 153);

  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1.5);
  doc.line(margin, 170, margin + 64, 170);

  doc.setFontSize(13);
  doc.text(
    `${booking.guests} guest${booking.guests === '1' ? '' : 's'} · ${booking.date} · ${booking.time}`,
    margin,
    203,
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Preferred seating: ${booking.seating}`, margin, 230);

  doc.setFont('helvetica', 'bold');
  doc.text(booking.name, margin, 270);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(74, 85, 105);
  doc.text(`${booking.email} · ${booking.phone}`, margin, 290);

  if (booking.notes) {
    doc.setTextColor(...NAVY);
    doc.setFont('helvetica', 'bold');
    doc.text('NOTES', margin, 330);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(74, 85, 105);
    doc.text(booking.notes, margin, 350, { maxWidth: width - margin * 2 });
  }

  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1);
  doc.line(margin, 706, width - margin, 706);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(92, 101, 119);
  doc.text(config.venue.address, margin, 730);
  doc.text(config.venue.phone, width - margin, 730, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text(`Pending: ${copy.booking.pendingNote}`, margin, 757);

  doc.save(`${copy.documents.filePrefix}-booking-${booking.reference}.pdf`);
}
