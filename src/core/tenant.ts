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
import { resolveCopy } from './config/copy';
import { orderableCategories } from './menu/orderable';

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

/** Tenant copy, merged over the product's generic English defaults. */
export const copy = resolveCopy(config.copy);

/** The guest pays online before the kitchen sees the order. Off means today's request-and-pay-on-collection flow. */
export const payFirst = config.ordering.payment === 'payfast';

/** Paid delivery with a rider step (ready -> out_for_delivery). Off, a delivery closes like a collection,
 *  because the pre-payments database refuses out_for_delivery. Pass order types to nextStatuses only when on. */
export const deliveryRun = payFirst && Boolean(config.ordering.deliveryPreview);

/** What every order button says. A collection-only venue names it. */
export const orderCtaLabel =
  config.ordering.fulfilment.length === 1 && config.ordering.fulfilment[0] === 'collection' ? 'Order for collection' : 'Order online';

/** The same list the server price list is generated from (npm run menu:sql). */
export const orderCategories = orderableCategories(config.menu.categories, {
  label: copy.order.softDrinksLabel,
  note: copy.order.softDrinksNote,
  items: config.ordering.nonAlcoholicDrinks,
});

/**
 * Namespaces browser storage per tenant, so two Restaurant Direct sites served
 * from the same origin during development cannot read each other's cart.
 */
export const storageKey = (name: string): string => `${config.slug}-${name}`;

/**
 * The tenant's home-page composition. Registered here alongside the config so
 * a tenant is one directory, and adding a restaurant does not mean editing a
 * page component.
 */
export const sections = config.sections;

export type { Minor };
