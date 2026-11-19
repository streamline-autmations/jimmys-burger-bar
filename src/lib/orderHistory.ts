import { useSyncExternalStore } from 'react';
import { menuPrice, orderCategories, storageKey } from '../core/tenant';
import type { Minor } from '../core/domain/money';
import { useCartStore, type CartLine, type OrderType } from './cartStore';

// "My orders" and the prefilled checkout, for the installed app only. Kept on
// this phone in localStorage and nowhere else: nothing here is sent anywhere
// except as the order itself, and the status of each order is read through the
// same reference + email check the tracking page uses. "Forget my details"
// removes all of it.

export interface GuestDetails { name: string; phone: string; email: string }

export interface SavedOrder {
  reference: string;
  /** The email it was placed with: the tracking check needs it. */
  email: string;
  placedAt: string;
  orderType: OrderType;
  /** Minor units, as the cart showed it. */
  total: Minor;
  items: { name: string; qty: number }[];
}

const DETAILS = storageKey('guest-details');
const ORDERS = storageKey('my-orders');
/** Enough to reorder a usual; older ones drop off so the list stays short. */
const KEEP = 12;

const listeners = new Set<() => void>();
let version = 0;
const changed = () => { version += 1; listeners.forEach((listener) => listener()); };

const read = <T,>(key: string, valid: (value: unknown) => value is T): T | null => {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? 'null');
    return valid(value) ? value : null;
  } catch { return null; }
};
const write = (key: string, value: unknown) => {
  try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage blocked: the app simply does not remember */ }
};

const isDetails = (value: unknown): value is GuestDetails =>
  !!value && typeof value === 'object' && ['name', 'phone', 'email'].every((field) => typeof (value as Record<string, unknown>)[field] === 'string');
const isOrders = (value: unknown): value is SavedOrder[] =>
  Array.isArray(value) && value.every((order) => order && typeof order.reference === 'string' && typeof order.email === 'string' && Array.isArray(order.items));

export const readDetails = (): GuestDetails | null => read(DETAILS, isDetails);
export const readOrders = (): SavedOrder[] => read(ORDERS, isOrders) ?? [];
export const findSavedOrder = (reference: string): SavedOrder | undefined =>
  readOrders().find((order) => order.reference.toUpperCase() === reference.trim().toUpperCase());

/** After the server has saved an order. Repeating it for the same reference (a retry) keeps one entry. */
export function rememberOrder(order: SavedOrder, details: GuestDetails): void {
  write(ORDERS, [order, ...readOrders().filter((saved) => saved.reference !== order.reference)].slice(0, KEEP));
  write(DETAILS, details);
  changed();
}

/** "Forget my details": name, phone, email and the order list all leave this phone. */
export function forgetEverything(): void {
  write(DETAILS, null);
  write(ORDERS, null);
  changed();
}

/** Re-renders when this tab saves or forgets. Other tabs pick changes up on their next load. */
export function useSavedOrders(): SavedOrder[] {
  useSyncExternalStore((listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; }, () => version, () => 0);
  return readOrders();
}
export function useSavedDetails(): GuestDetails | null {
  useSyncExternalStore((listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; }, () => version, () => 0);
  return readDetails();
}

/**
 * Order again: the same dishes at TODAY's menu prices. A dish no longer on the
 * menu (or no longer priced) is left out and named, never silently swapped.
 */
export function rebuildCart(
  items: { name: string; qty: number }[],
  menu: { name: string; price: Minor }[],
): { lines: CartLine[]; skipped: string[] } {
  const today = new Map(menu.filter((item) => item.price > 0).map((item) => [item.name, item.price]));
  const lines: CartLine[] = [];
  const skipped: string[] = [];
  for (const { name, qty } of items) {
    const price = today.get(name);
    if (price === undefined) { if (!skipped.includes(name)) skipped.push(name); continue; }
    const existing = lines.find((line) => line.name === name);
    if (existing) existing.qty = Math.min(99, existing.qty + qty);
    else lines.push({ name, price, qty: Math.min(99, Math.max(1, Math.floor(qty))) });
  }
  return { lines, skipped };
}

/** Replaces the cart with a past order at today's prices. Returns the dishes left out. */
export function orderAgain(order: Pick<SavedOrder, 'items' | 'orderType'>): string[] {
  const menu = orderCategories.flatMap((category) => category.items.map((item) => ({ name: item.name, price: menuPrice(item.price) })));
  const { lines, skipped } = rebuildCart(order.items, menu);
  useCartStore.getState().replaceLines(lines);
  useCartStore.getState().setOrderType(order.orderType);
  return skipped;
}
