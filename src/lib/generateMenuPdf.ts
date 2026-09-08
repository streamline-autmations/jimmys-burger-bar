import { jsPDF } from 'jspdf';
import { config } from '../config';

// Builds a real, brand-colored PDF straight from the menu data in config.ts —
// so it can never drift out of sync with the on-site menu. Uses jsPDF's
// built-in Helvetica (no custom font embedding) to stay dependency-light.
export function generateMenuPdf() {
  const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;

  const ink: [number, number, number] = [23, 37, 68];
  const primary: [number, number, number] = [23, 37, 68];
  const accent: [number, number, number] = [242, 169, 59];
  const gray: [number, number, number] = [110, 118, 138];

  let y = 0;

  const drawHeader = (compact = false) => {
    const bandHeight = compact ? 46 : 96;
    doc.setFillColor(...ink);
    doc.rect(0, 0, pageWidth, bandHeight, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(compact ? 16 : 26);
    doc.text("JIMMY'S", margin, compact ? 29 : 46);
    doc.setFontSize(compact ? 8 : 11);
    doc.setFont('helvetica', 'normal');
    doc.text('BURGER BAR', margin + (compact ? 62 : 108), compact ? 29 : 46);

    doc.setFontSize(9);
    doc.setTextColor(210, 220, 235);
    const info = `${config.venue.address}   ·   ${config.venue.phone}`;
    doc.text(info, pageWidth - margin, compact ? 29 : 46, { align: 'right' });

    if (!compact) {
      doc.setFontSize(10.5);
      doc.setTextColor(230, 236, 245);
      doc.text('Big breakfasts, 180g smash burgers and steaks off the grill. Real menu, real prices.', margin, 72);
    }

    y = bandHeight + 34;
  };

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - 56) {
      doc.addPage();
      drawHeader(true);
    }
  };

  drawHeader(false);

  config.menu.categories.forEach((category) => {
    ensureSpace(46);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(...primary);
    doc.text(category.name, margin, y);

    if (category.note) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9.5);
      doc.setTextColor(...gray);
      doc.text(category.note, margin, y + 14);
    }

    doc.setDrawColor(...primary);
    doc.setLineWidth(1);
    doc.line(margin, y + 20, pageWidth - margin, y + 20);
    y += 34;

    category.items.forEach((item) => {
      ensureSpace(34);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...ink);
      doc.text(item.name, margin, y);

      doc.setFontSize(11);
      doc.text(item.price, pageWidth - margin, y, { align: 'right' });

      const nameWidth = doc.getTextWidth(item.name);
      const priceWidth = doc.getTextWidth(item.price);
      const dotsStart = margin + nameWidth + 8;
      const dotsEnd = pageWidth - margin - priceWidth - 8;
      if (dotsEnd > dotsStart) {
        doc.setLineDashPattern([1.5, 2], 0);
        doc.setDrawColor(...gray);
        doc.setLineWidth(0.75);
        doc.line(dotsStart, y - 2, dotsEnd, y - 2);
        doc.setLineDashPattern([], 0);
      }

      y += 14;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(...gray);
      const descLines = doc.splitTextToSize(item.description, contentWidth - 10);
      doc.text(descLines, margin, y);
      y += descLines.length * 11 + 12;
    });

    y += 12;
  });

  ensureSpace(30);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9.5);
  doc.setTextColor(...accent);
  doc.text('Kitchen extras: bacon R17, egg R15, cheese R10, extra patty R28.', margin, y);

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...gray);
    doc.text(`${i} / ${pageCount}`, pageWidth - margin, pageHeight - 24, { align: 'right' });
    doc.text(`${config.venue.name} ${config.venue.nameSuffix}`, margin, pageHeight - 24);
  }

  doc.save("jimmys-burger-bar-menu.pdf");
}
