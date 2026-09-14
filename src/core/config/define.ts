import type { RestaurantConfig } from './types';

/**
 * Validates a tenant at module load.
 *
 * The failure this prevents is quiet: a half-filled config used to render
 * "undefined" into a hero heading, or an empty hours array that made every day
 * read as closed and disabled ordering site-wide, with nothing in the console.
 * Failing loudly at boot is far cheaper than a client noticing.
 */
export function defineRestaurant(config: RestaurantConfig): RestaurantConfig {
  const problems: string[] = [];
  const need = (value: unknown, path: string) => {
    if (value === undefined || value === null || value === '') problems.push(`${path} is required`);
  };

  need(config.slug, 'slug');
  need(config.locale, 'locale');
  need(config.timezone, 'timezone');
  need(config.currency?.symbol, 'currency.symbol');
  need(config.venue?.name, 'venue.name');
  need(config.venue?.address, 'venue.address');
  need(config.venue?.email, 'venue.email');
  need(config.venue?.whatsapp, 'venue.whatsapp');
  need(config.assets?.logo, 'assets.logo');
  need(config.seo?.title, 'seo.title');

  if (!config.venue?.hours?.length) problems.push('venue.hours must list at least one day');
  if (!config.menu?.categories?.length) problems.push('menu.categories must not be empty');
  if (!config.ordering?.fulfilment?.length) problems.push('ordering.fulfilment must enable at least one mode');
  if (!Number.isInteger(config.ordering?.maxDaysAhead) || config.ordering.maxDaysAhead < 0) {
    problems.push('ordering.maxDaysAhead must be a whole number of days, 0 or more');
  }
  if (!Number.isInteger(config.booking?.maxDaysAhead) || config.booking.maxDaysAhead < 0) {
    problems.push('booking.maxDaysAhead must be a whole number of days, 0 or more');
  }
  if (!config.booking?.seatingOptions?.length) problems.push('booking.seatingOptions must list at least one option');
  if (!(config.booking?.minGuests >= 1 && config.booking.maxGuests >= config.booking.minGuests)) {
    problems.push('booking.minGuests must be at least 1 and no more than booking.maxGuests');
  }

  // Every trading day needs both ends of its window, or it silently reads as closed.
  for (const row of config.venue?.hours ?? []) {
    if ((row.open && !row.close) || (!row.open && row.close)) {
      problems.push(`venue.hours "${row.label}" has only one of open/close`);
    }
  }

  // A priced item with a non-numeric price is the old string format leaking back.
  for (const category of config.menu?.categories ?? []) {
    for (const item of category.items) {
      if (item.price !== undefined && typeof item.price !== 'number') {
        problems.push(`menu item "${item.name}" price must be a number, not a string`);
      }
    }
  }

  if (/[^\d]/.test(config.venue?.whatsapp ?? '')) {
    problems.push('venue.whatsapp must be digits only, with no plus sign or spaces');
  }

  if (problems.length) {
    throw new Error(
      `Restaurant config "${config.slug ?? 'unknown'}" is not valid:\n  - ${problems.join('\n  - ')}`,
    );
  }
  return config;
}
