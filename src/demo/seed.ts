// Fictional records for the sales demo.
//
// Every name reads as made up, every email is @example.com, and every phone
// number is +27 00 000 00xx, which no South African line can have. Dishes and
// prices are Jimmy's real menu, because the demo shows their real design; the
// people and the orders are invented.
//
// Records are placed relative to the moment the demo loads, so "today" always
// has a live kitchen queue and a service to run, whatever day it is presented.

import type { Booking, Customer, OrderWithItems } from '../core/data';
import { restaurantDate } from '../core/tenant';
import { addDays } from '../lib/tradingHours';

export interface DemoRecords {
  orders: OrderWithItems[];
  bookings: Booking[];
  customers: Customer[];
}

type Guest = { key: string; name: string; email: string; phone: string };

const guests: Guest[] = [
  ['lerato', 'Lerato Sample'],
  ['pieter', 'Pieter Example'],
  ['aisha', 'Aisha Placeholder'],
  ['johan', 'Johan Testcase'],
  ['nomsa', 'Nomsa Fictional'],
  ['sam', 'Sam Demo'],
  ['ravi', 'Ravi Example'],
  ['megan', 'Megan Placeholder'],
].map(([key, name], index) => ({
  key,
  name,
  email: `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
  phone: `+27 00 000 00${String(index + 1).padStart(2, '0')}`,
}));

const idFor = (prefix: 'c' | 'o' | 'b' | 'i', n: number): string =>
  `d${{ c: '1', o: '2', b: '3', i: '4' }[prefix]}000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

type Line = [name: string, qty: number, price: number];

export function createSeed(now: Date = new Date()): DemoRecords {
  const today = restaurantDate(now);
  const minutes = (m: number) => new Date(now.getTime() + m * 60000).toISOString();
  const guest = (key: string) => guests.find((item) => item.key === key)!;
  const customerId = (key: string) => idFor('c', guests.findIndex((item) => item.key === key) + 1);

  let itemCounter = 0;
  const order = (
    n: number, status: OrderWithItems['status'], key: string, lines: Line[],
    requestedMinutes: number, createdMinutes: number,
    extra: Partial<OrderWithItems> = {},
  ): OrderWithItems => {
    const id = idFor('o', n);
    const who = guest(key);
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
      requested_time: minutes(requestedMinutes),
      total: lines.reduce((sum, [, qty, price]) => sum + qty * price, 0),
      status,
      marketing_consent: false,
      created_at: minutes(createdMinutes),
      updated_at: minutes(Math.min(0, createdMinutes + 2)),
      order_items: lines.map(([name, qty, unit_price]) => ({ id: idFor('i', ++itemCounter), order_id: id, name, qty, unit_price })),
      ...extra,
    };
  };

  const orders: OrderWithItems[] = [
    order(1, 'new', 'pieter', [['Smash Burger', 2, 100], ['Loaded Fries', 1, 60]], 25, -3),
    order(2, 'new', 'sam', [['Chicken Burger', 1, 90], ['Coke', 1, 25]], 40, -1),
    order(3, 'accepted', 'lerato', [['Gourmet Burger', 1, 130], ['Plate of Fries', 1, 45], ['Coke Zero', 1, 25]], 15, -12),
    order(4, 'preparing', 'johan', [['Warrior Platter', 1, 350]], 10, -25, { order_type: 'table', table_number: '7' }),
    order(5, 'ready', 'aisha', [['Beef Burger', 2, 90], ['Sprite', 2, 25]], -2, -35),
    order(6, 'completed', 'lerato', [['Chicken Burger', 1, 90]], -165, -180),
    order(7, 'completed', 'nomsa', [['Nacho Burger', 1, 130], ['Appletiser', 1, 30]], -1440 - 60, -1440 - 80),
    order(8, 'completed', 'lerato', [['Smash Burger', 1, 100], ['Heineken 0.0', 1, 30]], -4320 - 30, -4320 - 50),
    order(9, 'cancelled', 'ravi', [['Chicken Wings', 1, 90]], -1440 - 200, -1440 - 230),
  ];

  const booking = (
    n: number, status: Booking['status'], key: string, dayOffset: number, time: string,
    guestsCount: number, seating: string, notes: string | null, createdMinutes: number,
  ): Booking => {
    const who = guest(key);
    return {
      id: idFor('b', n),
      customer_id: customerId(key),
      name: who.name,
      email: who.email,
      phone: who.phone,
      guests: guestsCount,
      booking_date: addDays(today, dayOffset),
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
    booking(1, 'pending', 'megan', 0, '18:30', 4, 'Inside', 'Birthday dinner, one high chair please (fictional request).', -45),
    booking(2, 'pending', 'aisha', 0, '19:00', 2, 'Outside', null, -20),
    booking(3, 'confirmed', 'pieter', 0, '12:30', 6, 'No preference', null, -1440),
    booking(4, 'confirmed', 'lerato', 0, '19:30', 3, 'Inside', null, -600),
    booking(5, 'cancelled', 'ravi', 0, '20:00', 2, 'No preference', null, -900),
    booking(6, 'pending', 'nomsa', 1, '18:00', 5, 'Outside', null, -90),
    booking(7, 'confirmed', 'johan', 3, '13:00', 8, 'Inside', 'Team lunch (fictional request).', -2880),
    booking(8, 'confirmed', 'lerato', -2, '19:00', 2, 'Inside', null, -4320),
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
