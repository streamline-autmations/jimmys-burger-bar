import { config } from '../config';
import { readSession, writeSession } from './sessionDraft';
import { create } from 'zustand';

// Cart draft for direct ordering. Order.tsx submits an atomic database request. Keyed by item name since the menu data (config.ts)
// doesn't carry stable ids.

export type OrderType = 'collection' | 'table' | 'delivery';

export interface CartLine {
  name: string;
  price: number; // parsed Rand amount, e.g. R100 -> 100
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
    const saved = JSON.parse(readSession('jimmys-cart') ?? '{}');
    const menu = [...config.menu.categories.flatMap((category) => category.items), ...config.ordering.nonAlcoholicDrinks];
    const result: Record<string, CartLine> = {};
    for (const item of menu) {
      const qty = saved[item.name];
      const price = Number(item.price.replace(/[^0-9.]/g, ''));
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

// Menu prices are strings like "R100" — parse to a number for cart math.
export const parsePrice = (price: string): number => {
  const cleaned = price.replace(/[^0-9.]/g, '');
  return cleaned ? parseFloat(cleaned) : 0;
};

export const formatZar = (amount: number): string => `R${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;

export const selectCartLines = (state: CartState): CartLine[] => Object.values(state.lines);
export const selectCartCount = (state: CartState): number =>
  Object.values(state.lines).reduce((sum, line) => sum + line.qty, 0);
export const selectCartTotal = (state: CartState): number =>
  Object.values(state.lines).reduce((sum, line) => sum + line.qty * line.price, 0);

useCartStore.subscribe((state) => {
  writeSession('jimmys-cart', JSON.stringify(Object.fromEntries(Object.values(state.lines).map((line) => [line.name, line.qty]))));
});
