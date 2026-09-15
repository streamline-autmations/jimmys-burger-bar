// ============================================================================
// NEW RESTAURANT TEMPLATE. Copied by `npm run new-tenant -- <slug> "<Name>"`.
//
// Every value marked PLACEHOLDER must be replaced with the restaurant's REAL
// details before launch. `npm run check-tenant -- <slug>` refuses to pass while
// any PLACEHOLDER remains, anywhere in this folder.
//
// Content rules (see CLAUDE.md): no invented reviews, ratings, prices, dishes,
// hours or years in business. Photos of food must be the restaurant's own.
// If something is missing, leave the PLACEHOLDER and ask the client.
//
// This file is never registered as a tenant; it compiles so it cannot rot.
// ============================================================================

import { ZAR } from '../../core/domain/money';
import { defineRestaurant } from '../../core/config/define';
import { templateSections } from './sections';

export const template = defineRestaurant({
  slug: '__SLUG__',
  locale: 'en-ZA',
  timezone: 'Africa/Johannesburg',
  currency: ZAR,

  features: {
    ordering: true,
    reservations: true,
    scrollVideo: false,
  },

  // PLACEHOLDER: the restaurant's own brand colours and fonts.
  // Fraunces and Instrument Serif are banned display fonts.
  theme: {
    colors: {
      primary: '#1F2937',
      secondary: '#F59E0B',
      ink: '#1F2937',
      paper: '#FFFDF7',
      surface: '#FFFFFF',
      accent: '#F59E0B',
    },
    fonts: {
      display: "'Baloo 2', sans-serif",
      body: "'Quicksand', sans-serif",
      script: "'Pacifico', cursive",
    },
    googleFonts: ['Baloo+2:wght@500;600;700;800', 'Pacifico', 'Quicksand:wght@400;500;600;700'],
  },

  // Files live in src/tenants/__SLUG__/public and are served from the site root.
  assets: {
    logo: '/images/logo.png', // PLACEHOLDER: add the real logo file
    favicon: '/favicon.svg', // PLACEHOLDER: add the real favicon
    ogImage: '/images/share.jpg', // PLACEHOLDER: 1200x630 social preview photo
    siteUrl: 'https://PLACEHOLDER.co.za/',
  },

  seo: {
    title: '__NAME__ - PLACEHOLDER town',
    description: 'PLACEHOLDER: one or two factual sentences about the restaurant.',
    themeColor: '#1F2937',
  },

  motion: {
    intro: 'full',
    routeHold: 0.2,
  },

  venue: {
    name: '__NAME__',
    nameSuffix: '',
    locality: 'PLACEHOLDER town',
    tagline: 'PLACEHOLDER tagline.',
    description: 'PLACEHOLDER: what the restaurant is, in its own words.',
    phone: 'PLACEHOLDER 000 000 0000',
    whatsapp: '27000000000', // PLACEHOLDER: digits only, with country code
    email: 'PLACEHOLDER@example.com',
    address: 'PLACEHOLDER street, town',
    timeLabel: 'South African time',
    googleMapsEmbed: 'https://maps.google.com/maps?q=PLACEHOLDER&output=embed',
    googleReviews: 'https://www.google.com/maps/place/PLACEHOLDER',
    // PLACEHOLDER: real trading hours, confirmed by the owner. A day with no
    // open/close is closed.
    hours: [
      { days: [1, 2, 3, 4, 5, 6], label: 'Mon – Sat', open: '09:00', close: '21:00' },
      { days: [0], label: 'Sunday' },
    ],
    closures: [],
    // PLACEHOLDER: copy these from the real Google listing, never estimate.
    rating: 'PLACEHOLDER',
    reviewCount: 'PLACEHOLDER',
    hero: {
      type: 'image',
      image: '/images/hero.jpg', // PLACEHOLDER: the restaurant's own photo
    },
    ambience: {
      type: 'image',
      image: '/images/ambience.jpg', // PLACEHOLDER: the restaurant's own photo
    },
  },

  nav: {
    links: [
      { name: 'Home', path: '/' },
      { name: 'Food & Drinks', path: '/menu' },
      { name: 'Visit', path: '/visit' },
    ],
  },

  booking: {
    seatingOptions: ['No preference', 'Inside', 'Outside'],
    minGuests: 1,
    maxGuests: 12,
    maxDaysAhead: 60,
  },

  ordering: {
    orderPrefix: 'XX', // PLACEHOLDER: two or three letters for order references
    fulfilment: ['collection'],
    closedDayNote: 'Choose a day the restaurant is open.',
    maxDaysAhead: 7,
    collectionNote: 'Collection requested. Please wait for the restaurant to confirm the time.', // PLACEHOLDER: add the address
    tableNote: 'Table service requested. Please check with staff before ordering.',
    deliveryNote: 'Delivery requested. The restaurant must confirm availability, timing and any delivery charge.',
    nonAlcoholicDrinks: [
      { name: 'PLACEHOLDER soft drink', description: '330ml can', price: 25 },
    ],
  },

  specials: {
    intro: 'PLACEHOLDER: how specials work at this restaurant.',
    fridays: [],
    event: {
      title: 'PLACEHOLDER event',
      schedule: 'PLACEHOLDER schedule',
      description: 'PLACEHOLDER: remove the event section from sections.ts if there is none.',
      image: '/images/event.jpg', // PLACEHOLDER
    },
  },

  // PLACEHOLDER: the real menu, dish for dish and price for price, from the
  // restaurant's own menu. Names must be unique: the server prices by name.
  menu: {
    categories: [
      {
        name: 'PLACEHOLDER category',
        note: 'PLACEHOLDER note',
        items: [
          { name: 'PLACEHOLDER dish', description: 'PLACEHOLDER description', price: 100 },
        ],
      },
    ],
    featured: [],
  },

  drinks: {
    intro: 'PLACEHOLDER: the bar list in one sentence.',
    categories: [
      {
        name: 'PLACEHOLDER drinks category',
        items: [{ name: 'PLACEHOLDER drink', detail: 'PLACEHOLDER', price: 30 }],
      },
    ],
  },

  // Real reviews only, copied word for word from the public listing, with the
  // reviewer's name as shown there. Leave empty rather than invent one.
  testimonials: [],

  pages: {
    visit: {
      script: 'come on through',
      heading: 'Meet you at __NAME__.',
      intro: 'PLACEHOLDER: why come in, in the restaurant\'s voice.',
      heroImage: { src: '/images/visit.jpg', alt: 'PLACEHOLDER: describe the real photo' },
      address: { line1: 'PLACEHOLDER street', line2: 'PLACEHOLDER town' },
      galleryHeading: 'This is __NAME__.',
      gallery: [], // PLACEHOLDER: six real photos { src, caption }
    },
    menu: {
      script: 'the whole menu',
      food: {
        description: 'PLACEHOLDER: the kitchen in one sentence.',
        caption: 'PLACEHOLDER caption',
        image: { src: '/images/food.jpg', alt: 'PLACEHOLDER: describe the real photo' },
      },
      drinks: {
        description: 'PLACEHOLDER: the bar in one sentence.',
        caption: 'PLACEHOLDER caption',
        image: { src: '/images/drinks.jpg', alt: 'PLACEHOLDER: describe the real photo' },
      },
    },
  },

  sections: templateSections,

  socials: {
    facebook: 'https://www.facebook.com/PLACEHOLDER',
    instagram: 'https://www.instagram.com/PLACEHOLDER',
  },

  copy: {
    brand: {
      tagline: 'PLACEHOLDER tagline',
      builtBy: 'Website by Streamline Automations.',
    },
    // Real claims only: menu, specials, address.
    marquee: ['PLACEHOLDER fact one', 'PLACEHOLDER fact two', 'PLACEHOLDER address'],
    documents: {
      filePrefix: '__SLUG__',
    },
  },
});
