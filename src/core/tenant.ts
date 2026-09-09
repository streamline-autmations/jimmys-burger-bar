// The single seam between a restaurant's configuration and the product code.
//
// Everything region- or brand-specific is resolved here once, so components
// import behaviour rather than reaching into config and re-deriving it. When
// Restaurant Direct moves from build-time tenancy (VITE_TENANT) to runtime
// tenancy, this is the only file that has to change.

import { config } from '../config';
import { createMoneyFormatter, toMinor, fromMinor, type Minor } from './domain/money';
import { createTimeHelpers } from './domain/time';
import { createHours } from './domain/hours';

export const formatMoney = createMoneyFormatter(config.currency);

/** A menu price (human decimal in config) as minor units. */
export const menuPrice = (price: number | undefined): Minor => toMinor(price ?? 0);

/** Minor units back to the decimal amount the database column stores. */
export const toStoredAmount = (minor: Minor): number => fromMinor(minor);

export const { restaurantDate, restaurantInstant, restaurantDayBounds } = createTimeHelpers({
  timeZone: config.timezone,
  locale: config.locale,
});

export const hours = createHours(config.venue.hours, config.venue.closures);

export type { Minor };
