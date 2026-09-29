// Fictional records for the sales demo.
//
// Names read like real guests so the staff console feels like a real service,
// but every email is @example.com and every phone is +27 00 000 00xx, which no
// South African line can have. Dishes and prices come from Jimmy's real menu,
// because the demo shows their real design; the people and orders are invented.
//
// Records are placed relative to the moment the demo loads, so "today" always
// has a live kitchen queue and a service to run, whatever day it is presented.
// The history behind it (earlier today and the six days before) only falls on
// trading days and inside trading hours, and is the same for a given day, so a
// reset shows the same week again.

import type { Booking, Customer, OrderWithItems } from '../core/data';
import { copy, restaurantDate, restaurantInstant } from '../core/tenant';
import { orderableCategories, orderableItems } from '../core/menu/orderable';
import { addDays, latestTime, tradingHours } from '../lib/tradingHours';
import { config } from './config';

export interface DemoRecords {
  orders: OrderWithItems[];
  bookings: Booking[];
  customers: Customer[];
}

type Guest = { key: string; name: string; email: string; phone: string };

// Phones end 01-49. Contacts typed into the demo map to 50-99 (fictionalContact),
// so a prospect's own number can never merge into a seeded guest.
const guests: Guest[] = [
  ['lerato', 'Lerato Mokoena'],
  ['pieter', 'Pieter Botha'],
  ['aisha', 'Aisha Patel'],
  ['johan', 'Johan Venter'],
  ['nomsa', 'Nomsa Dlamini'],
  ['sam', 'Sam Naidoo'],
  ['ravi', 'Ravi Govender'],
  ['megan', 'Megan Smith'],
  ['sipho', 'Sipho Khumalo'],
  ['anri', 'Anri du Plessis'],
  ['kagiso', 'Kagiso Molefe'],
  ['chantel', 'Chantel Pretorius'],
  ['themba', 'Themba Zulu'],
  ['liezl', 'Liezl Coetzee'],
  ['bongani', 'Bongani Mahlangu'],
  ['zanele', 'Zanele Ndlovu'],
].map(([key, name], index) => ({
  key,
  name,
  email: `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
  phone: `+27 00 000 00${String(index + 1).padStart(2, '0')}`,
}));

const idFor = (prefix: 'c' | 'o' | 'b' | 'i', n: number): string =>
  `d${{ c: '1', o: '2', b: '3', i: '4' }[prefix]}000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

// Real menu prices, looked up rather than typed, so a price change cannot leave the demo charging the old one.
const prices = new Map(
  orderableItems(orderableCategories(config.menu.categories, {
    label: copy.order.softDrinksLabel,
    note: copy.order.softDrinksNote,
    items: config.ordering.nonAlcoholicDrinks,
  })).map((item) => [item.name, item.price]),
);
const price = (name: string): number => {
  const found = prices.get(name);
  if (found === undefined) throw new Error(`demo seed: "${name}" is not on the orderable menu`);
  return found;
};

// What a basket is built from. Breakfast only goes into orders before its cut-off.
const MAINS = ['Smash Burger', 'Smash Burger', 'Beef Burger', 'Chicken Burger', 'Gourmet Burger', 'Nacho Burger', 'Pizza Burger',
  '200g Rump Steak', '300g Jalapeño Steak', 'Chicken Wings', 'Chicken Schnitzel', 'Chicken Strips', 'Burger Salad'];
const BREAKFASTS = ['Breakfast Bun', 'Breakfast Burger', 'Omelette', 'Avo on Toast'];
const SIDES = ['Loaded Fries', 'Plate of Fries', 'Plate of Onion Rings', 'Jalapeño Poppers', 'Nachos'];
const DRINKS = ['Coke', 'Coke Zero', 'Sprite', 'Fanta Orange', 'Appletiser', 'Still Water'];
const PLATTERS = ['Warrior Platter', 'Snack Platter'];
// Regulars come back: the first few guests are drawn far more often.
const WEIGHTED_GUESTS = ['lerato', 'lerato', 'lerato', 'pieter', 'pieter', 'sipho', 'sipho', 'anri', 'nomsa', 'kagiso',
  'chantel', 'themba', 'liezl', 'bongani', 'zanele', 'megan', 'johan', 'sam', 'ravi', 'aisha'];

/** A small deterministic generator, so a given day always seeds the same history. */
function generator(seedText: string) {
  let state = [...seedText].reduce((hash, char) => (Math.imul(hash, 31) + char.charCodeAt(0)) | 0, 2166136261);
  const next = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1));
  const pick = <T,>(items: readonly T[]): T => items[Math.floor(next() * items.length)];
  return { next, int, pick };
}

type Line = [name: string, qty: number];

const toMinutes = (time: string) => { const [h, m] = time.split(':').map(Number); return h * 60 + m; };
const toTime = (minutes: number) => `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

export function createSeed(now: Date = new Date()): DemoRecords {
  const today = restaurantDate(now);
  const random = generator(`jimmys-demo-${today}`);
  const minutes = (m: number) => new Date(now.getTime() + m * 60000).toISOString();
  const guest = (key: string) => guests.find((item) => item.key === key)!;
  const customerId = (key: string) => idFor('c', guests.findIndex((item) => item.key === key) + 1);

  let itemCounter = 0;
  const order = (
    n: number, status: OrderWithItems['status'], key: string, lines: Line[],
    requestedAt: string, createdAt: string, extra: Partial<OrderWithItems> = {},
  ): OrderWithItems => {
    const id = idFor('o', n);
    const who = guest(key);
    const items = lines.map(([name, qty]) => ({ id: idFor('i', ++itemCounter), order_id: id, name, qty, unit_price: price(name) }));
    return {
      id,
      order_no: `JB-DEMO-${String(n).padStart(4, '0')}`,
      customer_id: customerId(key),
      customer_name: who.name,
      email: who.email,
      phone: who.phone,
      order_type: 'collection',
      table_number: null,
      delivery_address: null,
      delivery_notes: null,
      requested_time: requestedAt,
      total: items.reduce((sum, item) => sum + item.qty * item.unit_price, 0),
      status,
      marketing_consent: false,
      created_at: createdAt,
      updated_at: new Date(Math.min(now.getTime(), new Date(createdAt).getTime() + 120000)).toISOString(),
      order_items: items,
      ...extra,
    };
  };

  // The live queue: one order at each stage, timed around the moment the demo opens.
  // JB-DEMO-0003 is Lerato's, which the presenter's "Track an order" jump opens.
  const orders: OrderWithItems[] = [
    order(1, 'new', 'pieter', [['Smash Burger', 2], ['Loaded Fries', 1]], minutes(25), minutes(-3)),
    order(2, 'new', 'sam', [['Chicken Burger', 1], ['Coke', 1]], minutes(40), minutes(-1)),
    order(3, 'accepted', 'lerato', [['Gourmet Burger', 1], ['Plate of Fries', 1], ['Coke Zero', 1]], minutes(15), minutes(-12)),
    order(4, 'preparing', 'johan', [['Warrior Platter', 1]], minutes(10), minutes(-25), { order_type: 'table', table_number: '7' }),
    order(5, 'ready', 'aisha', [['Beef Burger', 2], ['Sprite', 2]], minutes(-2), minutes(-35)),
  ];

  const basket = (localTime: string): Line[] => {
    if (random.next() < 0.06) return [[random.pick(PLATTERS), 1], [random.pick(DRINKS), random.int(2, 4)]];
    const breakfast = localTime < '11:45' && random.next() < 0.45;
    const lines = new Map<string, number>();
    const mains = random.int(1, 3);
    for (let i = 0; i < mains; i += 1) {
      const dish = breakfast ? random.pick(BREAKFASTS) : random.pick(MAINS);
      lines.set(dish, (lines.get(dish) ?? 0) + 1);
    }
    if (random.next() < 0.5) lines.set(random.pick(SIDES), 1);
    if (random.next() < 0.6) lines.set(random.pick(DRINKS), random.int(1, mains));
    return [...lines];
  };

  // History: completed orders through each trading day, a few cancelled, never on a closed day.
  let n = 6;
  const laterThan = minutes(-45);
  for (let offset = -6; offset <= 0; offset += 1) {
    const date = addDays(today, offset);
    const hours = tradingHours(date);
    const last = latestTime(hours?.close);
    if (!hours || !last) continue;
    const open = toMinutes(hours.open) + 30;
    const close = Math.max(open, toMinutes(last) - 30);
    const count = random.int(11, 17);
    const slots = Array.from({ length: count }, () => random.int(open, close)).sort((a, b) => a - b);
    for (const slot of slots) {
      const local = toTime(Math.round(slot / 5) * 5);
      const requested = restaurantInstant(date, local).toISOString();
      // Today's history stops well short of now; the live queue covers the present.
      if (requested >= laterThan) continue;
      const created = new Date(new Date(requested).getTime() - random.int(20, 70) * 60000).toISOString();
      const status = random.next() < 0.05 ? 'cancelled' : 'completed';
      orders.push(order(n, status, random.pick(WEIGHTED_GUESTS), basket(local), requested, created));
      n += 1;
    }
  }

  // Bookings on closed days would never be accepted, so later dates move to the next open day.
  const openDay = (offset: number) => {
    let date = addDays(today, offset);
    for (let tries = 0; offset !== 0 && tries < 7 && !tradingHours(date); tries += 1) date = addDays(date, offset > 0 ? 1 : -1);
    return date;
  };

  const booking = (
    id: number, status: Booking['status'], key: string, dayOffset: number, time: string,
    guestsCount: number, seating: string, notes: string | null, createdMinutes: number,
  ): Booking => {
    const who = guest(key);
    return {
      id: idFor('b', id),
      customer_id: customerId(key),
      name: who.name,
      email: who.email,
      phone: who.phone,
      guests: guestsCount,
      booking_date: openDay(dayOffset),
      booking_time: `${time}:00`,
      seating_preference: seating,
      notes,
      status,
      marketing_consent: false,
      created_at: minutes(createdMinutes),
      updated_at: minutes(createdMinutes),
    };
  };

  const bookings: Booking[] = [
    booking(1, 'pending', 'megan', 0, '18:30', 4, 'Inside', 'Birthday dinner, one high chair please.', -45),
    booking(2, 'pending', 'aisha', 0, '19:00', 2, 'Outside', null, -20),
    booking(3, 'confirmed', 'pieter', 0, '12:30', 6, 'No preference', null, -1440),
    booking(4, 'confirmed', 'sipho', 0, '13:00', 2, 'Outside', null, -300),
    booking(5, 'confirmed', 'lerato', 0, '19:30', 3, 'Inside', null, -600),
    booking(6, 'cancelled', 'ravi', 0, '20:00', 2, 'No preference', null, -900),
    booking(7, 'pending', 'nomsa', 1, '18:00', 5, 'Outside', null, -90),
    booking(8, 'confirmed', 'chantel', 2, '19:00', 4, 'Inside', null, -200),
    booking(9, 'pending', 'kagiso', 2, '12:00', 3, 'No preference', null, -35),
    booking(10, 'confirmed', 'johan', 3, '13:00', 8, 'Inside', 'Team lunch.', -2880),
    booking(11, 'confirmed', 'lerato', -2, '19:00', 2, 'Inside', null, -4320),
    booking(12, 'confirmed', 'anri', -3, '18:30', 6, 'Outside', null, -5760),
  ];

  // Derived from the records, so a guest's history and counts always agree.
  const customers: Customer[] = guests.map((who) => {
    const id = customerId(who.key);
    const touched = [
      ...orders.filter((row) => row.customer_id === id).map((row) => row.created_at),
      ...bookings.filter((row) => row.customer_id === id).map((row) => row.created_at),
    ].sort();
    return {
      id,
      name: who.name,
      email: who.email,
      phone: who.phone,
      created_at: touched[0] ?? minutes(-10080),
      last_interaction_at: touched[touched.length - 1] ?? minutes(-10080),
      interaction_count: touched.length,
      marketing_consent: false,
    };
  });

  return { orders, bookings, customers };
}

/** Every string a demo record can carry, for the check that no real contact slips in. */
export const DEMO_EMAIL_DOMAIN = '@example.com';
