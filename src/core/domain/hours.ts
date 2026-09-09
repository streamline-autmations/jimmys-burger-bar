// Trading hours for Restaurant Direct.
//
// The model this replaces stored hours as a display string ("09:00 – 20:00")
// and recovered them with a regex requiring an EN-DASH and zero padding. Typing
// "9:00 - 20:00" - a hyphen, which is what anyone would type - made the day
// parse as closed, silently disabling both booking and ordering with an error
// message naming an event the tenant might not even run. Structured now, and
// the display string is derived rather than parsed.

export interface DayHours {
  /** JS day numbers, 0 = Sunday. */
  days: number[];
  /** Human label for the hours list, e.g. "Mon – Tue". */
  label: string;
  /** 24h "HH:MM". Omit both to mark the day closed. */
  open?: string;
  close?: string;
}

/** One-off closures and exceptions: public holidays, a private function, a refit. */
export interface Closure {
  /** YYYY-MM-DD */
  date: string;
  reason?: string;
  /** Present for a changed-hours day rather than a full closure. */
  open?: string;
  close?: string;
}

export interface OpenWindow {
  open: string;
  /** "24:00" means midnight at the end of the day. */
  close: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Validates the date and returns its day-of-week, or null if malformed. */
export function dayOfWeek(date: string): number | null {
  if (!ISO_DATE.test(date)) return null;
  const parsed = new Date(`${date}T12:00:00Z`);
  if (!Number.isFinite(parsed.getTime())) return null;
  if (parsed.toISOString().slice(0, 10) !== date) return null;
  return parsed.getUTCDay();
}

const normaliseClose = (close: string): string => (close === '00:00' ? '24:00' : close);

export function createHours(schedule: DayHours[], closures: Closure[] = []) {
  /** The open window for a date, or null when closed. */
  const hoursFor = (date: string): OpenWindow | null => {
    const day = dayOfWeek(date);
    if (day === null) return null;

    const exception = closures.find((entry) => entry.date === date);
    if (exception) {
      return exception.open && exception.close
        ? { open: exception.open, close: normaliseClose(exception.close) }
        : null;
    }

    const row = schedule.find((entry) => entry.days.includes(day));
    if (!row?.open || !row.close) return null;
    return { open: row.open, close: normaliseClose(row.close) };
  };

  const isOpenOn = (date: string): boolean => hoursFor(date) !== null;

  /** Display string for the hours list. Derived, never parsed back. */
  const displayHours = (row: DayHours, closedLabel = 'Closed'): string =>
    row.open && row.close ? `${row.open} – ${row.close}` : closedLabel;

  /** The last selectable minute, since the closing instant itself is not bookable. */
  const latestTime = (close?: string): string | undefined => {
    if (!close) return undefined;
    const [h, m] = close.split(':').map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return undefined;
    const minutes = h * 60 + m - 1;
    if (minutes < 0) return undefined;
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  };

  return { hoursFor, isOpenOn, displayHours, latestTime, schedule, closures };
}
