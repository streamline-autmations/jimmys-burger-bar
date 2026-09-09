// Restaurant-local time for Restaurant Direct.
//
// Replaces a hardcoded 'Africa/Johannesburg' in five places and, more
// importantly, a literal "+02:00" offset. That literal is correct for South
// Africa and wrong for any tenant whose region observes DST, where it would
// silently shift every requested collection time by an hour for half the year.
// The offset is derived from the IANA zone instead.

export interface TimeConfig {
  /** IANA zone, e.g. 'Africa/Johannesburg'. */
  timeZone: string;
  /** For human-facing date and time rendering, e.g. 'en-ZA'. */
  locale: string;
}

/**
 * Minutes that `timeZone` is ahead of UTC at the given instant.
 * Derived by formatting the instant in the zone and reading it back as if UTC.
 */
function zoneOffsetMinutes(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(instant);

  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? '0');
  const asIfUtc = Date.UTC(
    read('year'), read('month') - 1, read('day'),
    read('hour') % 24, read('minute'), read('second'),
  );
  return (asIfUtc - instant.getTime()) / 60000;
}

export function createTimeHelpers({ timeZone, locale }: TimeConfig) {
  /** Today in the restaurant's zone as YYYY-MM-DD. en-CA is used purely because it formats as ISO. */
  const restaurantDate = (now: Date = new Date()): string =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(now);

  /**
   * The instant at which the restaurant's wall clock reads `date` `time`.
   * Two passes: the first offset guess can be wrong when the wall time sits on
   * the far side of a DST change, so it is re-derived from the candidate.
   */
  const restaurantInstant = (date: string, time: string): Date => {
    const naive = new Date(`${date}T${time}:00Z`);
    if (!Number.isFinite(naive.getTime())) return naive;
    const first = zoneOffsetMinutes(naive, timeZone);
    const candidate = new Date(naive.getTime() - first * 60000);
    const second = zoneOffsetMinutes(candidate, timeZone);
    return second === first ? candidate : new Date(naive.getTime() - second * 60000);
  };

  /** Start and end instants of a restaurant-local day, DST-safe (a DST day is not 24h). */
  const restaurantDayBounds = (date: string = restaurantDate()) => {
    const start = restaurantInstant(date, '00:00');
    const next = new Date(start.getTime() + 36 * 3600000);
    const end = restaurantInstant(restaurantDate(next), '00:00');
    return { start: start.toISOString(), end: end.toISOString() };
  };

  return { restaurantDate, restaurantInstant, restaurantDayBounds, timeZone, locale };
}
