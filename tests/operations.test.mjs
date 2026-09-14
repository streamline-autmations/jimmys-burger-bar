import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import { load } from '../scripts/lib/load-ts.mjs';

const hours = load('src/lib/tradingHours.ts');
const cart = load('src/lib/cartStore.ts');
const ops = load('src/pages/admin/operations.ts');
const money = load('src/core/domain/money.ts');
const hoursDomain = load('src/core/domain/hours.ts');
const timeDomain = load('src/core/domain/time.ts');
const config = load('src/config.ts').config;
const board = load('src/core/menu/board.ts');
const now = new Date('2026-09-07T08:00:00Z');

test('restaurant dates use SAST at UTC midnight boundary', () => {
  assert.equal(hours.restaurantDate(new Date('2026-09-07T22:30:00Z')), '2026-09-08');
  assert.equal(hours.restaurantInstant('2026-09-07', '11:00').toISOString(), '2026-09-07T09:00:00.000Z');
});
test('opening hours, exclusive close, midnight, invalid date, Sunday, past time', () => {
  assert.equal(hours.requestedTimeError('2026-09-07', '11:00', now), null);
  for (const [date, time] of [['2026-09-07', '08:59'], ['2026-09-07', '20:00'], ['2026-09-07', '10:00'], ['2026-09-06', '11:00'], ['2026-02-30', '11:00'], ['2026-09-07', '25:00']]) assert.ok(hours.requestedTimeError(date, time, now));
  assert.equal(hours.requestedTimeError('2026-09-11', '23:59', now), null);
  assert.equal(hours.latestTime('20:00'), '19:59');
  assert.equal(hours.latestTime('24:00'), '23:59');
});
test('contact validation does not accept whitespace names or malformed details', () => {
  assert.ok(hours.contactError(' ', '0110000000', 'guest@example.com'));
  assert.ok(hours.contactError('Fictional guest', 'bad', 'guest@example.com'));
  assert.ok(hours.contactError('Fictional guest', '0110000000', 'bad'));
  assert.equal(hours.contactError('Fictional guest', '+27 11 000 0000', 'guest@example.com'), null);
});
test('cart quantities, totals, removal and decimal currency', () => {
  // Cart lines are MINOR UNITS: a R100 burger is 10000.
  const R100 = 10000;
  const store = cart.useCartStore;
  store.getState().clear();
  store.getState().add('Smash Burger', R100);
  store.getState().add('Smash Burger', R100);
  store.getState().add('Invalid', NaN);
  assert.equal(cart.selectCartTotal(store.getState()), 2 * R100);
  assert.equal(cart.formatCartMoney(cart.selectCartTotal(store.getState())), 'R200');
  store.getState().setQty('Smash Burger', 2.5);
  assert.equal(cart.selectCartCount(store.getState()), 2);
  store.getState().remove('Smash Burger');
  assert.equal(cart.selectCartTotal(store.getState()), R100);
  store.getState().remove('Smash Burger');
  assert.equal(cart.selectCartCount(store.getState()), 0);
  assert.equal(cart.formatCartMoney(2550), 'R25.50');
});
test('staff transitions prevent skipping stages and reopening terminal records', () => {
  assert.deepEqual(ops.nextStatuses('new'), ['accepted', 'cancelled']);
  assert.deepEqual(ops.nextStatuses('ready'), ['completed', 'cancelled']);
  assert.deepEqual(ops.nextStatuses('completed'), []);
  assert.deepEqual(ops.nextStatuses('cancelled'), []);
  assert.deepEqual(ops.nextStatuses('pending'), ['confirmed', 'cancelled']);
});
test('search matches all terms, contact and reference without case sensitivity', () => {
  assert.ok(ops.matchesSearch('DEMO guest', 'Fictional guest', 'DEMO-001'));
  assert.ok(ops.matchesSearch('example.com', null, 'guest@example.com'));
  assert.ok(!ops.matchesSearch('missing', 'Fictional guest'));
});

test('booking display dates remain the restaurant date on an overseas device', () => {
  const original = process.env.TZ;
  try {
    process.env.TZ = 'Asia/Tokyo';
    const admin = load('src/pages/admin/adminUtils.ts');
    assert.match(admin.formatBookingDate('2026-09-07'), /^0?7 /);
  } finally { if (original === undefined) delete process.env.TZ; else process.env.TZ = original; }
});

// ---------------------------------------------------------------------------
// Phase 2 domain layer. These lock in the behaviour the refactor had to
// preserve exactly, plus the traps it exists to remove.
// ---------------------------------------------------------------------------

