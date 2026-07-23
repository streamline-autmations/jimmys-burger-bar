import { jsPDF } from 'jspdf';
import { config } from '../config';

export function generateBookingConfirmation(booking: { reference: string; name: string; email: string; phone: string; guests: string; date: string; time: string; seating: string; notes: string }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' }); const width = doc.internal.pageSize.getWidth(); const margin = 48;
  doc.setFillColor(30, 42, 78); doc.rect(0, 0, width, 96, 'F'); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(25); doc.text("JIMMY'S", margin, 43); doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.text('TABLE BOOKING CONFIRMATION', margin, 68);
  doc.setTextColor(30, 42, 78); doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.text(`#${booking.reference}`, margin, 136);
  doc.setFontSize(13); doc.text(`${booking.guests} guest${booking.guests === '1' ? '' : 's'} · ${booking.date} · ${booking.time}`, margin, 176);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.text(`Preferred seating: ${booking.seating}`, margin, 206); doc.text(booking.name, margin, 236); doc.text(`${booking.email} · ${booking.phone}`, margin, 256);
  if (booking.notes) doc.text(`Notes: ${booking.notes}`, margin, 286, { maxWidth: width - margin * 2 });
  doc.setFontSize(10); doc.setTextColor(110, 118, 138); doc.text(config.venue.address, margin, 700); doc.text('Demo confirmation only — this reservation has not been sent to Jimmy’s.', margin, 724);
  doc.save(`jimmys-booking-${booking.reference}.pdf`);
}
