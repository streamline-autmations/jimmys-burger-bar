import type { CurrencyConfig } from '../domain/money';
import type { Closure, DayHours } from '../domain/hours';
import type { CopyOverrides } from './copy';
import type { SectionSpec } from '../../brand/sections/types';

/**
 * Everything that differs between restaurants.
 *
 * If a value belongs here and is instead written into a component, launching
 * the next client means editing that component - which is precisely what this
 * refactor exists to stop. The type is the checklist: a new tenant that
 * compiles has supplied everything the product needs.
 */

export interface MediaSource {
  type: 'video' | 'image';
  video?: string;
  image?: string;
  poster?: string;
  /** Phones get a dedicated portrait crop; a 16:9 clip under object-cover loses the composition. */
  videoMobile?: string;
  posterMobile?: string;
}

/** A paid add-on to a dish ("Extra Bacon"). The server prices it from menu_items.extras, never from the browser. */
export interface Extra {
  name: string;
  /** Human decimal, like a menu price. */
  price: number;
}

export interface MenuItem {
  name: string;
  description?: string;
  /** Human decimal, e.g. 120 or 25.5. Converted to minor units at use. */
  price?: number;
  popular?: boolean;
  /** Free-text detail used by the drinks board in place of a description. */
  detail?: string;
  tag?: string;
  /**
   * Photo of the dish: featured tiles, and a thumbnail beside the item on the
   * menu board and the order page. A real photograph of it, unless the tenant
   * has approved and logged a generated one.
   */
  image?: string;
  /** Extras this dish offers. Replaces the category's list; `[]` turns them off for this dish. */
  extras?: Extra[];
}

export interface MenuCategory {
  name: string;
  note?: string;
  items: MenuItem[];
  /** Extras offered on every dish in the category that does not set its own. Names are unique per dish. */
  extras?: Extra[];
  /** Only orderable within this window, e.g. breakfast until noon. */
  availableUntil?: string;
}

export interface Special {
  title: string;
  price?: number;
  description: string;
  note?: string;
  poster?: string;
}

export interface Testimonial {
  name: string;
  rating: number;
  text: string;
}

export interface ThemeConfig {
  colors: {
    primary: string; secondary: string; ink: string;
    paper: string; surface: string; accent: string;
  };
  fonts: { display: string; body: string; script: string };
  /** Families to request from Google Fonts, so a font swap actually loads. */
  googleFonts?: string[];
}

export interface VenueConfig {
  name: string;
  nameSuffix: string;
  /** Town or suburb, shown beside the name, e.g. "Meyerton". */
  locality: string;
  tagline: string;
  taglineAccent?: string;
  description: string;
  phone: string;
  /** Digits only, no plus or spaces. */
  whatsapp: string;
  email: string;
  address: string;
  googleMapsEmbed: string;
  googleReviews: string;
  hours: DayHours[];
  closures: Closure[];
  /** How the restaurant's timezone is named to customers, e.g. "South African time". */
  timeLabel: string;
  rating: string;
  reviewCount: string;
  hero: MediaSource;
  ambience: MediaSource;
}

export interface BrandAssets {
  logo: string;
  favicon: string;
  /** Open Graph / social preview image. */
  ogImage: string;
  /** Canonical public URL, used for OG tags. */
  siteUrl: string;
}

export interface SeoConfig {
  title: string;
  description: string;
  themeColor: string;
}

export interface OrderingConfig {
  /** Defaults to on_collection when omitted. */
  payment?: 'on_collection' | 'payfast';
  orderPrefix: string;
  /** Enabled fulfilment modes. A venue with no delivery simply omits it. */
  fulfilment: ('collection' | 'delivery' | 'table')[];
  collectionNote: string;
  tableNote: string;
  deliveryNote: string;
  closedDayNote: string;
  /** How many days ahead an order can be requested for. 0 means today only. */
  maxDaysAhead: number;
  /** Minutes the kitchen needs before the earliest collection slot. Pay-first checkout only; defaults to 0. */
  leadMinutes?: number;
  /**
   * Who the kitchen screen tells staff to call when an order sits unaccepted.
   * Omitted: it says "the manager on duty" after 5 minutes. Agree the real
   * person at the staff rehearsal; never guess a number.
   */
  escalation?: { afterMinutes: number; name: string; phone?: string };
  /**
   * Paid delivery, as a showcase on a staging tenant. Omitted means off, which
   * is the default for every restaurant. `npm run tenant:sql` turns it into the
   * `delivery.zone` setting the database prices orders from, so the fees here
   * and the fees charged come from one place. Every fee is an example until the
   * restaurant agrees real prices with a rider or courier.
   */
  deliveryPreview?: DeliveryPreviewConfig;
  nonAlcoholicDrinks: MenuItem[];
}