test('money formats exactly as the printed menu writes it, not as Intl guesses', () => {
  const format = money.createMoneyFormatter(money.ZAR);
  // Intl.NumberFormat('en-ZA', {currency:'ZAR'}) yields "R 120,00" - a space and
  // a comma. Every price on the live site reads "R120", so the formatter is
  // explicit rather than locale-derived.
  assert.equal(format(money.toMinor(120)), 'R120');
  assert.equal(format(money.toMinor(25.5)), 'R25.50');
  assert.equal(format(money.toMinor(0)), 'R0');
  assert.equal(format(money.toMinor(1234.05)), 'R1234.05');
});

test('money is exact in minor units where floats were not', () => {
  // 0.1 + 0.2 in the old float model. Three items at R0.10 must be R0.30.
  const line = money.toMinor(0.1);
  assert.equal(line * 3, money.toMinor(0.3));
  assert.equal(money.toMinor(25.505), 2551); // rounds, never truncates toward a lost cent
  assert.equal(money.fromMinor(10000), 100);
});

test('currency is configurable, so a non-ZAR tenant is a config change', () => {
  const euro = { code: 'EUR', symbol: ' EUR', position: 'after', decimalSeparator: ',',
                 thousandsSeparator: '.', hideZeroCents: false };
  const format = money.createMoneyFormatter(euro);
  assert.equal(format(money.toMinor(1234.5)), '1.234,50 EUR');
});

test('every config price survived the string-to-number conversion', () => {
  const format = money.createMoneyFormatter(config.currency);
  const priced = [
    ...config.menu.categories.flatMap((c) => c.items),
    ...config.drinks.categories.flatMap((c) => c.items),
    ...config.ordering.nonAlcoholicDrinks,
  ];
  assert.ok(priced.length >= 80, `expected the full menu, got ${priced.length}`);
  for (const item of priced) {
    assert.equal(typeof item.price, 'number', `${item.name} price is not a number`);
    assert.ok(item.price > 0, `${item.name} price is not positive`);
    // Formatting must still produce a plain "R<amount>" with no stray separators.
    assert.match(format(money.toMinor(item.price)), /^R\d+(\.\d{2})?$/, item.name);
  }
});

test('hours are structured, so the en-dash parsing trap is gone', () => {
  // The old model regex-matched "09:00 – 20:00" and required an EN-DASH.
  // A hyphen made the day read as closed and disabled booking and ordering.
  const schedule = hoursDomain.createHours(config.venue.hours, config.venue.closures);
  assert.deepEqual(schedule.hoursFor('2026-09-07'), { open: '09:00', close: '20:00' }); // Monday
  assert.deepEqual(schedule.hoursFor('2026-09-11'), { open: '09:00', close: '24:00' }); // Friday, midnight close
  assert.equal(schedule.hoursFor('2026-09-13'), null);                                   // Sunday, closed
  assert.equal(schedule.hoursFor('not-a-date'), null);
  assert.equal(schedule.hoursFor('2026-02-30'), null);                                   // real calendar check
});

test('display hours are derived from structure, never parsed back', () => {
  const schedule = hoursDomain.createHours(config.venue.hours, config.venue.closures);
  assert.equal(schedule.displayHours(config.venue.hours[0]), '09:00 – 20:00');
  assert.equal(schedule.displayHours(config.venue.hours[3]), 'Closed');
  assert.equal(schedule.latestTime('24:00'), '23:59');
  assert.equal(schedule.latestTime('20:00'), '19:59');
});

test('dated closures override the weekly schedule in both directions', () => {
  const schedule = hoursDomain.createHours(config.venue.hours, [
    { date: '2026-12-25', reason: 'Christmas Day' },
    { date: '2026-10-04', reason: 'Coffee & Cars', open: '09:00', close: '14:00' },
  ]);
  assert.equal(schedule.hoursFor('2026-12-25'), null, 'a holiday closes an ordinary trading day');
  assert.deepEqual(schedule.hoursFor('2026-10-04'), { open: '09:00', close: '14:00' },
    'an event opens a normally closed Sunday');
});

test('restaurant instants are derived from the IANA zone, not a fixed offset', () => {
  const sast = timeDomain.createTimeHelpers({ timeZone: 'Africa/Johannesburg', locale: 'en-ZA' });
  assert.equal(sast.restaurantInstant('2026-09-07', '11:00').toISOString(), '2026-09-07T09:00:00.000Z');

  // The real point: a DST-observing tenant. London is +01:00 in September and
  // +00:00 in January. A hardcoded offset would be an hour out for half the year.
  const london = timeDomain.createTimeHelpers({ timeZone: 'Europe/London', locale: 'en-GB' });
  assert.equal(london.restaurantInstant('2026-09-07', '12:00').toISOString(), '2026-09-07T11:00:00.000Z');
  assert.equal(london.restaurantInstant('2026-01-07', '12:00').toISOString(), '2026-01-07T12:00:00.000Z');
});

