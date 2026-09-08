import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';

// Use the project's existing TypeScript compiler, without adding a test framework.
const cache = new Map();
function load(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  cache.set(file, module);
  const nativeRequire = createRequire(file);
  const require = (name) => name.startsWith('.') ? load(path.resolve(path.dirname(file), `${name}.ts`)) : nativeRequire(name);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: file })(require, module, module.exports);
  return module.exports;
}
const hours = load('src/lib/tradingHours.ts');
const cart = load('src/lib/cartStore.ts');
const ops = load('src/pages/admin/operations.ts');
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
  const store = cart.useCartStore;
  store.getState().clear();
  store.getState().add('Smash Burger', 100);
  store.getState().add('Smash Burger', 100);
  store.getState().add('Invalid', NaN);
  assert.equal(cart.selectCartTotal(store.getState()), 200);
  store.getState().setQty('Smash Burger', 2.5);
  assert.equal(cart.selectCartCount(store.getState()), 2);
  store.getState().remove('Smash Burger');
  assert.equal(cart.selectCartTotal(store.getState()), 100);
  store.getState().remove('Smash Burger');
  assert.equal(cart.selectCartCount(store.getState()), 0);
  assert.equal(cart.formatZar(25.50), 'R25.50');
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
