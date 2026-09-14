import type { CurrencyConfig } from '../domain/money';
import type { Closure, DayHours } from '../domain/hours';
import type { CopyOverrides } from './copy';

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

export interface MenuItem {
  name: string;
  description?: string;
  /** Human decimal, e.g. 120 or 25.5. Converted to minor units at use. */
  price?: number;
  popular?: boolean;
  /** Free-text detail used by the drinks board in place of a description. */
  detail?: string;
  tag?: string;
  /** Photo, for tiles that show the dish. Must be a real photograph of it. */
  image?: string;
}

export interface MenuCategory {
  name: string;
  note?: string;
  items: MenuItem[];
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
  orderPrefix: string;
  /** Enabled fulfilment modes. A venue with no delivery simply omits it. */
  fulfilment: ('collection' | 'delivery' | 'table')[];
  collectionNote: string;
  tableNote: string;
  deliveryNote: string;
  closedDayNote: string;
  /** How many days ahead an order can be requested for. 0 means today only. */
  maxDaysAhead: number;
  nonAlcoholicDrinks: MenuItem[];
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
  booking: BookingConfig;
  specials: {
    intro: string;
    fridays: Special[];
    event: { title: string; schedule: string; description: string; image: string };
  };
  menu: { categories: MenuCategory[]; featured: MenuItem[] };
  drinks: { intro: string; categories: MenuCategory[] };
  testimonials: Testimonial[];
  socials: { facebook: string; instagram: string };
  /** Overrides the product's generic English copy. Only what differs. */
  copy?: CopyOverrides;
}
