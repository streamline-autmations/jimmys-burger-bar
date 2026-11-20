// Extras ("Extra Bacon") on dishes: the pure rules the cart, the price list generator
// and the receipt/WhatsApp text share. The database side (create_order refusing a
// wrong extra price and so on) is in database.test.mjs and payments.test.mjs.
import assert from 'node:assert/strict';
import { test, beforeEach } from 'node:test';
import { load, loadWithEnv } from '../scripts/lib/load-ts.mjs';

const extras = load('src/core/menu/extras.ts');
const orderable = load('src/core/menu/orderable.ts');
const { jimmys } = load('src/tenants/jimmys/config.ts');
const { config: staging } = load('src/tenants/jimmys-staging/config.ts');
const { resolveCopy } = load('src/core/config/copy.ts');
const cart = load('src/lib/cartStore.ts');
const { rebuildCart } = load('src/lib/orderHistory.ts');
const { buildOrderWhatsAppUrl } = load('src/lib/orderMessage.ts');

const BACON = { name: 'Extra Bacon', price: 2500 };
const EGG = { name: 'Extra Egg', price: 2000 };
const itemsOf = (config) => orderable.orderableItems(orderable.orderableCategories(config.menu.categories, {
  label: resolveCopy(config.copy).order.softDrinksLabel,
  note: resolveCopy(config.copy).order.softDrinksNote,
  items: config.ordering.nonAlcoholicDrinks,
}));

test('the same dish with different extras is a different line; the order of ticking does not matter', () => {
  assert.equal(extras.lineKey('Smash Burger', []), 'Smash Burger', 'a plain dish keeps its name as its key');
  assert.notEqual(extras.lineKey('Smash Burger', [BACON]), extras.lineKey('Smash Burger', [EGG]));
  assert.equal(extras.lineKey('Smash Burger', [BACON, EGG]), extras.lineKey('Smash Burger', [EGG, BACON]));
  assert.notEqual(extras.lineKey('Smash Burger', [BACON]), extras.lineKey('Smash Burger', []));
});

test('picked extras keep the dish order and drop anything it does not offer', () => {
  const offered = [{ name: 'Extra Bacon', price: 25 }, { name: 'Extra Egg', price: 20 }];
  assert.deepEqual(extras.pickExtras(offered, ['Extra Egg', 'Extra Bacon', 'Extra Lobster']), [BACON, EGG]);
  assert.equal(extras.unitPrice({ price: 10000, extras: [BACON, EGG] }), 14500);
});

test('saved and server-sent extras are read defensively, and lines total to the cent', () => {
  assert.deepEqual(extras.readExtras(null), []);
  assert.deepEqual(extras.readExtras('Extra Bacon'), []);
  assert.deepEqual(extras.readExtras([{ name: 'Extra Bacon', price: 25 }, 7, { price: 1 }, 'Extra Egg']), [{ name: 'Extra Bacon', price: 25 }, { name: 'Extra Egg', price: 0 }]);
  assert.equal(extras.storedLineTotal({ qty: 3, unit_price: 25.5, extras: [{ name: 'a', price: 0.1 }, { name: 'b', price: 0.2 }] }), 77.4, '3 x (25.50 + 0.10 + 0.20), no float drift');
  assert.equal(extras.describeLine({ qty: 2, name: 'Beef Burger', extras: [{ name: 'Extra Bacon', price: 25 }, { name: 'Extra Egg', price: 20 }] }), '2× Beef Burger (+ Extra Bacon, Extra Egg)');
  assert.equal(extras.describeLine({ qty: 1, name: 'Coke' }, 'x'), '1x Coke');
});

test('config: extras are validated at load', () => {
  assert.deepEqual(extras.extrasProblems('dish', [{ name: 'A', price: 5 }]), []);
  assert.equal(extras.extrasProblems('dish', [{ name: 'A', price: 5 }, { name: 'A', price: 6 }]).length, 1, 'a repeated name');
  assert.equal(extras.extrasProblems('dish', [{ name: 'A', price: 0 }]).length, 1, 'a free extra');
  assert.equal(extras.extrasProblems('dish', [{ name: 'A', price: 99999 }]).length, 1, 'an absurd price');
});

test("Live offers standalone extras only; preview tenants customise at board prices", () => {
  const board = new Map(jimmys.menu.categories.filter((category) => category.name === 'Extras' || category.name === 'Extra Sauces').flatMap((category) => category.items.map((item) => [item.name, item.price])));
  assert.ok(board.size >= 20, 'the Extras boards are still on the menu');
  assert.ok(itemsOf(jimmys).every((item) => item.extras.length === 0));
  for (const config of [load('src/demo/config.ts').config, staging]) {
    const items = new Map(itemsOf(config).map((item) => [item.name, item]));
    assert.deepEqual(items.get('Beef Burger').extras.find((extra) => extra.name === 'Extra Bacon'), { name: 'Extra Bacon', price: 25 });
    assert.ok(items.get('Jimmy\'s Breakfast').extras.length > 0);
    assert.deepEqual(items.get('200g Rump Steak').extras.map((extra) => extra.name), ['Extra Cheese Sauce', 'Extra Pepper Sauce', 'Extra Mushroom Sauce']);
    assert.deepEqual(items.get('Coke').extras, [], 'drinks offer none');
    for (const item of items.values()) for (const extra of item.extras) assert.equal(extra.price, board.get(extra.name), `${item.name}: ${extra.name} costs what the printed board says`);
  }
});

