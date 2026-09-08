import { config } from '../config';

export const restaurantDate = (now = new Date()): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Johannesburg', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);

export const restaurantInstant = (date: string, time: string): Date => new Date(`${date}T${time}:00+02:00`);

export function tradingHours(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = new Date(`${date}T12:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return null;
  const row = config.venue.hours.find((hours) => hours.days.includes(parsed.getUTCDay()));
  const match = row?.time.match(/(\d{2}:\d{2})\s*–\s*(\d{2}:\d{2})/);
  return match ? { open: match[1], close: match[2] === '00:00' ? '24:00' : match[2] } : null;
}

export function requestedTimeError(date: string, time: string, now = new Date()): string | null {
  const hours = tradingHours(date);
  if (!hours) return 'Choose an open day. For Coffee & Cars Sundays, contact Jimmy\'s to check the event date.';
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return 'Choose a requested time.';
  if (time < hours.open || time >= hours.close) return `Choose a time from ${hours.open} and before ${hours.close === '24:00' ? 'midnight' : hours.close} (South African time).`;
  if (restaurantInstant(date, time).getTime() <= now.getTime()) return 'Choose a future date and time (South African time).';
  return null;
}

export const latestTime = (close?: string): string | undefined => {
  if (!close) return undefined;
  const [h, m] = close.split(':').map(Number);
  const minutes = h * 60 + m - 1;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
};

export const contactError = (name: string, phone: string, email: string): string | null => {
  if (!name.trim()) return 'Enter your name.';
  if (!/^[+\d\s()-]+$/.test(phone) || phone.replace(/\D/g, '').length < 9 || phone.replace(/\D/g, '').length > 15) return 'Enter a valid phone number, including the area or country code.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Enter a valid email address.';
  return null;
};
