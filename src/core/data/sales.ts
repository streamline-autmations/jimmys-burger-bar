// The Today page's order-value figures, computed the same way by every adapter.

import { config } from '../../config';
import { restaurantDate, restaurantDayBounds } from '../tenant';
import { addDays } from '../../lib/tradingHours';
import type { SalesSummary } from './types';

/** Today and the six restaurant days before it, as instants. */
export function salesWindow(now: Date = new Date()) {
  const today = restaurantDate(now);
  const { start: todayStart, end } = restaurantDayBounds(today);
  const { start: weekStart } = restaurantDayBounds(addDays(today, -6));
  return { todayStart, weekStart, end };
}

/** `rows` must already exclude cancelled orders and fall inside the week window. */
export function summariseSales(
  rows: { total: number | string; requested_time: string | null }[],
  window: { todayStart: string; end: string },
): SalesSummary {
  // Whole cents, so a week of decimal totals never drifts by a fraction.
  let week = 0;
  let today = 0;
  let todayCount = 0;
  for (const row of rows) {
    const cents = Math.round(Number(row.total) * 100);
    if (!Number.isFinite(cents)) continue;
    week += cents;
    // ISO instants in UTC compare correctly as strings.
    const at = row.requested_time ? new Date(row.requested_time).toISOString() : '';
    if (at >= window.todayStart && at < window.end) {
      today += cents;
      todayCount += 1;
    }
  }
  return { todayTotal: today / 100, todayCount, weekTotal: week / 100, weekCount: rows.length };
}

/**
 * Whole currency units, always grouped: "R18 867". Menu prices are formatted by
 * the tenant's currency, which may leave out grouping because no dish reaches
 * a thousand; a week of orders does.
 */
export function formatWholeMoney(amount: number): string {
  const { symbol, position, thousandsSeparator } = config.currency;
  const whole = String(Math.round(Math.abs(amount))).replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator || '\u00a0');
  const signed = amount < 0 ? `-${whole}` : whole;
  return position === 'before' ? `${symbol}${signed}` : `${signed}${symbol}`;
}
