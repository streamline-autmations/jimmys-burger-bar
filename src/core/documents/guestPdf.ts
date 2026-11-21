import { jsPDF } from 'jspdf';
import { config } from '../../config';
import { docInk, docAccent, docPaper, loadLogo } from './brand';

/**
 * Shared A4 layout for the two guest downloads (order receipt, booking slip).
 * It is the approved notification email set in print: logo masthead, navy band
 * with the gold reference, gold rule, navy-ruled detail rows, dashed contact footer.
 * Helvetica and Courier are the email's own fallback faces and keep the text selectable.
 */

type Rgb = [number, number, number];

const NAVY = docInk;
const GOLD = docAccent;
const PAPER = docPaper;
const WHITE: Rgb = [255, 255, 255];
const MUTED: Rgb = [74, 85, 105];

export const PAGE_W = 595.28;
export const PAGE_H = 841.89;
export const M = 48;
export const CW = PAGE_W - M * 2;
const FOOTER_TOP = PAGE_H - 98;
const CONTENT_BOTTOM = FOOTER_TOP - 22;
/** Blocks taller than this are not kept together: they start where they are and break line by line. */
export const MAX_BLOCK = 400;

export const venueFullName = `${config.venue.name} ${config.venue.nameSuffix}`.trim();

type FontStyle = 'normal' | 'bold';

export class GuestPdf {
  readonly doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
  y = 0;
  /** Runs after a page break, e.g. to repeat table column headings. */
  onPageBreak: (() => void) | null = null;

  private constructor(private readonly reference: string, private readonly refLabel: string) {}

  static async create(opts: { reference: string; refLabel: string; headline: string }): Promise<GuestPdf> {
    const logo = await loadLogo();
    const pdf = new GuestPdf(opts.reference, opts.refLabel);
    pdf.doc.setProperties({ title: `${opts.headline} · ${opts.refLabel} ${opts.reference}`, author: venueFullName });
    pdf.firstPage(logo, opts.headline);
    return pdf;
  }

  font(size: number, style: FontStyle = 'normal', color: Rgb = NAVY, face: 'helvetica' | 'courier' = 'helvetica') {
    this.doc.setFont(face, style);
    this.doc.setFontSize(size);
    this.doc.setTextColor(...color);
    return this;
  }

  /** Wraps at the CURRENT font; long unbroken strings (emails) are split too. */
  wrap(text: string, width: number): string[] {
    // Tabs and bare CRs are measured differently from how they are drawn, so normalise them first.
    text = text.replace(/\r\n?/g, '\n').replace(/\t/g, ' ');
    const split = (value: string) => this.doc.splitTextToSize(value, width) as string[];
    const lines = split(text);
    // An email that does not fit breaks after the @, not mid-word.
    if (lines.length > 1 && /^[^\s@]+@\S+$/.test(text)) {
      const at = text.indexOf('@') + 1;
      return [...split(text.slice(0, at)), ...split(text.slice(at))];
    }
    return lines;
  }

  rule(y: number, weight: number, color: Rgb = NAVY, from = M, to = PAGE_W - M) {
    this.doc.setDrawColor(...color);
    this.doc.setLineWidth(weight);
    this.doc.line(from, y, to, y);
  }

  /** Starts a new page when `height` more points would run into the footer. */
  ensure(height: number) {
    if (this.y + height <= CONTENT_BOTTOM) return;
    this.doc.addPage();
    this.paintPaper();
    this.doc.setFillColor(...NAVY);
    this.doc.rect(0, 0, PAGE_W, 48, 'F');
    this.doc.setFillColor(...GOLD);
    this.doc.rect(0, 48, PAGE_W, 4, 'F');
    this.font(13, 'bold', GOLD, 'courier');
    this.doc.text(`${this.refLabel} ${this.reference}`, M, 30);
    this.font(10, 'bold', WHITE);
    this.doc.text('continued', PAGE_W - M, 30, { align: 'right' });
    this.y = 80;
    this.onPageBreak?.();
  }

  /** Gold tag plus a sentence, directly under the band, so the status is the first thing read. */
  status(tag: string, text: string) {
    this.font(9, 'bold');
    const tagW = this.doc.getTextWidth(tag) + 16;
    this.font(11, 'bold');
    const lines = this.wrap(text, CW - tagW - 12);
    const height = Math.max(22, lines.length * 15 + 7);
    this.doc.setFillColor(...GOLD);
    this.doc.rect(M, this.y, tagW, 22, 'F');
    this.font(9, 'bold');
    this.doc.text(tag, M + 8, this.y + 14.5);
    this.font(11, 'bold');
    lines.forEach((line, i) => this.doc.text(line, M + tagW + 12, this.y + 15 + i * 15));
    this.y += height + 22;
  }

