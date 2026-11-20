import { jimmys } from '../jimmys/config';

const board = jimmys.menu.categories
  .filter(({ name }) => name === 'Extras' || name === 'Extra Sauces')
  .flatMap(({ items }) => items);
const extrasNamed = (...names: string[]) =>
  names.map((name) => {
    const found = board.find((extra) => extra.name === name);
    if (typeof found?.price !== 'number') throw new Error(`extrasNamed: "${name}" is not on the Extras boards`);
    return { name: found.name, price: found.price };
  });

// Preview only: Jimmy's has not confirmed which toppings accompany which dishes.
// These example pairings are available only in staging and the sales demo.
const breakfastExtras = extrasNamed("Extra Bacon", "Extra Egg", "Extra Toast", "Extra Cheese Griller", "Extra Hashbrown", "Extra Vienna", "Extra Pork Banger", "Extra Tomato");
const burgerExtras = extrasNamed("Extra Patty", "Extra Bacon", "Extra Egg", "Extra Cheese Slice", "Extra Cheddar", "Extra Mozzarella", "Extra Feta", "Extra Cream Cheese", "Extra Jalapeños", "Extra Avocado", "Extra Mushroom", "Extra Guacamole", "Extra Tomato");
const sauceExtras = extrasNamed("Extra Cheese Sauce", "Extra Pepper Sauce", "Extra Mushroom Sauce");

const pairings = new Map([
  ['Breakfast', breakfastExtras],
  ['Burgers', burgerExtras],
  ['Chicken Meals', sauceExtras],
  ['Steaks', sauceExtras],
]);

export const previewMenu = {
  ...jimmys.menu,
  categories: jimmys.menu.categories.map((category) => ({ ...category, extras: pairings.get(category.name) })),
};