test('day bounds stay correct across a DST transition', () => {
  const london = timeDomain.createTimeHelpers({ timeZone: 'Europe/London', locale: 'en-GB' });
  // 25 October 2026 is a 25-hour day in the UK. A fixed +86400000ms step is wrong.
  const bounds = london.restaurantDayBounds('2026-10-25');
  const span = (new Date(bounds.end) - new Date(bounds.start)) / 3600000;
  assert.equal(span, 25, 'the long DST day must be 25 hours, not 24');
});

test('menu boards convert config decimals into minor units', () => {
  // Regression. The food board spread the config item verbatim, carrying a
  // DECIMAL price into a field holding minor units, so every R60 dish rendered
  // as R0.60. Nothing threw; it just showed customers the wrong prices.
  const format = money.createMoneyFormatter(config.currency);
  const food = board.buildBoard(config.menu.categories);
  const drinks = board.buildBoard(config.drinks.categories);

  const first = food[0].items[0];
  assert.equal(first.price, money.toMinor(config.menu.categories[0].items[0].price));
  assert.equal(format(first.price), 'R60', 'Breakfast Bun must render R60, not R0.60');

  for (const category of [...food, ...drinks]) {
    for (const item of category.items) {
      assert.ok(item.price >= 100, `${item.name} priced under R1 - decimals leaked in as minor units`);
      assert.equal(item.price % 1, 0, `${item.name} price must be a whole number of minor units`);
    }
  }
});

test('drinks detail is flattened onto description so the board has one shape', () => {
  const drinks = board.buildBoard(config.drinks.categories);
  const castle = drinks.flatMap((c) => c.items).find((i) => i.name === 'Castle Lager');
  assert.equal(castle.description, 'The local');
});

// ---------------------------------------------------------------------------
// Phase 3: per-field validation, orderable days, and what a failed submission
// means for the customer.
// ---------------------------------------------------------------------------

const submission = load('src/core/data/submission.ts');
const timeout = load('src/core/data/timeout.ts');

test('contact errors are reported against the field they belong to', () => {
  assert.deepEqual(hours.contactFieldErrors('Fictional guest', '+27 11 000 0000', 'guest@example.com'), {});
  const empty = hours.contactFieldErrors(' ', '', '');
  assert.deepEqual(Object.keys(empty).sort(), ['email', 'name', 'phone']);
  const bad = hours.contactFieldErrors('Fictional guest', '12', 'guest@');
  assert.deepEqual(Object.keys(bad).sort(), ['email', 'phone']);
  assert.notEqual(empty.phone, bad.phone, 'missing and malformed read differently');
});

test('a closed day is reported on the date, a bad time on the time', () => {
  // 2026-09-07 is a Monday (09:00-20:00); 2026-09-06 a Sunday (closed).
  assert.deepEqual(Object.keys(hours.slotFieldErrors('2026-09-06', '11:00', now)), ['date']);
  assert.deepEqual(Object.keys(hours.slotFieldErrors('2026-09-07', '21:00', now)), ['time']);
  assert.deepEqual(Object.keys(hours.slotFieldErrors('2026-09-07', '', now)), ['time']);
  assert.deepEqual(Object.keys(hours.slotFieldErrors('', '', now)), ['date']);
  assert.deepEqual(hours.slotFieldErrors('2026-09-07', '11:00', now), {});
});

test('orderable days skip closed days and a day whose last slot has passed', () => {
  // Monday 08:00 SAST: today is open and bookable.
  const morning = hours.openDates(7, new Date('2026-09-07T06:00:00Z'));
  assert.equal(morning[0], '2026-09-07');
  assert.ok(!morning.includes('2026-09-13'), 'Sunday is closed');
  assert.equal(morning.length, 7, 'eight calendar days minus one Sunday');

  // Monday 20:30 SAST: Monday closed at 20:00, so the first option is Tuesday.
  const evening = hours.openDates(7, new Date('2026-09-07T18:30:00Z'));
  assert.equal(evening[0], '2026-09-08');

  // Today only, after close: nothing to order for.
  assert.deepEqual(hours.openDates(0, new Date('2026-09-07T18:30:00Z')), []);
  assert.equal(hours.addDays('2026-12-31', 1), '2027-01-01');
});

