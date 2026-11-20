// Address suggestions for the delivery street field.
//
// With VITE_GEOAPIFY_KEY set, the typed text goes to the Geoapify Autocomplete API
// (https://apidocs.geoapify.com/docs/geocoding/address-autocomplete), limited to
// South Africa and ordered by distance from the restaurant. Without the key (the
// demo build has no env vars) it falls back to Photon, the OpenStreetMap search
// run by komoot, which needs no account. If the keyed service errors, the guest
// gets a plain text field: nothing is silently re-sent to a second provider.
// shortcut: Photon's public server is fair-use with no SLA, and OSM knows most
// local streets but few house numbers; a typed leading number is kept aside, the
// street is searched, and the number is put back on the pick. Geoapify matches
// house numbers itself, so none of that applies to it.

export interface AddressSuggestion {
  /** What goes into the street address field, e.g. "28 Loch Street, Golf Park". */
  label: string;
  /** Second line in the list, e.g. "Midvaal, 1960". */
  detail: string;
  /** Every area name the result belongs to, to match against the delivery suburbs. */
  areas: string[];
}

export type AddressProvider = 'geoapify' | 'photon';

export const MIN_CHARS = 3;
export const DEBOUNCE_MS = 300;
export const MAX_RESULTS = 6;

const geoapifyKey = (): string => (import.meta.env.VITE_GEOAPIFY_KEY ?? '').trim();

export const addressProvider = (): AddressProvider => (geoapifyKey() ? 'geoapify' : 'photon');

/** The credit line each provider's terms ask for, shown under the suggestions. */
export const addressAttribution = (): string =>
  addressProvider() === 'geoapify' ? 'Addresses by Geoapify, © OpenStreetMap contributors' : 'Addresses © OpenStreetMap contributors';

interface PhotonFeature {
  properties: Record<string, string | undefined>;
}

interface GeoapifyResult {
  street?: string;
  housenumber?: string;
  suburb?: string;
  district?: string;
  city?: string;
  postcode?: string;
}

const NUMBER = /^\s*(\d+[a-zA-Z]?)\s*,?\s+(.*)$/;
const municipality = (name?: string) => name?.replace(/ Local Municipality$/, '');

/** "28 loch" → { number: "28", street: "loch" }. */
export function splitHouseNumber(query: string): { number: string; street: string } {
  const match = NUMBER.exec(query);
  return match ? { number: match[1], street: match[2].trim() } : { number: '', street: query.trim() };
}

/** Geoapify's autocomplete: South Africa only, nearest the restaurant first. `lon` comes before `lat` in `bias`. */
export function geoapifyUrl(text: string, near: { lat: number; lon: number }, key: string): string {
  const params = new URLSearchParams({
    text,
    filter: 'countrycode:za',
    bias: `proximity:${near.lon},${near.lat}`,
    limit: String(MAX_RESULTS),
    lang: 'en',
    format: 'json',
    apiKey: key,
  });
  return `https://api.geoapify.com/v1/geocode/autocomplete?${params}`;
}

/** Searches about 25 km around the restaurant, nearest first, streets and buildings only. */
export function searchUrl(street: string, near: { lat: number; lon: number }): string {
  const params = new URLSearchParams({ q: street, lat: String(near.lat), lon: String(near.lon), limit: String(MAX_RESULTS), lang: 'en' });
  params.set('bbox', [near.lon - 0.25, near.lat - 0.25, near.lon + 0.25, near.lat + 0.25].join(','));
  for (const layer of ['house', 'street']) params.append('layer', layer);
  return `https://photon.komoot.io/api/?${params}`;
}

/** Geoapify also returns suburbs and cities; only results that name a street can be delivered to. */
export function toGeoapifySuggestions(results: GeoapifyResult[], typedNumber = ''): AddressSuggestion[] {
  const seen = new Set<string>();
  return results.flatMap((r) => {
    if (!r.street) return [];
    // Some results name only an administrative ward ("Overstrand Ward 1") as the suburb; a town is more useful to a rider.
    const area = [r.suburb, r.district, municipality(r.city)].find((name) => name && !/\bWard \d+\b/i.test(name));
    // A street-level result has no number of its own; the guest knows theirs, so it is kept rather than dropped.
    const label = [[r.housenumber || typedNumber, r.street].filter(Boolean).join(' '), area].filter(Boolean).join(', ');
    if (seen.has(label)) return [];
    seen.add(label);
    return [{ label, detail: [municipality(r.city), r.postcode].filter(Boolean).join(', '), areas: [r.suburb, r.district, r.city].filter((x): x is string => !!x) }];
  });
}

export function toSuggestions(features: PhotonFeature[], typedNumber: string): AddressSuggestion[] {
  const seen = new Set<string>();
  return features.flatMap(({ properties: p }) => {
    // A street result's name IS the street; a building's street is in `street`.
    const street = p.type === 'street' ? p.name : p.street;
    if (!street) return [];
    // The guest knows their own number; OSM's nearest building on the street is a guess.
    const number = typedNumber || p.housenumber;
    const area = p.locality || p.district;
    const label = [[number, street].filter(Boolean).join(' '), area].filter(Boolean).join(', ');
    if (seen.has(label)) return [];
    seen.add(label);
    return [{ label, detail: [municipality(p.city), p.postcode].filter(Boolean).join(', '), areas: [p.locality, p.district, p.city].filter((x): x is string => !!x) }];
  });
}

const json = async (res: Response) => (res.ok ? res.json() : {});

/** Up to six suggestions for what the guest has typed. Empty below three characters; rejects on abort or network failure. */
export async function findAddresses(typed: string, near: { lat: number; lon: number }, signal?: AbortSignal): Promise<AddressSuggestion[]> {
  const text = typed.trim();
  if (text.length < MIN_CHARS) return [];
  const key = geoapifyKey();
  if (key) return toGeoapifySuggestions(((await json(await fetch(geoapifyUrl(text, near, key), { signal }))).results ?? []) as GeoapifyResult[], splitHouseNumber(text).number);
  const { number, street } = splitHouseNumber(text);
  if (street.length < MIN_CHARS) return [];
  return toSuggestions(((await json(await fetch(searchUrl(street, near), { signal }))).features ?? []) as PhotonFeature[], number);
}

/** The listed delivery suburb this result sits in, if its area names one exactly. */
export function matchSuburb(suggestion: AddressSuggestion, suburbs: string[]): string | undefined {
  const areas = suggestion.areas.map((a) => a.toLowerCase());
  return suburbs.find((suburb) => areas.includes(suburb.toLowerCase()));
}
