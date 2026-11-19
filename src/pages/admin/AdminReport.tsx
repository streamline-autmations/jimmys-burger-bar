import React, { useCallback, useState } from 'react';
import { Download } from 'lucide-react';
import { data as db, reportCsv, summariseMonths, commissionRateLabel, monthCommission, paymentLabel, type OrderReportRow } from '../../core/data';
import { formatWholeMoney } from '../../core/data/sales';
import { formatCartMoney } from '../../lib/cartStore';
import { toMinor } from '../../core/domain/money';
import { restaurantInstant } from '../../core/tenant';
import { config } from '../../config';
import { useAdminResource } from './useAdminResource';
import { AdminRefresh } from './AdminRefresh';
import { AdminPageHeader } from './AdminPageHeader';
import { AdminEmpty, AdminError, AdminSkeleton } from './AdminStates';
import { Figure } from './AdminDashboard';
import { cardClass, controlClass, thClass } from './adminUtils';

const monthFormatter = new Intl.DateTimeFormat(config.locale, { timeZone: config.timezone, month: 'long', year: 'numeric' });
const monthLabel = (month: string) => monthFormatter.format(restaurantInstant(`${month}-15`, '12:00'));
const money = (amount: number) => formatCartMoney(toMinor(amount));
// Month totals pass a thousand; menu prices never do, so the cart formatter leaves out grouping.
const grouped = (amount: number) => money(amount).replace(/\B(?=(\d{3})+(?!\d))/g, config.currency.thousandsSeparator || '\u00a0');
/** A month runs to hundreds of orders; the totals above are the point, the list is for checking. */
const FIRST_ROWS = 15;


const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/**
 * The month-end check: completed orders, what our fee is charged on, and, where
 * the restaurant's config sets a comparison rate, what an app would have taken.
 * Read-only. The CSV is for reconciling against Payfast and the till.
 */
