// Address suggestions for the delivery street field, from Photon (OpenStreetMap
// data, no account or API key).
// shortcut: Photon's public server is fair-use with no SLA; if suggestions get slow,
// rate limited or miss streets, move to a keyed provider (Geoapify free tier) here.
// OSM knows most local streets but few house numbers, so a typed leading number is
// kept aside, the street is searched, and the number is put back on the pick.

export interface AddressSuggestion {
  /** What goes into the street address field, e.g. "28 Loch Street, Golf Park". */
  label: string;
  /** Second line in the list, e.g. "Midvaal, 1960". */
  detail: string;
  /** Every area name the result belongs to, to match against the delivery suburbs. */
  areas: string[];
}

interface PhotonFeature {
  properties: Record<string, string | undefined>;
}

const NUMBER = /^\s*(\d+[a-zA-Z]?)\s*,?\s+(.*)$/;

/** "28 loch" → { number: "28", street: "loch" }. */
export function splitHouseNumber(query: string): { number: string; street: string } {
  const match = NUMBER.exec(query);
  return match ? { number: match[1], street: match[2].trim() } : { number: '', street: query.trim() };
}

/** Searches about 25 km around the restaurant, nearest first, streets and buildings only. */
export function searchUrl(street: string, near: { lat: number; lon: number }): string {
  const params = new URLSearchParams({ q: street, lat: String(near.lat), lon: String(near.lon), limit: '6', lang: 'en' });
  params.set('bbox', [near.lon - 0.25, near.lat - 0.25, near.lon + 0.25, near.lat + 0.25].join(','));
  for (const layer of ['house', 'street']) params.append('layer', layer);
  return `https://photon.komoot.io/api/?${params}`;
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
    const town = p.city?.replace(/ Local Municipality$/, '');
    return [{ label, detail: [town, p.postcode].filter(Boolean).join(', '), areas: [p.locality, p.district, p.city].filter((x): x is string => !!x) }];
  });
}

/** The listed delivery suburb this result sits in, if its area names one exactly. */
export function matchSuburb(suggestion: AddressSuggestion, suburbs: string[]): string | undefined {
  const areas = suggestion.areas.map((a) => a.toLowerCase());
  return suburbs.find((suburb) => areas.includes(suburb.toLowerCase()));
}