export interface DeliveryPreviewConfig {
  /** Shown beside every fee, e.g. "Example delivery fee for this preview, to be agreed". */
  feeNote: string;
  /** Fee bands, nearest first. A suburb belongs to exactly one band. Fees in whole currency units, like menu prices. */
  bands: { label: string; fee: number; suburbs: string[] }[];
  /** Daily delivery window, restaurant-local "HH:MM", from <= time < until. Trading hours still apply. */
  hours: { from: string; until: string };
  /** Smallest food subtotal for delivery, in whole currency units. */
  minimumOrder?: number;
  /** Who "Send to rider" messages on WhatsApp. Never a real number on a preview. */
  dispatcher: { name: string; whatsapp: string };
  /** Where to centre street address suggestions (the restaurant). Unset = a plain text field. */
  addressSearch?: { lat: number; lon: number };
}

export interface BookingConfig {
  seatingOptions: string[];
  minGuests: number;
  maxGuests: number;
  /** How far ahead a table can be requested. */
  maxDaysAhead: number;
}

export interface MotionConfig {
  /** 'full' plays the four-stage first-load brand intro; 'off' skips straight to the page. */
  intro: 'full' | 'off';
  /** Seconds the route curtain holds over the viewport before it peels. */
  routeHold: number;
}

export interface PhotoRef {
  /** Path under the tenant's public folder, e.g. "/images/team.jpg". */
  src: string;
  alt: string;
}

/**
 * Restaurant-specific words and pictures on the fixed pages. Generic product
 * copy stays in the components; only what belongs to one restaurant is here.
 */
export interface PagesConfig {
  visit: {
    script: string;
    heading: string;
    intro: string;
    heroImage: PhotoRef;
    address: { line1: string; line2: string };
    galleryHeading: string;
    /** Up to six. The collage layout is designed for exactly six. */
    gallery: { src: string; caption: string }[];
  };
  menu: {
    script: string;
    /** `video` loops over `image`; reduced-motion visitors get `image` only. */
    food: { description: string; caption: string; image: PhotoRef; video?: string };
    drinks: { description: string; caption: string; video?: string; image?: PhotoRef };
    /** Promo posters shown as a strip on the installed app's menu. `src` is the small card, `full` opens on tap. Omit for none. */
    promos?: { src: string; full: string; alt: string }[];
  };
}

export interface RestaurantConfig {
  slug: string;
  locale: string;
  timezone: string;
  currency: CurrencyConfig;
  features: { ordering: boolean; reservations: boolean; scrollVideo: boolean };
  theme: ThemeConfig;
  assets: BrandAssets;
  seo: SeoConfig;
  motion: MotionConfig;
  venue: VenueConfig;
  nav: { links: { name: string; path: string }[] };
  ordering: OrderingConfig;
  /** The installable app. Unset: Android guests get Chrome's own Install button only. */
  app?: {
    /** Public path of the signed Android app file, e.g. "/downloads/jimmys.apk" (see docs/restaurant-direct/APP.md). */
    androidApk?: string;
  };
  /**
   * Facts only the restaurant can give for the /privacy page (POPIA). Unset
   * fields are shown as "to be confirmed", never filled in for them.
   */
  privacy?: {
    /** The legal name of the business that runs the restaurant. */
    operator?: string;
    /** The POPIA information officer: a name and how to reach them. */
    informationOfficer?: string;
    /** How long order and booking records are kept. */
    retention?: string;
  };
  booking: BookingConfig;
  specials: {
    intro: string;
    fridays: Special[];
    event: { title: string; schedule: string; description: string; image: string };
  };
  menu: { categories: MenuCategory[]; featured: MenuItem[]; extrasNote?: string; pdf?: string };
  drinks: { intro: string; categories: MenuCategory[] };
  testimonials: Testimonial[];
  pages: PagesConfig;
  /** The home page, top to bottom. See src/brand/sections. */
  sections: SectionSpec[];
  socials: { facebook: string; instagram: string };
  /** Overrides the product's generic English copy. Only what differs. */
  copy?: CopyOverrides;
  /** Optional figures on the staff Today page. */
  reporting?: ReportingConfig;
}

export interface ReportingConfig {
  /**
   * A delivery app's commission as a fraction (0.25 is 25%). When set, Today
   * shows what that commission would have cost on the last seven days of
   * direct orders. Leave it out to hide the comparison.
   */
  appCommissionRate?: number;
}
