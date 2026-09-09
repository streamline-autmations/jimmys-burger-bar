/**
 * Tenant copy.
 *
 * Only strings that a new restaurant MUST change live here: brand identity,
 * transactional flow wording, and legal-ish notes. Marketing prose belongs to
 * the sections that carry it (see src/brand/sections), because a new tenant
 * replaces those wholesale rather than translating Jimmy's poetry line by line.
 *
 * Defaults are deliberately generic and venue-agnostic, so a tenant overrides
 * only what it actually says differently.
 */

export interface RestaurantCopy {
  brand: {
    /** Shown under the logo on the route curtain and the first-load intro. */
    tagline: string;
    /** Footer attribution. Kept configurable so this is not silently Streamline's forever. */
    builtBy: string;
  };
  notFound: {
    script: string;
    heading: string;
    body: string;
    cta: string;
  };
  /** Infinite strip under the hero. Must stay factual: menu, specials, address. */
  marquee: string[];
  order: {
    heading: string;
    eyebrow: string;
    intro: string;
    checkoutHeading: string;
    confirmedHeading: string;
    /** Shown when a submission's outcome could not be confirmed. */
    uncertain: string;
    priorReferenceHeading: string;
    priorReferenceBody: string;
    disabled: string;
    softDrinksLabel: string;
    softDrinksNote: string;
  };
  booking: {
    heading: string;
    confirmedHeading: string;
    pendingNote: string;
    uncertain: string;
    disabled: string;
  };
  documents: {
    /** Prefix for downloaded files, e.g. "jimmys" gives jimmys-order-JB-123.pdf. */
    filePrefix: string;
    receiptFooter: string;
    bookingFooter: string;
  };
}

export const defaultCopy: RestaurantCopy = {
  brand: {
    tagline: 'Good food. Good people.',
    builtBy: '',
  },
  notFound: {
    script: 'wrong turn?',
    heading: 'Page not found',
    body: "That page isn't on the menu. Head back and try one of these instead.",
    cta: 'Back to the menu',
  },
  marquee: [],
  order: {
    heading: 'Order online',
    eyebrow: 'skip the queue',
    intro: 'Order directly for collection.',
    checkoutHeading: 'Checkout',
    confirmedHeading: 'We have received your order.',
    uncertain: 'We could not verify receipt of your order. Contact the restaurant with this reference before ordering again.',
    priorReferenceHeading: 'Check your last request',
    priorReferenceBody: 'This tab previously sent an order request. Contact the restaurant to check its status before placing another order.',
    disabled: 'Online ordering is not available right now.',
    softDrinksLabel: 'Non-alcoholic drinks',
    softDrinksNote: 'Cold, zero-proof and ready to add',
  },
  booking: {
    heading: 'Book a table',
    confirmedHeading: 'Request received.',
    pendingNote: 'This is a request, not a confirmed booking, until the restaurant contacts you.',
    uncertain: 'We could not verify receipt. Contact the restaurant before sending another request to avoid a duplicate.',
    disabled: 'Bookings are not available right now.',
  },
  documents: {
    filePrefix: 'order',
    receiptFooter: 'This is a record of your request, not proof of payment.',
    bookingFooter: 'This is a booking request and is not confirmed until the restaurant contacts you.',
  },
};

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };
export type CopyOverrides = DeepPartial<RestaurantCopy>;

/** Section-wise merge: a tenant overrides individual strings, not whole blocks. */
export function resolveCopy(overrides: CopyOverrides = {}): RestaurantCopy {
  const merged = { ...defaultCopy };
  for (const key of Object.keys(defaultCopy) as (keyof RestaurantCopy)[]) {
    const override = overrides[key];
    if (Array.isArray(defaultCopy[key])) {
      if (override) (merged as Record<string, unknown>)[key] = override;
    } else if (override && typeof override === 'object') {
      (merged as Record<string, unknown>)[key] = { ...defaultCopy[key], ...override };
    }
  }
  return merged;
}