export const AdminReport: React.FC = () => {
  const load = useCallback(() => (db.orderReport ? db.orderReport() : Promise.resolve([] as OrderReportRow[])), []);
  const { data: rows, loading, error, updatedAt, refresh } = useAdminResource<OrderReportRow[]>(load, [], { pollMs: 0 });
  const months = summariseMonths(rows);
  const [picked, setPicked] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const summary = months.find((item) => item.month === picked) ?? months[0];
  const rate = config.reporting?.appCommissionRate;
  const visible = summary && !showAll ? summary.rows.slice(0, FIRST_ROWS) : summary?.rows ?? [];

  const download = () => {
    if (!summary) return;
    const url = URL.createObjectURL(new Blob([reportCsv(summary, rate)], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${config.slug}-orders-${summary.month}.csv`;
    link.click();
    // Revoked after the click has been handled, or some browsers cancel the download.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <section>
      <AdminPageHeader
        title="Order report"
        count={summary ? `${plural(summary.orders, 'completed order', 'completed orders')} in ${monthLabel(summary.month)}` : loading ? undefined : 'Completed orders, month by month'}
      >
        {summary && (
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm font-semibold">
              Month
              <select className={`${controlClass} mt-1 min-w-44`} value={summary.month} onChange={(event) => { setPicked(event.target.value); setShowAll(false); }}>
                {months.map((item) => <option key={item.month} value={item.month}>{monthLabel(item.month)}</option>)}
              </select>
            </label>
            <button
              type="button"
              onClick={download}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 font-display text-sm font-bold text-surface transition-colors duration-150 hover:bg-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <Download size={16} aria-hidden="true" />
              Download CSV
            </button>
          </div>
        )}
      </AdminPageHeader>

      <AdminRefresh polling={false} loading={loading} updatedAt={updatedAt} onRefresh={() => void refresh()} />

      {error && (
        <div className="mb-6">
          <AdminError message={error} onRetry={() => void refresh()} />
        </div>
      )}

      {loading && !updatedAt ? (
        <AdminSkeleton rows={3} />
      ) : error && !updatedAt ? null : !summary ? (
        <AdminEmpty title="No completed orders yet" hint="Orders appear here once they are paid and marked collected or delivered." />
      ) : (
        <>
          <dl
            aria-label={`${monthLabel(summary.month)} totals`}
            className={`mb-3 grid grid-cols-2 overflow-hidden rounded-2xl bg-ink text-paper ${rate ? 'lg:grid-cols-3' : ''} [&>div]:border-paper/10 [&>div:nth-child(n+3)]:border-t [&>div+div]:border-l [&>div:nth-child(3)]:border-l-0 lg:[&>div:nth-child(3)]:border-l lg:[&>div:nth-child(n+3)]:border-t-0`}
          >
            <Figure label="Completed orders" value={String(summary.orders)} note={monthLabel(summary.month)} />
            <Figure
              label="Order value"
              value={formatWholeMoney(summary.base)}
              note={[summary.refunds > 0 ? `After ${grouped(summary.refunds)} refunded` : 'Food, after refunds', summary.delivery > 0 ? `plus ${grouped(summary.delivery)} delivery` : ''].filter(Boolean).join(', ')}
            />
            {rate ? (
              <Figure
                highlight
                className="col-span-2 lg:col-span-1"
                label="Commission kept"
                value={formatWholeMoney(monthCommission(summary, rate))}
                note={`What a ${commissionRateLabel(rate)} delivery app would have taken`}
              />
            ) : null}
          </dl>
          <p className="mb-6 max-w-[68ch] text-sm text-ink/70">
            Order value is what the Restaurant Direct fee is worked out from: food, less refunds, without delivery fees.
            {rate ? ` The ${commissionRateLabel(rate)} rate estimates what a delivery app would charge ${config.venue.name}.` : ''}
          </p>

          <ul className="space-y-3 lg:hidden" aria-label="Orders">
            {visible.map((row) => (
              <li key={row.reference} className={`${cardClass} flex items-start justify-between gap-3 p-4`}>
                <span className="min-w-0">
                  <span className="block font-display text-base font-bold tracking-wide text-primary">{row.reference}</span>
                  <span className="mt-1 block text-sm text-ink/65">
                    {paymentLabel(row.payment_state)}
                    {row.delivery > 0 && `, ${money(row.delivery)} delivery`}
                    {row.refunds > 0 && `, ${money(row.refunds)} refunded`}
                  </span>
                </span>
                <span className="shrink-0 font-display text-base font-bold tabular-nums text-primary">{money(row.commission_base)}</span>
              </li>
            ))}
          </ul>

          <div className={`${cardClass} hidden overflow-hidden lg:block`}>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink/10 bg-paper/60">
                <tr>
                  <th className={thClass}>Reference</th>
                  <th className={thClass}>Payment</th>
                  <th className={`${thClass} text-right`}>Food</th>
                  <th className={`${thClass} text-right`}>Delivery</th>
                  <th className={`${thClass} text-right`}>Refunds</th>
                  <th className={`${thClass} text-right`}>Order value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10 tabular-nums">
                {visible.map((row) => (
                  <tr key={row.reference}>
                    <td className="px-4 py-3 font-display font-bold tracking-wide text-primary">{row.reference}</td>
                    <td className="px-4 py-3 text-ink/70">{paymentLabel(row.payment_state)}</td>
                    <td className="px-4 py-3 text-right">{money(row.food_subtotal)}</td>
                    <td className="px-4 py-3 text-right text-ink/65">{row.delivery > 0 ? money(row.delivery) : '-'}</td>
                    <td className="px-4 py-3 text-right text-ink/65">{row.refunds > 0 ? money(row.refunds) : '-'}</td>
                    <td className="px-4 py-3 text-right font-bold text-primary">{money(row.commission_base)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-ink/15 bg-paper/60 font-bold tabular-nums">
                <tr>
                  <td className="px-4 py-3" colSpan={2}>Total, {plural(summary.orders, 'order', 'orders')}</td>
                  <td className="px-4 py-3 text-right">{grouped(summary.food)}</td>
                  <td className="px-4 py-3 text-right">{summary.delivery > 0 ? grouped(summary.delivery) : '-'}</td>
                  <td className="px-4 py-3 text-right">{summary.refunds > 0 ? grouped(summary.refunds) : '-'}</td>
                  <td className="px-4 py-3 text-right text-primary">{grouped(summary.base)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          {/* A toggle rather than a button that vanishes, so keyboard focus stays put. */}
          {summary.rows.length > FIRST_ROWS && (
            <button
              type="button"
              aria-expanded={showAll}
              onClick={() => setShowAll((value) => !value)}
              className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-ink/20 bg-surface px-5 font-bold text-ink transition-colors hover:bg-paper"
            >
              {showAll ? `Show the first ${FIRST_ROWS} only` : `Show all ${summary.orders} orders`}
            </button>
          )}
        </>
      )}
    </section>
  );
};
