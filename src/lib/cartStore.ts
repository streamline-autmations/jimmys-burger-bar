import { config } from '../config';
import { readSession, writeSession } from './sessionDraft';
import { formatMoney, menuPrice, storageKey } from '../core/tenant';
import type { Minor } from '../core/domain/money';
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
  name: string;
  /** Minor units (cents). R100 is 10000. */
  price: Minor;
  qty: number;
}

interface CartState {
  lines: Record<string, CartLine>;
  orderType: OrderType;
  tableNumber: string;
  add: (name: string, price: number) => void;
  remove: (name: string) => void;
  setQty: (name: string, qty: number) => void;
  setOrderType: (type: OrderType) => void;
  setTableNumber: (value: string) => void;
  clear: () => void;
}

function restoredLines(): Record<string, CartLine> {
  try {
    const saved = JSON.parse(readSession(storageKey('cart')) ?? '{}');
    const menu = [...config.menu.categories.flatMap((category) => category.items), ...config.ordering.nonAlcoholicDrinks];
    const result: Record<string, CartLine> = {};
    for (const item of menu) {
      const qty = saved[item.name];
      const price = menuPrice(item.price);
      if (Number.isInteger(qty) && qty > 0 && qty <= 99 && price > 0) result[item.name] = { name: item.name, qty, price };
    }
    return result;
  } catch { return {}; }
}

export const useCartStore = create<CartState>((set) => ({
  lines: restoredLines(),
  orderType: 'collection',
  tableNumber: '',

  add: (name, price) =>
    set((state) => {
      if (!Number.isFinite(price) || price <= 0) return state;
      const existing = state.lines[name];
      return {
        lines: {
          ...state.lines,
          [name]: { name, price, qty: Math.min(99, (existing?.qty ?? 0) + 1) },
        },
      };
    }),

  remove: (name) =>
    set((state) => {
      const existing = state.lines[name];
      if (!existing) return state;
      if (existing.qty <= 1) {
        const rest = { ...state.lines };
        delete rest[name];
        return { lines: rest };
      }
      return {
        lines: { ...state.lines, [name]: { ...existing, qty: existing.qty - 1 } },
      };
    }),

  setQty: (name, qty) =>
    set((state) => {
      if (!Number.isFinite(qty) || !Number.isInteger(qty) || qty > 99) return state;
      if (qty <= 0) {
        const rest = { ...state.lines };
        delete rest[name];
        return { lines: rest };
      }
      const existing = state.lines[name];
      if (!existing) return state;
      return { lines: { ...state.lines, [name]: { ...existing, qty } } };
    }),

  setOrderType: (orderType) => set({ orderType }),
  setTableNumber: (tableNumber) => set({ tableNumber }),
  clear: () => set({ lines: {}, tableNumber: '' }),
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
  Object.values(state.lines).reduce((sum, line) => sum + line.qty * line.price, 0);

useCartStore.subscribe((state) => {
  writeSession(storageKey('cart'), JSON.stringify(Object.fromEntries(Object.values(state.lines).map((line) => [line.name, line.qty]))));
});
