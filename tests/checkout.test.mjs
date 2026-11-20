// Checkout: "As soon as possible" (src/lib/asap.ts) and address suggestions
// (src/lib/addressSearch.ts). Pure logic, no database. Jimmy's hours: Mon-Tue 09-20,
// Wed-Thu 09-21, Fri-Sat 09-00, Sunday closed. 2026-11-20 is a Friday, SAST is UTC+2.
import assert from 'node:assert/strict';
import { test, afterEach } from 'node:test';
import { loadWithEnv } from '../scripts/lib/load-ts.mjs';

const env = { VITE_TENANT: 'jimmys' };
const { asapSlot, earliestSlot, openNow } = loadWithEnv('src/lib/asap.ts', env);
const sast = (date, hhmm) => new Date(`${date}T${hhmm}:00+02:00`);
const ask = (now, extra = {}) => ({ now, daysAhead: 7, leadMinutes: 0, ...extra });

test('ASAP is the next quarter hour while the kitchen is open', () => {
  assert.deepEqual(asapSlot(ask(sast('2026-11-20', '12:07'))), { date: '2026-11-20', time: '12:15' });
  assert.deepEqual(asapSlot(ask(sast('2026-11-20', '12:15'))), { date: '2026-11-20', time: '12:30' }, 'a slot at exactly now is already gone');
  assert.deepEqual(asapSlot(ask(sast('2026-11-20', '23:40'))), { date: '2026-11-20', time: '23:45' }, 'Friday runs to midnight');
});

test('the kitchen notice time pushes ASAP later', () => {
  assert.deepEqual(asapSlot(ask(sast('2026-11-20', '12:07'), { leadMinutes: 20 })), { date: '2026-11-20', time: '12:30' });
});

test('ASAP is not offered before opening, after closing, on a closed day or in the last minutes', () => {
  assert.equal(openNow(sast('2026-11-20', '08:50')), false);
  assert.equal(asapSlot(ask(sast('2026-11-20', '08:50'))), null, '10 minutes before opening is still closed');
  assert.deepEqual(earliestSlot(ask(sast('2026-11-20', '08:50'))), { date: '2026-11-20', time: '09:00' }, 'but the opening slot is pre-selected');
  assert.equal(asapSlot(ask(sast('2026-11-22', '12:00'))), null, 'Sunday');
  assert.deepEqual(earliestSlot(ask(sast('2026-11-22', '12:00'))), { date: '2026-11-23', time: '09:00' });
  assert.equal(asapSlot(ask(sast('2026-11-23', '19:55'))), null, 'Monday closes at 20:00, no slot is left');
  assert.deepEqual(earliestSlot(ask(sast('2026-11-23', '19:55'))), { date: '2026-11-24', time: '09:00' });
  assert.equal(asapSlot(ask(sast('2026-11-20', '23:50'))), null, 'Friday closes at midnight');
  assert.deepEqual(earliestSlot(ask(sast('2026-11-20', '23:50'))), { date: '2026-11-21', time: '09:00' });
});

test('a delivery window or a category end time moves the earliest slot, and ASAP is dropped when that is not "now"', () => {
  const delivery = ({ time }) => time >= '11:00' && time < '19:30';
  assert.deepEqual(earliestSlot(ask(sast('2026-11-20', '09:30'), { accept: delivery })), { date: '2026-11-20', time: '11:00' });
  assert.equal(asapSlot(ask(sast('2026-11-20', '09:30'), { accept: delivery })), null);
  assert.deepEqual(asapSlot(ask(sast('2026-11-20', '12:00'), { accept: delivery })), { date: '2026-11-20', time: '12:15' });
  const breakfast = ({ time }) => time < '12:00';
  assert.deepEqual(asapSlot(ask(sast('2026-11-20', '11:40'), { accept: breakfast })), { date: '2026-11-20', time: '11:45' });
  assert.equal(asapSlot(ask(sast('2026-11-20', '11:50'), { accept: breakfast })), null);
  assert.deepEqual(earliestSlot(ask(sast('2026-11-20', '11:50'), { accept: breakfast })), { date: '2026-11-21', time: '09:00' });
});

test('delivery that has not started is not "as soon as possible" unless its first slot is the very next one', () => {
  const delivery = ({ time }) => time >= '11:00' && time < '19:30';
  assert.equal(asapSlot(ask(sast('2026-11-20', '10:40'), { accept: delivery })), null, 'delivery is 20 minutes from starting');
  assert.deepEqual(earliestSlot(ask(sast('2026-11-20', '10:40'), { accept: delivery })), { date: '2026-11-20', time: '11:00' });
  assert.deepEqual(asapSlot(ask(sast('2026-11-20', '10:50'), { accept: delivery })), { date: '2026-11-20', time: '11:00' }, 'the next quarter hour is when delivery starts');
  assert.deepEqual(asapSlot(ask(sast('2026-11-20', '11:03'), { accept: delivery })), { date: '2026-11-20', time: '11:15' });
});

test('no slot at all inside the booking window gives null, not a wrong day', () => {
  assert.equal(earliestSlot(ask(sast('2026-11-20', '12:00'), { accept: () => false })), null);
});

// ---- address suggestions ----

