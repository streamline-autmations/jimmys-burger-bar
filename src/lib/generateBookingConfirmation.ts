import { config } from '../config';
import { copy } from '../core/tenant';
import { GuestPdf, M, CW, NAVY, MUTED } from '../core/documents/guestPdf';

/** "2026-11-21" -> "Sat, 21 Nov 2026"; anything else is shown as submitted. */
const formatDate = (value: string): string => {
  const date = new Date(`${value}T12:00:00Z`);
  // Only a real calendar date is reformatted (2026-02-30 would otherwise roll into March).
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return value;
  return new Intl.DateTimeFormat('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date);
};

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
  const pdf = await GuestPdf.create({ reference: booking.reference, refLabel: 'Booking', headline: 'Table request received' });
  const { doc } = pdf;

  pdf.status('PENDING', copy.booking.pendingNote);

  // Date, time and party size are what the host checks first, so they get the big type.
  const facts: [string, string, number][] = [
    ['DATE', formatDate(booking.date), 0.5],
    ['TIME', booking.time, 0.25],
    ['GUESTS', booking.guests, 0.25],
  ];
  pdf.rule(pdf.y, 1.5);
  let x = M;
  facts.forEach(([label, value, share], i) => {
    const width = CW * share;
    if (i > 0) { doc.setDrawColor(...NAVY); doc.setLineWidth(0.75); doc.line(x - 12, pdf.y + 10, x - 12, pdf.y + 66); }
    pdf.font(9, 'bold', MUTED);
    doc.text(label, x, pdf.y + 24);
    pdf.font(pdf.fitSize(value, width - 24, 26), 'bold');
    doc.text(value, x, pdf.y + 54);
    x += width;
  });
  pdf.y += 76;
  pdf.rule(pdf.y, 1.5);
  pdf.font(9, 'normal', MUTED);
  doc.text(`Times are ${config.venue.timeLabel}.`, M, pdf.y + 16);
  pdf.y += 30;

  pdf.row('Seating preference', booking.seating);
  pdf.row('Name', booking.name);
  pdf.row('Email', booking.email);
  pdf.row('Phone', booking.phone);

  if (booking.notes) {
    pdf.y += 26;
    pdf.heading('Notes');
    pdf.font(11, 'normal');
    pdf.wrap(booking.notes, CW).forEach((line) => {
      pdf.ensure(16);
      pdf.font(11, 'normal');
      doc.text(line, M, pdf.y + 12);
      pdf.y += 16;
    });
  }

  pdf.save(`${copy.documents.filePrefix}-booking-${booking.reference}.pdf`);
}