  heading(text: string) {
    this.ensure(48);
    this.font(16, 'bold');
    this.doc.text(text, M, this.y + 12);
    this.y += 24;
  }

  /** Email-style row: bold label in the first 36%, wrapped value beside it, navy hairline under. */
  row(label: string, value: string) {
    const labelW = CW * 0.36;
    this.font(11, 'normal');
    const lines = this.wrap(value, CW - labelW);
    this.font(11, 'bold');
    const labelLines = this.wrap(label, labelW - 10);
    const count = Math.max(lines.length, labelLines.length);
    const block = count * 15 + 16;
    this.ensure(block <= MAX_BLOCK ? block : 40);
    this.y += 4;
    for (let i = 0; i < count; i++) {
      // A value too long for one page carries on line by line.
      this.ensure(15);
      this.font(11, 'bold');
      if (labelLines[i]) this.doc.text(labelLines[i], M, this.y + 15);
      this.font(11, 'normal');
      if (lines[i]) this.doc.text(lines[i], M + labelW, this.y + 15);
      this.y += 15;
    }
    this.y += 12;
    this.rule(this.y, 0.75);
  }

  /** Largest size up to `max` at which `text` fits `width`. */
  fitSize(text: string, width: number, max: number, style: FontStyle = 'bold', face: 'helvetica' | 'courier' = 'helvetica') {
    let size = max;
    this.font(size, style, NAVY, face);
    while (size > 8 && this.doc.getTextWidth(text) > width) this.font(--size, style, NAVY, face);
    return size;
  }

  private paintPaper() {
    this.doc.setFillColor(...PAPER);
    this.doc.rect(0, 0, PAGE_W, PAGE_H, 'F');
  }

  private firstPage(logo: string, headline: string) {
    const { doc } = this;
    this.paintPaper();
    const props = doc.getImageProperties(logo);
    const logoW = 108;
    const logoH = (logoW * props.height) / props.width;
    doc.addImage(logo, 'PNG', M, 20, logoW, logoH);
    this.font(13, 'bold');
    doc.text(config.venue.locality, PAGE_W - M, 20 + logoH / 2 + 4.5, { align: 'right' });

    const top = 20 + logoH + 18;
    doc.setFillColor(...NAVY);
    doc.rect(0, top, PAGE_W, 104, 'F');
    doc.setFillColor(...GOLD);
    doc.rect(0, top + 104, PAGE_W, 6, 'F');
    // The reference is what staff ask for, so it is the largest gold thing on the page.
    const reference = `${this.refLabel} ${this.reference}`;
    this.font(this.fitSize(reference, CW, 20, 'bold', 'courier'), 'bold', GOLD, 'courier');
    doc.text(reference, M, top + 34);
    this.font(this.fitSize(headline, CW, 32), 'bold', WHITE);
    doc.text(headline, M, top + 78);
    this.y = top + 110 + 24;
  }

  /** Contact footer and page numbers on every page, then the download. */
  save(filename: string) {
    const { doc } = this;
    const pages = doc.getNumberOfPages();
    const tel = config.venue.phone.replace(/[^\d+]/g, '');
    for (let page = 1; page <= pages; page++) {
      doc.setPage(page);
      doc.setLineDashPattern([4, 3], 0);
      this.rule(FOOTER_TOP, 1.25);
      doc.setLineDashPattern([], 0);
      this.font(11, 'bold');
      doc.text(venueFullName, M, FOOTER_TOP + 22);
      this.font(10, 'normal');
      doc.text(config.venue.address, M, FOOTER_TOP + 38);
      let x = M;
      const link = (label: string, url: string, last = false) => {
        doc.textWithLink(label, x, FOOTER_TOP + 54, { url });
        x += doc.getTextWidth(label);
        if (!last) { doc.text('  ·  ', x, FOOTER_TOP + 54); x += doc.getTextWidth('  ·  '); }
      };
      link(config.venue.phone, `tel:${tel}`);
      link('WhatsApp', `https://wa.me/${config.venue.whatsapp}`);
      link(config.venue.email, `mailto:${config.venue.email}`, true);
      if (pages > 1) {
        this.font(9, 'bold', MUTED);
        doc.text(`Page ${page} of ${pages}`, PAGE_W - M, FOOTER_TOP + 22, { align: 'right' });
      }
    }
    doc.save(filename);
  }
}

export { NAVY, GOLD, MUTED };
