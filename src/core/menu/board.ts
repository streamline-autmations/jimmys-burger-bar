import { menuPrice } from '../tenant';
import type { MenuCategory } from '../config/types';

/**
 * Normalises a config menu or drinks list into the shape the board renders.
 *
 * This exists as a separate, testable function because the conversion it does
 * is exactly the kind that fails silently: the food board previously spread the
 * config item verbatim, carrying a DECIMAL price into a field holding minor
 * units, so every R60 dish rendered as R0.60. Nothing failed - it just quietly
 * showed the wrong prices to customers.
 *
 * Food items describe themselves with `description`; drinks use `detail`. Both
 * are flattened to `description` here so the board has one shape to render.
 */

export interface BoardItem {
  name: string;
  description?: string;
  /** Minor units. */
  price: number;
  popular?: boolean;
  tag?: string;
}

export interface BoardCategory {
  name: string;
  note?: string;
  items: BoardItem[];
}

export function buildBoard(categories: MenuCategory[]): BoardCategory[] {
  return categories.map((category) => ({
    name: category.name,
    note: category.note,
    items: category.items.map((item) => ({
      name: item.name,
      description: item.description ?? item.detail,
      price: menuPrice(item.price),
      popular: item.popular,
      tag: item.tag,
    })),
  }));
}
