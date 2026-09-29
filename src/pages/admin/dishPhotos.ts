import { config } from '../../config';
import { copy } from '../../core/tenant';
import { orderableCategories } from '../../core/menu/orderable';

// The photo a guest saw beside a dish when they ordered it, keyed by name.
// Built from the same orderable list as the order page (orderable names are
// unique, a test enforces it), so staff never see a picture the guest did not.
// Dishes without a photo return undefined and render without one.
const photos = new Map(
  orderableCategories(config.menu.categories, {
    label: copy.order.softDrinksLabel,
    note: copy.order.softDrinksNote,
    items: config.ordering.nonAlcoholicDrinks,
  }).flatMap((category) => category.items.filter((item) => item.image).map((item) => [item.name, item.image!] as const)),
);

export const dishPhoto = (name: string): string | undefined => photos.get(name);