test('a refused submission is definite; a lost response is uncertain', () => {
  const kind = (error, constraint) => {
    const result = submission.classifySubmission(error, constraint);
    return result === 'saved' ? 'saved' : result.kind;
  };
  assert.equal(kind(new timeout.TimeoutError(15000)), 'uncertain');
  assert.equal(kind({ code: '', message: 'TypeError: Failed to fetch' }), 'uncertain');
  assert.equal(kind({ code: '', message: 'Bad gateway' }), 'uncertain');
  assert.equal(kind({ code: 'P0001', message: 'order total does not match its items' }), 'rejected');
  assert.equal(kind({ code: 'P0001', message: 'too many booking requests from this contact. Please phone the restaurant.' }), 'throttled');
  assert.equal(kind({ code: '23514', message: 'violates check constraint' }), 'rejected');
  assert.equal(kind({ code: '42501', message: 'permission denied' }), 'rejected');
});

test('only a collision on the request\'s own key proves it was saved', () => {
  const pk = { code: '23505', message: 'duplicate key value violates unique constraint "bookings_pkey"' };
  assert.equal(submission.classifySubmission(pk, 'bookings_pkey'), 'saved');
  // Before the Phase 3 migration a returning guest's phone collided in customers
  // and rolled the whole order back with the same SQLSTATE. That is NOT saved.
  const phone = { code: '23505', message: 'duplicate key value violates unique constraint "customers_phone_key"' };
  assert.equal(submission.classifySubmission(phone, 'orders_order_no_key').kind, 'rejected');
});

test('every orderable category cutoff is a valid 24h time', () => {
  for (const category of config.menu.categories) {
    if (category.availableUntil) assert.match(category.availableUntil, /^([01]\d|2[0-3]):[0-5]\d$/, category.name);
  }
  assert.ok(Number.isInteger(config.ordering.maxDaysAhead));
});

// ---------------------------------------------------------------------------
// Server-side menu price list. The database prices every order from
// public.menu_items, generated from this config. If they drift, orders for the
// changed dishes are refused, so drift must fail here first.
// ---------------------------------------------------------------------------

const orderable = load('src/core/menu/orderable.ts');
const { resolveCopy } = load('src/core/config/copy.ts');

const orderableFromConfig = () => {
  const copyForTenant = resolveCopy(config.copy);
  return orderable.orderableItems(orderable.orderableCategories(config.menu.categories, {
    label: copyForTenant.order.softDrinksLabel,
    note: copyForTenant.order.softDrinksNote,
    items: config.ordering.nonAlcoholicDrinks,
  }));
};

test('the committed menu seed matches the config (run npm run menu:sql if this fails)', () => {
  const expected = orderable.menuItemsSql(orderableFromConfig(), config.slug);
  const committed = fs.readFileSync(`supabase/seed/menu.${config.slug}.sql`, 'utf8');
  assert.equal(committed, expected, 'menu seed is stale: regenerate it AND apply it to the database');
});

test('orderable item names are unique, because the server prices by name', () => {
  const names = orderableFromConfig().map((item) => item.name);
  assert.equal(new Set(names).size, names.length);
  assert.throws(() => orderable.menuItemsSql([
    { name: 'Dup', category: 'A', price: 1, availableUntil: null },
    { name: 'Dup', category: 'B', price: 2, availableUntil: null },
  ], 'test'), /Duplicate/);
});

test('seed prices round exactly as the cart does', () => {
  const [item] = orderable.orderableItems([{ name: 'Odd', items: [{ name: 'Odd', price: 25.505 }] }]);
  assert.equal(item.price, money.fromMinor(money.toMinor(25.505)));
});

test('menu seed escapes quotes and keeps decimal prices exact', () => {
  const sql = orderable.menuItemsSql([{ name: "Jimmy's Breakfast", category: 'Breakfast', price: 25.5, availableUntil: '12:00' }], 'test');
  assert.match(sql, /'Jimmy''s Breakfast', 'Breakfast', 25\.50, '12:00'/);
});

test('server refusals carry a reason the customer can act on', () => {
  const reason = (message) => submission.classifySubmission({ code: 'P0001', message }).reason;
  assert.equal(reason('menu price changed: Smash Burger'), 'menu');
  assert.equal(reason('menu item unavailable: Free Lobster'), 'menu');
  assert.equal(reason('menu item not served at that time: Breakfast Bun'), 'served');
  assert.equal(reason('requested time is in the past'), 'time');
  assert.equal(reason('order total does not match its items'), undefined);
});
