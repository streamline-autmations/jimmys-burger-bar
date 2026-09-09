// Trading-hour and contact validation shared by the order and booking flows.
//
// The logic now lives in src/core/domain/{time,hours}.ts; this module keeps its
// original exported surface so the pages that consume it did not all have to
// change at once. What it no longer does is parse hours out of a display
// string, or assume a fixed +02:00 offset.

import { config } from '../config';
import { hours as schedule, restaurantDate, restaurantInstant } from '../core/tenant';

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
