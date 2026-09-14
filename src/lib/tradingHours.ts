// Trading-hour and contact validation shared by the order and booking flows.
//
// The logic now lives in src/core/domain/{time,hours}.ts; this module keeps its
// original exported surface so the pages that consume it did not all have to
// change at once. What it no longer does is parse hours out of a display
// string, or assume a fixed +02:00 offset.

import { config } from '../config';
import { hours as schedule, restaurantDate, restaurantInstant } from '../core/tenant';
import { dayOfWeek } from '../core/domain/hours';

export { restaurantDate, restaurantInstant };

/** The open window for a date, or null when the restaurant is closed. */
export const tradingHours = (date: string) => schedule.hoursFor(date);

export const latestTime = (close?: string): string | undefined => schedule.latestTime(close);

export function requestedTimeError(date: string, time: string, now = new Date()): string | null {
  const window = tradingHours(date);
  if (!window) return config.ordering.closedDayNote;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return 'Choose a requested time.';
  if (time < window.open || time >= window.close) {
    const until = window.close === '24:00' ? 'midnight' : window.close;
    return `Choose a time from ${window.open} and before ${until} (${config.venue.timeLabel}).`;
  }
  if (restaurantInstant(date, time).getTime() <= now.getTime()) {
    return `Choose a future date and time (${config.venue.timeLabel}).`;
  }
  return null;
}

export const contactError = (name: string, phone: string, email: string): string | null => {
  if (!name.trim()) return 'Enter your name.';
  const digits = phone.replace(/\D/g, '');
  if (!/^[+\d\s()-]+$/.test(phone) || digits.length < 9 || digits.length > 15) {
    return 'Enter a valid phone number, including the area or country code.';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Enter a valid email address.';
  return null;
};

/** Field-keyed errors. A field with no entry is valid. */
export type FieldErrors<K extends string> = Partial<Record<K, string>>;

/**
 * The same rules as contactError, reported per field so each message can sit
 * under the input it belongs to instead of one string at the bottom of the form.
 */
export function contactFieldErrors(name: string, phone: string, email: string): FieldErrors<'name' | 'phone' | 'email'> {
  const errors: FieldErrors<'name' | 'phone' | 'email'> = {};
  if (!name.trim()) errors.name = 'Enter your name.';
  const digits = phone.replace(/\D/g, '');
  if (!phone.trim()) errors.phone = 'Enter your phone number.';
  else if (!/^[+\d\s()-]+$/.test(phone) || digits.length < 9 || digits.length > 15) {
    errors.phone = 'Enter a valid phone number, including the area or country code.';
  }
  if (!email.trim()) errors.email = 'Enter your email address.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = 'Enter a valid email address, like name@example.com.';
  return errors;
}

/** Date and time errors, split so a closed day is reported on the date and a bad time on the time. */
export function slotFieldErrors(date: string, time: string, now = new Date()): FieldErrors<'date' | 'time'> {
  if (!date) return { date: 'Choose a date.' };
  if (dayOfWeek(date) === null) return { date: 'Choose a valid date.' };
  if (!tradingHours(date)) return { date: config.ordering.closedDayNote };
  if (!time) return { time: 'Choose a time.' };
  const error = requestedTimeError(date, time, now);
  return error ? { time: error } : {};
}

/** YYYY-MM-DD plus `days`, calendar-safe. */
export function addDays(date: string, days: number): string {
  const base = new Date(`${date}T12:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

/**
 * The restaurant's open days from today, inclusive, for the next `daysAhead`
 * days. A day whose last slot has already passed is left out, so a customer
 * ordering at 20:30 on a day that closes at 20:00 is not offered "Today".
 */
export function openDates(daysAhead: number, now = new Date()): string[] {
  const today = restaurantDate(now);
  const dates: string[] = [];
  for (let offset = 0; offset <= daysAhead; offset += 1) {
    const date = addDays(today, offset);
    const window = tradingHours(date);
    if (!window) continue;
    const last = latestTime(window.close);
    if (last && restaurantInstant(date, last).getTime() <= now.getTime()) continue;
    dates.push(date);
  }
  return dates;
}
