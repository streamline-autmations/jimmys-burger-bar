import { create } from 'zustand';

// Cart state for the online-ordering demo. Client-side only — nothing here
// ever touches a backend. Keyed by item name since the menu data (config.ts)
// doesn't carry stable ids.

export type OrderType = 'collection' | 'table';

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

export const useCartStore = create<CartState>((set) => ({
  lines: {},
  orderType: 'collection',
  tableNumber: '',

  add: (name, price) =>
    set((state) => {
      const existing = state.lines[name];
      return {
        lines: {
          ...state.lines,
          [name]: { name, price, qty: (existing?.qty ?? 0) + 1 },
        },
      };
    }),

  remove: (name) =>
    set((state) => {
      const existing = state.lines[name];
      if (!existing) return state;
      if (existing.qty <= 1) {
        const { [name]: _dropped, ...rest } = state.lines;
        return { lines: rest };
      }
      return {
        lines: { ...state.lines, [name]: { ...existing, qty: existing.qty - 1 } },
      };
    }),

  setQty: (name, qty) =>
    set((state) => {
      if (qty <= 0) {
        const { [name]: _dropped, ...rest } = state.lines;
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

export const formatZar = (amount: number): string => `R${Math.round(amount)}`;

export const selectCartLines = (state: CartState): CartLine[] => Object.values(state.lines);
export const selectCartCount = (state: CartState): number =>
  Object.values(state.lines).reduce((sum, line) => sum + line.qty, 0);
export const selectCartTotal = (state: CartState): number =>
  Object.values(state.lines).reduce((sum, line) => sum + line.qty * line.price, 0);