const photon = loadWithEnv('src/lib/addressSearch.ts', {});
const geo = loadWithEnv('src/lib/addressSearch.ts', { VITE_GEOAPIFY_KEY: 'test-key' });
const near = { lat: -26.5615, lon: 28.0216 };
// Shape of a real Geoapify response (format=json) for "6 Laura", trimmed to the fields we read.
const laura = { results: [
  { street: 'Laura Crescent', housenumber: '6', suburb: 'Risiville', city: 'Midvaal Local Municipality', postcode: '1805', result_type: 'building' },
  { street: 'Laura Road', housenumber: '6', suburb: 'Sea Vista', city: 'St. Francis Bay', postcode: '6312', result_type: 'building' },
  { suburb: 'Labram', city: 'Sol Plaatje Local Municipality', postcode: '8300', result_type: 'suburb' },
  { street: 'Laura Crescent', housenumber: '6', suburb: 'Risiville', result_type: 'building' },
  { street: 'Laura Crescent', housenumber: '6', suburb: 'Overstrand Ward 1', city: 'Franskraalstrand', postcode: '7220', result_type: 'building' },
] };

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });
const mockFetch = (body, status = 200) => {
  const calls = [];
  globalThis.fetch = async (url, init) => { calls.push({ url: String(url), init }); return new Response(JSON.stringify(body), { status }); };
  return calls;
};

test('Geoapify: South Africa only, biased to the restaurant (lon first), six results, English', () => {
  const url = new URL(geo.geoapifyUrl('6 Laura', near, 'test-key'));
  assert.equal(url.origin + url.pathname, 'https://api.geoapify.com/v1/geocode/autocomplete');
  assert.equal(url.searchParams.get('text'), '6 Laura');
  assert.equal(url.searchParams.get('filter'), 'countrycode:za');
  assert.equal(url.searchParams.get('bias'), 'proximity:28.0216,-26.5615');
  assert.equal(url.searchParams.get('limit'), '6');
  assert.equal(url.searchParams.get('format'), 'json');
  assert.equal(url.searchParams.get('apiKey'), 'test-key');
});

test('"6 Laura" lists the Laura Crescent address first, keeps only street results, and drops duplicates', async () => {
  const calls = mockFetch(laura);
  const found = await geo.findAddresses('6 Laura', near);
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /^https:\/\/api\.geoapify\.com\//);
  assert.deepEqual(found.map((s) => s.label), ['6 Laura Crescent, Risiville', '6 Laura Road, Sea Vista', '6 Laura Crescent, Franskraalstrand'], 'an administrative ward is not shown as the suburb');
  assert.equal(found[0].detail, 'Midvaal, 1805');
  assert.equal(geo.matchSuburb(found[0], ['Meyerton Park', 'risiville']), 'risiville');
});

test('a street-level result keeps the house number the guest typed; a building keeps its own', async () => {
  mockFetch({ results: [{ street: 'Loch Street', suburb: 'Golf Park', result_type: 'street' }, { street: 'Loch Street', housenumber: '28a', suburb: 'Golf Park', result_type: 'building' }] });
  const found = await geo.findAddresses('28 Loch', near);
  assert.deepEqual(found.map((s) => s.label), ['28 Loch Street, Golf Park', '28a Loch Street, Golf Park']);
  mockFetch({ results: [{ street: 'Loch Street', suburb: 'Golf Park', result_type: 'street' }] });
  assert.equal((await geo.findAddresses('Loch Str', near))[0].label, 'Loch Street, Golf Park', 'nothing typed, nothing invented');
});

test('suggestions start at three characters and an aborted or failed search is an error or empty, never a guess', async () => {
  const calls = mockFetch(laura);
  assert.deepEqual(await geo.findAddresses('6', near), []);
  assert.deepEqual(await geo.findAddresses(' 6 ', near), []);
  assert.equal(calls.length, 0, 'nothing is sent below three characters');
  await geo.findAddresses('6 L', near);
  assert.equal(calls.length, 1);
  mockFetch({ message: 'Invalid apiKey' }, 401);
  assert.deepEqual(await geo.findAddresses('6 Laura', near), [], 'a rejected key leaves a plain text field');
  const stopped = new AbortController(); stopped.abort();
  globalThis.fetch = async (_url, init) => { if (init.signal.aborted) throw new DOMException('aborted', 'AbortError'); return new Response('{}'); };
  await assert.rejects(geo.findAddresses('6 Laura', near, stopped.signal), /abort/i);
});

test('without a key the search falls back to Photon and keeps the typed house number', async () => {
  assert.equal(photon.addressProvider(), 'photon');
  assert.equal(geo.addressProvider(), 'geoapify');
  const calls = mockFetch({ features: [{ properties: { type: 'street', name: 'Laura Crescent', locality: 'Risiville', city: 'Midvaal Local Municipality' } }] });
  const found = await photon.findAddresses('6 Laura', near);
  assert.match(calls[0].url, /^https:\/\/photon\.komoot\.io\//);
  assert.ok(!calls[0].url.includes('geoapify'));
  assert.equal(found[0].label, '6 Laura Crescent, Risiville');
  assert.match(photon.addressAttribution(), /OpenStreetMap/);
  assert.match(geo.addressAttribution(), /Geoapify/);
});
