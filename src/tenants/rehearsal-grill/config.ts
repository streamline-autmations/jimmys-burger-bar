
import { ZAR } from '../../core/domain/money';
import { defineRestaurant } from '../../core/config/define';
import { rehearsalGrillSections } from './sections';

export const rehearsalGrill = defineRestaurant({
  slug: 'rehearsal-grill',
  locale: 'en-ZA',
  timezone: 'Africa/Johannesburg',
  currency: ZAR,

  features: {
    ordering: true,
    reservations: true,
    scrollVideo: false,
  },


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

  assets: {
    logo: '/images/rehearsal.svg', // Fictional rehearsal: add the real logo file
    favicon: '/images/rehearsal.svg', // Fictional rehearsal: add the real favicon
    ogImage: '/images/rehearsal.svg', // Fictional rehearsal: 1200x630 social preview photo
    siteUrl: 'https://rehearsal-grill.example.com/',
  },

  seo: {
    title: 'Rehearsal Grill - Fictional rehearsal town',
    description: 'Fictional rehearsal: one or two factual sentences about the restaurant.',
    themeColor: '#1F2937',
  },

  motion: {
    intro: 'full',
    routeHold: 0.2,
  },

  venue: {
    name: 'Rehearsal Grill',
    nameSuffix: '',
    locality: 'Fictional rehearsal town',
    tagline: 'Fictional rehearsal tagline.',
    description: 'Fictional rehearsal: what the restaurant is, in its own words.',
    phone: '+27 00 000 0001',
    whatsapp: '27000000002', // Fictional rehearsal: digits only, with country code
    email: 'hello@example.com',
    address: 'Fictional rehearsal street, town',
    timeLabel: 'South African time',
    googleMapsEmbed: 'https://rehearsal-grill.example.com',
    googleReviews: 'https://rehearsal-grill.example.com',


    hours: [
      { days: [1, 2, 3, 4, 5, 6], label: 'Mon – Sat', open: '09:00', close: '21:00' },
      { days: [0], label: 'Sunday' },
    ],
    closures: [],

    rating: 'Fictional rehearsal',
    reviewCount: 'Fictional rehearsal',
    hero: {
      type: 'image',
      image: '/images/rehearsal.svg', // Fictional rehearsal: the restaurant's own photo
    },
    ambience: {
      type: 'image',
      image: '/images/rehearsal.svg', // Fictional rehearsal: the restaurant's own photo
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
    payment: 'on_collection',
    escalation: { afterMinutes: 7, name: 'Rehearsal manager', phone: '+27 00 000 0003' },
    orderPrefix: 'RG', // Fictional rehearsal: two or three letters for order references
    fulfilment: ['collection'],
    closedDayNote: 'Choose a day the restaurant is open.',
    maxDaysAhead: 7,
    collectionNote: 'Collection requested. Please wait for the restaurant to confirm the time.', // Fictional rehearsal: add the address
    tableNote: 'Table service requested. Please check with staff before ordering.',
    deliveryNote: 'Delivery requested. The restaurant must confirm availability, timing and any delivery charge.',
    nonAlcoholicDrinks: [
      { name: 'Fictional rehearsal soft drink', description: '330ml can', price: 25 },
    ],
  },

  specials: {
    intro: 'Fictional rehearsal: how specials work at this restaurant.',
    fridays: [],
    event: {
      title: 'Fictional rehearsal event',
      schedule: 'Fictional rehearsal schedule',
      description: 'Fictional rehearsal: remove the event section from sections.ts if there is none.',
      image: '/images/rehearsal.svg', // Fictional rehearsal
    },
  },


  menu: {
    categories: [
      {
        name: 'Fictional rehearsal category',
        note: 'Fictional rehearsal note',
        items: [
          { name: 'Fictional rehearsal dish', description: 'Fictional rehearsal description', price: 100 },
        ],
      },
    ],
    featured: [],
  },

  drinks: {
    intro: 'Fictional rehearsal: the bar list in one sentence.',
    categories: [
      {
        name: 'Fictional rehearsal drinks category',
        items: [{ name: 'Fictional rehearsal drink', detail: 'Fictional rehearsal', price: 30 }],
      },
    ],
  },


  testimonials: [],

  pages: {
    visit: {
      script: 'come on through',
      heading: 'Meet you at Rehearsal Grill.',
      intro: 'Fictional rehearsal: why come in, in the restaurant\'s voice.',
      heroImage: { src: '/images/rehearsal.svg', alt: 'Fictional rehearsal: describe the real photo' },
      address: { line1: 'Fictional rehearsal street', line2: 'Fictional rehearsal town' },
      galleryHeading: 'This is Rehearsal Grill.',
      gallery: [], // Fictional rehearsal: six real photos { src, caption }
    },
    menu: {
      script: 'the whole menu',
      food: {
        description: 'Fictional rehearsal: the kitchen in one sentence.',
        caption: 'Fictional rehearsal caption',
        image: { src: '/images/rehearsal.svg', alt: 'Fictional rehearsal: describe the real photo' },
      },
      drinks: {
        description: 'Fictional rehearsal: the bar in one sentence.',
        caption: 'Fictional rehearsal caption',
        image: { src: '/images/rehearsal.svg', alt: 'Fictional rehearsal: describe the real photo' },
      },
    },
  },

  sections: rehearsalGrillSections,

  socials: {
    facebook: 'https://rehearsal-grill.example.com',
    instagram: 'https://rehearsal-grill.example.com',
  },

  copy: {
    brand: {
      tagline: 'Fictional rehearsal tagline',
      builtBy: 'Website by Streamline Automations.',
    },

    marquee: ['Fictional rehearsal fact one', 'Fictional rehearsal fact two', 'Fictional rehearsal address'],
    documents: {
      filePrefix: 'rehearsal-grill',
    },
  },
});
