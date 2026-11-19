// The staff order report: completed orders by month, the figure our fee is
// worked out from, and a CSV for checking against Payfast and the till.
// Pure functions, so every adapter and the test share one calculation.

/** One completed order, as collection_commission_report() returns it. */
export interface OrderReportRow {
  reference: string;
  /** First day of the restaurant-local month the order was completed in, YYYY-MM-DD. */
  month: string;
  food_subtotal: number;
  delivery: number;
  refunds: number;
  payment_state: string;
  fulfilment_state: string;
  /** Food minus refunds, never below zero. What the commission is charged on. */
  commission_base: number;
}

export interface MonthSummary {
  /** YYYY-MM */
  month: string;
  orders: number;
  food: number;
  delivery: number;
  refunds: number;
  base: number;
  rows: OrderReportRow[];
}

const cents = (value: number | string) => {
  const n = Math.round(Number(value) * 100);
  return Number.isFinite(n) ? n : 0;
};

const PAYMENT_LABELS: Record<string, string> = {
  paid: 'Paid online',
  refund_pending: 'Refund pending',
  refunded: 'Refunded',
  // Pay-on-collection restaurants (the demo is one): settled at the counter.
  not_required: 'Paid at collection',
};
export const paymentLabel = (state: string): string => PAYMENT_LABELS[state] ?? state.replace(/_/g, ' ');

/** Newest month first; rows keep the order the adapter gave (newest completed first). Sums in whole cents. */
export function summariseMonths(rows: OrderReportRow[]): MonthSummary[] {
  const months = new Map<string, { food: number; delivery: number; refunds: number; base: number; rows: OrderReportRow[] }>();
  for (const row of rows) {
    const month = String(row.month).slice(0, 7);
    const entry = months.get(month) ?? { food: 0, delivery: 0, refunds: 0, base: 0, rows: [] };
    entry.food += cents(row.food_subtotal);
    entry.delivery += cents(row.delivery);
    entry.refunds += cents(row.refunds);
    entry.base += cents(row.commission_base);
    entry.rows.push(row);
    months.set(month, entry);
  }
  return [...months.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([month, entry]) => ({
      month,
      orders: entry.rows.length,
      food: entry.food / 100,
      delivery: entry.delivery / 100,
      refunds: entry.refunds / 100,
      base: entry.base / 100,
      rows: entry.rows,
    }));
}

// The rate is taken as whole basis points, so 0.29 cannot become 0.28999... and lose a cent.
const basisPoints = (rate: number) => Math.round(rate * 10_000);
export const commissionRateLabel = (rate: number): string => `${basisPoints(rate) / 100}%`;

/** What a comparison app would have taken on this base, to the cent. */
export const commissionAt = (base: number, rate: number): number =>
  Math.round((cents(base) * basisPoints(rate)) / 10_000) / 100;

/** The month's commission as the sum of each order's rounded figure, so the CSV rows add up to its total. */
export const monthCommission = (summary: MonthSummary, rate: number): number =>
  summary.rows.reduce((sum, row) => sum + cents(commissionAt(row.commission_base, rate)), 0) / 100;

// Quote every cell; a leading = + - @ (or full-width form, or whitespace) is neutralised so a spreadsheet never runs it as a formula.
const cell = (value: string | number) => {
  const text = String(value);
  return `"${(/^[\s=+\-@\uFF1D\uFF0B\uFF0D\uFF20]/.test(text) ? `'${text}` : text).replace(/"/g, '""')}"`;
};
const amount = (value: number) => (cents(value) / 100).toFixed(2);

/** One month's rows as CSV (RFC 4180, CRLF), amounts as plain decimals. */
export function reportCsv(summary: MonthSummary, rate?: number): string {
  const header = ['Reference', 'Month', 'Food', 'Delivery', 'Refunds', 'Payment', 'Status', 'Commission base'];
  if (rate) header.push(`Commission kept at ${commissionRateLabel(rate)}`);
  const lines = summary.rows.map((row) => {
    const line = [row.reference, summary.month, amount(row.food_subtotal), amount(row.delivery), amount(row.refunds),
      paymentLabel(row.payment_state), row.fulfilment_state, amount(row.commission_base)];
    if (rate) line.push(amount(commissionAt(row.commission_base, rate)));
    return line;
  });
  const total = ['Total', summary.month, amount(summary.food), amount(summary.delivery), amount(summary.refunds), '', '', amount(summary.base)];
  if (rate) total.push(amount(monthCommission(summary, rate)));
  return [header, ...lines, total].map((line) => line.map(cell).join(',')).join('\r\n') + '\r\n';
}
