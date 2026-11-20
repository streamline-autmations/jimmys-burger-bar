import { config } from '../config';
import { readSession, writeSession } from './sessionDraft';
import { formatMoney, menuPrice, storageKey } from '../core/tenant';
import type { Minor } from '../core/domain/money';
import { extrasOf, lineKey, pickExtras, unitPrice, type CartExtra } from '../core/menu/extras';
import { create } from 'zustand';

// Cart draft for direct ordering. Order.tsx submits an atomic database request.
//
// Keyed by item name because the menu data in config.ts does not carry stable
// ids yet. That is why a renamed dish silently drops out of a restored cart;
// stable ids are the fix and belong with the menu restructure.
//
// Line prices are MINOR UNITS (cents), not rand. The orders table stores a
// decimal amount, so anything crossing that boundary must go through
// toStoredAmount - see Order.tsx. Sending cents to the database would multiply
// every order by 100.

export type OrderType = 'collection' | 'table' | 'delivery';

export interface CartLine {
  /** `lineKey(name, extras)`: the same dish with different extras is a different line. */
  key: string;
  name: string;
  /** The DISH price, minor units (cents). R100 is 10000. Extras are priced separately, see `unitPrice`. */
  price: Minor;
  qty: number;
  /** Chosen extras in the dish's own order. Empty for a plain dish. */
  extras: CartExtra[];
}

interface CartState {
  lines: Record<string, CartLine>;
  orderType: OrderType;
  tableNumber: string;
  add: (name: string, price: number, extras?: CartExtra[], qty?: number) => void;
  /** Takes one off the line with this KEY (not the dish name). */
  remove: (key: string) => void;
  setQty: (key: string, qty: number) => void;
  /** Customise a line. If the dish with these extras is already in the cart the two lines merge. */
  setExtras: (key: string, extras: CartExtra[]) => void;
  setOrderType: (type: OrderType) => void;
  setTableNumber: (value: string) => void;
  clear: () => void;
  /** Order again: the whole cart at once, already priced from today's menu. */
  replaceLines: (lines: CartLine[]) => void;
}

/** Every dish a cart line can refer to, with the extras it offers today. */
const orderable = () => {
  const menu = new Map<string, { price: Minor; offered: ReturnType<typeof extrasOf> }>();
  for (const category of config.menu.categories) {
    for (const item of category.items) menu.set(item.name, { price: menuPrice(item.price), offered: extrasOf(item, category) });
  }
  for (const item of config.ordering.nonAlcoholicDrinks) menu.set(item.name, { price: menuPrice(item.price), offered: item.extras ?? [] });
  return menu;
};

// The session copy holds names and quantities only; prices always come from today's menu.
// Format: { [lineKey]: { n: dish name, q: qty, x: extra names } }. The first version stored { [name]: qty }, still read.
function restoredLines(): Record<string, CartLine> {
  try {
    const saved = JSON.parse(readSession(storageKey('cart')) ?? '{}');
    const menu = orderable();
    const result: Record<string, CartLine> = {};
    for (const [savedKey, value] of Object.entries(saved)) {
      const entry = typeof value === 'number' ? { n: savedKey, q: value, x: [] as unknown[] } : (value as { n?: unknown; q?: unknown; x?: unknown });
      if (typeof entry.n !== 'string' || !Array.isArray(entry.x)) continue;
      const dish = menu.get(entry.n);
      const qty = entry.q;
      if (!dish || !(dish.price > 0) || typeof qty !== 'number' || !Number.isInteger(qty) || qty < 1 || qty > 99) continue;
      // An extra the dish no longer offers is dropped; the cart then shows the new price.
      const extras = pickExtras(dish.offered, entry.x.filter((name): name is string => typeof name === 'string'));
      const key = lineKey(entry.n, extras);
      result[key] = { key, name: entry.n, price: dish.price, qty: Math.min(99, qty + (result[key]?.qty ?? 0)), extras };
    }
    return result;
  } catch { return {}; }
}

export const useCartStore = create<CartState>((set) => ({
  lines: restoredLines(),
  orderType: 'collection',
  tableNumber: '',

  add: (name, price, extras = [], qty = 1) =>
    set((state) => {
      if (!Number.isFinite(price) || price <= 0) return state;
      const key = lineKey(name, extras);
      const existing = state.lines[key];
      return {
        lines: {
          ...state.lines,
          [key]: { key, name, price, extras, qty: Math.min(99, (existing?.qty ?? 0) + qty) },
        },
      };
    }),

  remove: (key) =>
    set((state) => {
      const existing = state.lines[key];
      if (!existing) return state;
      if (existing.qty <= 1) {
        const rest = { ...state.lines };
        delete rest[key];
        return { lines: rest };
      }
      return {
        lines: { ...state.lines, [key]: { ...existing, qty: existing.qty - 1 } },
      };
    }),

  setQty: (key, qty) =>
    set((state) => {
      if (!Number.isFinite(qty) || !Number.isInteger(qty) || qty > 99) return state;
      if (qty <= 0) {
        const rest = { ...state.lines };
        delete rest[key];
        return { lines: rest };
      }
      const existing = state.lines[key];
      if (!existing) return state;
      return { lines: { ...state.lines, [key]: { ...existing, qty } } };
    }),

  setExtras: (key, extras) =>
    set((state) => {
      const existing = state.lines[key];
      if (!existing) return state;
      const nextKey = lineKey(existing.name, extras);
      // Rebuilt in order so the line stays where the guest was looking. A twin (same dish, same extras) absorbs this one's quantity.
      const lines: Record<string, CartLine> = {};
      for (const line of Object.values(state.lines)) {
        if (line.key === key) {
          const qty = Math.min(99, line.qty + (nextKey !== key ? (state.lines[nextKey]?.qty ?? 0) : 0));
          lines[nextKey] = { ...line, key: nextKey, extras, qty };
        } else if (line.key !== nextKey) {
          lines[line.key] = line;
        }
      }
      return { lines };
    }),

  setOrderType: (orderType) => set({ orderType }),
  setTableNumber: (tableNumber) => set({ tableNumber }),
  clear: () => set({ lines: {}, tableNumber: '' }),
  replaceLines: (lines) => set({ lines: Object.fromEntries(lines.map((line) => [line.key, line])) }),
}));

/**
 * Kept as the cart's money formatter so call sites read naturally, but the
 * currency itself is now configuration - see src/core/domain/money.ts.
 * The old name is gone deliberately: it asserted a currency in its signature.
 */
export const formatCartMoney = formatMoney;

export const selectCartLines = (state: CartState): CartLine[] => Object.values(state.lines);
export const selectCartCount = (state: CartState): number =>
  Object.values(state.lines).reduce((sum, line) => sum + line.qty, 0);
export const selectCartTotal = (state: CartState): number =>
  Object.values(state.lines).reduce((sum, line) => sum + line.qty * unitPrice(line), 0);

useCartStore.subscribe((state) => {
  writeSession(storageKey('cart'), JSON.stringify(Object.fromEntries(Object.values(state.lines).map((line) => [line.key, { n: line.name, q: line.qty, x: line.extras.map((extra) => extra.name) }]))));
});
