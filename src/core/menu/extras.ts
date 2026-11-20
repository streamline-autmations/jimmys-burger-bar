import type { Extra, MenuCategory, MenuItem } from '../config/types';
import { fromMinor, toMinor, type Minor } from '../domain/money';

/**
 * Extras ("Extra Bacon") on a dish. Pure, so the browser cart, the price list
 * generator (`npm run menu:sql`) and the tests share one set of rules. The
 * server holds the same list in menu_items.extras and is the only price that counts.
 */

/** An extra as the cart holds it: price in minor units, like the dish. */
export interface CartExtra { name: string; price: Minor }

/** An extra as the database stores and the order carries it: a decimal amount. */
// A type alias (not an interface) so it is assignable to the Json type of the order RPC's items.
export type StoredExtra = { name: string; price: number };

/** The extras a dish offers: its own list if it sets one, else its category's. Whole-unit decimals, config order. */
export const extrasOf = (item: Pick<MenuItem, 'extras'>, category: Pick<MenuCategory, 'extras'>): Extra[] =>
  item.extras ?? category.extras ?? [];

/** Through minor units, exactly as dish prices go, so a price like 25.505 rounds the same on both sides. */
export const extraStoredPrice = (extra: Extra): number => fromMinor(toMinor(extra.price));

/** What a guest picked, kept in the dish's own order and limited to what it offers. Unknown names are dropped. */
export function pickExtras(offered: Extra[], pickedNames: readonly string[]): CartExtra[] {
  const wanted = new Set(pickedNames);
  return offered.filter((extra) => wanted.has(extra.name)).map((extra) => ({ name: extra.name, price: toMinor(extra.price) }));
}

export const extrasTotal = (extras: readonly { price: Minor }[]): Minor => extras.reduce((sum, extra) => sum + extra.price, 0);

/** Identity of a cart line: the same dish with different extras is a different line. JSON, so no name can collide with another. */
export const lineKey = (name: string, extras: readonly { name: string }[]): string =>
  extras.length === 0 ? name : JSON.stringify([name, extras.map((extra) => extra.name).sort()]);

/** One dish plus its extras, in minor units. */
export const unitPrice = (line: { price: Minor; extras: readonly { price: Minor }[] }): Minor => line.price + extrasTotal(line.extras);

/** Config problems with an extras list, for defineRestaurant. */
export function extrasProblems(where: string, extras: Extra[] | undefined): string[] {
  const problems: string[] = [];
  const names = new Set<string>();
  for (const extra of extras ?? []) {
    if (!extra.name?.trim()) problems.push(`${where}: an extra has no name`);
    if (names.has(extra.name)) problems.push(`${where}: extra "${extra.name}" is listed twice`);
    names.add(extra.name);
    if (typeof extra.price !== 'number' || !(extra.price > 0) || extra.price > 5000) problems.push(`${where}: extra "${extra.name}" needs a price above 0 and at most 5000`);
  }
  return problems;
}

/** Extras from a saved or server-sent order line, tolerating anything an old row or a hand-edited store holds. A bare name (a saved order keeps names only) reads as price 0. */
export function readExtras(value: unknown): StoredExtra[] {
  if (!Array.isArray(value)) return [];
  const result: StoredExtra[] = [];
  for (const entry of value) {
    if (typeof entry === 'string') { result.push({ name: entry, price: 0 }); continue; }
    if (entry && typeof entry === 'object' && typeof (entry as StoredExtra).name === 'string') {
      const price = Number((entry as StoredExtra).price);
      result.push({ name: (entry as StoredExtra).name, price: Number.isFinite(price) ? price : 0 });
    }
  }
  return result;
}

/** What one order line costs, extras included, as a decimal amount. Whole cents, so it never drifts. */
export const storedLineTotal = (line: { qty: number; unit_price: number; extras?: unknown }): number =>
  Math.round(line.qty * (toMinor(line.unit_price) + extrasTotal(readExtras(line.extras).map((e) => ({ price: toMinor(e.price) }))))) / 100;

/** "Extra Bacon, Extra Egg", or "" when there are none. Accepts a database value as well as a cart line's list. */
export const extrasText = (extras: unknown): string => readExtras(extras).map((extra) => extra.name).join(', ');

/** One line of text for a summary: "2× Beef Burger (+ Extra Bacon, Extra Egg)". */
export const describeLine = (line: { qty: number; name: string; extras?: unknown }, times = '×'): string => {
  const extras = extrasText(line.extras);
  return `${line.qty}${times} ${line.name}${extras ? ` (+ ${extras})` : ''}`;
};