test('the price list SQL carries each dish\'s extras and refuses a repeated one', () => {
  const sql = orderable.menuItemsSql([{ name: 'Smash Burger', category: 'Burgers', price: 110, availableUntil: null, extras: [{ name: 'Extra Bacon', price: 25 }] }, { name: 'Coke', category: 'Drinks', price: 22, availableUntil: null, extras: [] }], 'test');
  assert.match(sql, /\('Smash Burger', 'Burgers', 110\.00, null, '\[\{"name":"Extra Bacon","price":25\}\]'::jsonb\)/);
  assert.match(sql, /\('Coke', 'Drinks', 22\.00, null, '\[\]'::jsonb\)/);
  assert.match(sql, /extras = excluded\.extras/, 'a re-run replaces the extras, so a removed extra stops being orderable');
  assert.throws(() => orderable.menuItemsSql([{ name: 'X', category: 'C', price: 1, availableUntil: null, extras: [{ name: 'E', price: 1 }, { name: 'E', price: 1 }] }], 't'), /Duplicate extra/);
});

beforeEach(() => cart.useCartStore.getState().clear());

test('cart: extras make separate lines, price live, and customising merges with an identical line', () => {
  const store = cart.useCartStore;
  store.getState().add('Smash Burger', 11000);
  store.getState().add('Smash Burger', 11000, [BACON]);
  store.getState().add('Smash Burger', 11000, [BACON]);
  const lines = cart.selectCartLines(store.getState());
  assert.equal(lines.length, 2, 'plain and with-bacon are different lines');
  assert.equal(cart.selectCartCount(store.getState()), 3);
  assert.equal(cart.selectCartTotal(store.getState()), 11000 + 2 * (11000 + 2500), 'the total counts extras on every unit');

  // Customising the plain line to bacon merges it into the existing bacon line.
  store.getState().setExtras('Smash Burger', [BACON]);
  const merged = cart.selectCartLines(store.getState());
  assert.equal(merged.length, 1);
  assert.equal(merged[0].qty, 3);
  assert.deepEqual(merged[0].extras, [BACON]);

  // Adding an extra to a single line re-keys it in place.
  store.getState().setExtras(merged[0].key, [BACON, EGG]);
  const [line] = cart.selectCartLines(store.getState());
  assert.equal(line.qty, 3);
  assert.equal(cart.selectCartTotal(store.getState()), 3 * (11000 + 4500));

  store.getState().remove(line.key);
  assert.equal(cart.selectCartLines(store.getState())[0].qty, 2, 'remove works on the line key');
  store.getState().setQty(line.key, 0);
  assert.equal(cart.selectCartCount(store.getState()), 0);
});

test('order again keeps the extras a dish still offers and names the ones it does not', () => {
  const smash = { name: 'Smash Burger', price: 11000, extras: [{ name: 'Extra Bacon', price: 25 }] };
  const { lines, skipped } = rebuildCart(
    [{ name: 'Smash Burger', qty: 1, extras: ['Extra Bacon', 'Extra Truffle'] }, { name: 'Smash Burger', qty: 2, extras: ['Extra Bacon'] }, { name: 'Smash Burger', qty: 1 }],
    [smash],
  );
  assert.deepEqual(lines.map((line) => [line.name, line.qty, line.extras.map((extra) => extra.name)]), [['Smash Burger', 3, ['Extra Bacon']], ['Smash Burger', 1, []]]);
  assert.equal(lines[0].extras[0].price, 2500, 'priced from today\'s menu');
  assert.deepEqual(skipped, ['Extra Truffle on Smash Burger'], 'a dropped extra is named, never silently lost');
});

test('the WhatsApp order text lists extras and the line total includes them', () => {
  const url = buildOrderWhatsAppUrl({
    orderNo: 'JB-1120-TEST', name: 'Test', orderType: 'collection', tableNumber: '', total: 29000,
    lines: [{ key: 'k', name: 'Beef Burger', price: 10000, qty: 2, extras: [BACON, EGG] }],
  });
  const text = decodeURIComponent(url.split('?text=')[1]);
  assert.match(text, /2x Beef Burger \(\+ Extra Bacon, Extra Egg\): R290/);
  assert.match(text, /Total: R290/);
});

test('a saved cart restores: the old name-and-quantity format, and extras re-priced from today\'s menu', () => {
  const saved = new Map();
  globalThis.sessionStorage = { getItem: (key) => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value), removeItem: (key) => saved.delete(key) };
  try {
    const restore = (value) => {
      saved.set('jimmys-staging-cart', JSON.stringify(value));
      return loadWithEnv('src/lib/cartStore.ts', { VITE_TENANT: 'jimmys-staging' }).selectCartLines(loadWithEnv('src/lib/cartStore.ts', { VITE_TENANT: 'jimmys-staging' }).useCartStore.getState());
    };
    // Before extras the session held { dish name: quantity }.
    const old = restore({ 'Smash Burger': 2, 'Retired Burger': 1, Coke: 100 });
    assert.deepEqual(old.map((line) => [line.name, line.qty, line.extras.length]), [['Smash Burger', 2, 0]], 'unknown dishes and out-of-range quantities are dropped');

    // Now { line key: { n, q, x } }. A tampered price cannot survive, and an extra the dish does not offer is dropped.
    const next = restore({
      a: { n: 'Smash Burger', q: 1, x: ['Extra Bacon', 'Extra Lobster'], price: 1 },
      b: { n: 'Smash Burger', q: 2, x: [] },
      c: { n: '200g Rump Steak', q: 1, x: ['Extra Bacon'] },
    });
    assert.deepEqual(next.map((line) => [line.name, line.qty, line.extras.map((extra) => extra.name), line.price]), [
      ['Smash Burger', 1, ['Extra Bacon'], 11000],
      ['Smash Burger', 2, [], 11000],
      ['200g Rump Steak', 1, [], 14000],
    ]);
  } finally {
    delete globalThis.sessionStorage;
  }
});
