// "As soon as possible" for checkout: the earliest slot the existing rules allow.
//
// Nothing here knows about React. The rules themselves (trading hours, closures,
// quarter-hour slots, the kitchen's notice time) stay in tradingHours.ts; this only
// walks the open days for the first slot that also passes the caller's own test
// (delivery window, a category's end time), and says whether that slot is close
// enough to "now" to be called ASAP.

import { collectionSlots, latestTime, openDates, restaurantDate, restaurantInstant, tradingHours } from './tradingHours';

export interface Slot { date: string; time: string }

const QUARTER_HOUR = 15 * 60_000;

/** The first bookable slot on the first day that has one, or null when none exists in `daysAhead` days. */
export function earliestSlot(opts: { now: Date; daysAhead: number; leadMinutes: number; accept?: (slot: Slot) => boolean }): Slot | null {
  const { now, daysAhead, leadMinutes, accept = () => true } = opts;
  for (const date of openDates(daysAhead, now)) {
    const time = collectionSlots(date, leadMinutes, now).find((candidate) => accept({ date, time: candidate }));
    if (time) return { date, time };
  }
  return null;
}

/**
 * ASAP is only honest while the kitchen is open and the earliest slot is the very
 * next quarter hour after the notice time. A slot hours away (closed now, delivery
 * not running yet, a cut-off passed) is a time to schedule, not "as soon as possible".
 */
export function asapSlot(opts: Parameters<typeof earliestSlot>[0]): Slot | null {
  if (!openNow(opts.now)) return null;
  const slot = earliestSlot(opts);
  if (!slot) return null;
  const wait = restaurantInstant(slot.date, slot.time).getTime() - (opts.now.getTime() + opts.leadMinutes * 60_000);
  return wait <= QUARTER_HOUR ? slot : null;
}

/** True while `now` falls inside today's trading hours (a dated closure counts as closed). */
export function openNow(now: Date): boolean {
  const today = restaurantDate(now);
  const window = tradingHours(today);
  if (!window) return false;
  const opens = restaurantInstant(today, window.open).getTime();
  // latestTime is the last bookable minute (23:59 for a midnight close), so the close is one minute after it.
  const closes = restaurantInstant(today, latestTime(window.close)!).getTime() + 60_000;
  return now.getTime() >= opens && now.getTime() < closes;
}
