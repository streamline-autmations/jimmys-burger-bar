// ============================================================================
// CLIENT CONFIG — Jimmy's Burger Bar, 57 Loch St, Meyerton.
// Brand tokens, menu, drinks and specials are sourced from Jimmy's real brand
// collateral (logo, in-store menu and Instagram specials designed by Ameli van
// Zyl) — see the brand board at ameli-designs.netlify.app/projects/jimmys-burger-bar.
// ============================================================================

import { ZAR } from "../../core/domain/money";
import { defineRestaurant } from "../../core/config/define";

export const jimmys = defineRestaurant({
  slug: "jimmys",
  // ---- Locale ---------------------------------------------------------------
  // Everything region-specific lives here rather than being hardcoded across
  // five files. `currency` is explicit rather than derived from the locale,
  // because Intl renders ZAR as "R 120,00" while Jimmy's menu says "R120".
  locale: "en-ZA",
  timezone: "Africa/Johannesburg",
  currency: ZAR,

  // ---- Feature flags -------------------------------------------------------
  // Active customer capabilities for this installation.
  features: {
    ordering: true,       // Direct orders stored through create_order
    reservations: true,   // Booking requests embedded on Visit
    scrollVideo: false,   // experimental scroll-scrubbed hero (R&D)
  },

  // ---- Visual identity ------------------------------------------------------
  // A deliberately tight three-colour system: Jimmy's deep navy, clean white
  // and the golden yellow from the price-starburst stickers. Primary/ink and
  // secondary/accent intentionally share channels so older component aliases
  // cannot re-introduce the previous royal or periwinkle blues.
  theme: {
    colors: {
      primary: "#172544",
      secondary: "#F2A93B",
      ink: "#172544",
      paper: "#FFFDF7",
      surface: "#FFFFFF",
      accent: "#F2A93B",
    },
    fonts: {
      display: "'Baloo 2', sans-serif",
      body: "'Quicksand', sans-serif",
      script: "'Pacifico', cursive",
    },
    // Requested from Google Fonts at build time. Previously the @import in
    // index.css was hardcoded, so changing `fonts` above set a CSS variable
    // pointing at a family the browser had never been asked to load.
    googleFonts: [
      "Baloo+2:wght@500;600;700;800",
      "Pacifico",
      "Quicksand:wght@400;500;600;700",
    ],
  },

  // Brand assets, previously scattered as literals across nine files.
  assets: {
    logo: "/images/logo.png",
    favicon: "/favicon.svg",
    ogImage: "/images/hero-burger.jpg",
    siteUrl: "https://jimmysburgerbar.co.za/",
  },

  // Drives index.html at build time, so a new tenant does not hand-edit it.
  seo: {
    title: "Jimmy's Burger Bar - Meyerton",
    description:
      "Meyerton's go-to spot for juicy burgers and ice-cold beers. Smash burgers, big breakfasts, Friday specials and Coffee & Cars at 57 Loch Street, Meyerton.",
    themeColor: "#172544",
  },

  // The four-stage first-load sequence is Jimmy's signature, but it costs 3.4s
  // before anything is readable - too long for a 60-second sales walkthrough,
  // hence 'short' and 'off'.
  motion: {
    intro: "full" as const,
    routeHold: 0.5,
  },

  venue: {
    name: "Jimmy's",
    nameSuffix: "Burger Bar",
    tagline: "Meyerton's go-to spot for juicy burgers and ice-cold beers.",
    taglineAccent: "ice-cold beers.",
    description: "180g patties smashed to order, big breakfasts, flame-grilled steaks and a bar that never runs dry. Right on Loch Street, done right every time.",
    // Confirmed by Christiaan 2026-07-22.
    phone: "064 534 6143",
    whatsapp: "27645346143",
    // Real inbox, confirmed by Christiaan 2026-07-22.
    email: "jimmysburgerbar1@gmail.com",
    address: "57 Loch Street, Meyerton, Gauteng",
    // How the restaurant's timezone is named to customers, e.g. "South African time".
    timeLabel: "South African time",
    googleMapsEmbed: "https://maps.google.com/maps?q=Jimmy%27s+Burger+Bar+Meyerton&output=embed",
    googleReviews: "https://www.google.com/maps/place/Jimmy's+Burger+Bar/@-26.5615391,28.0190301,17z/data=!4m8!3m7!1s0x1e94fbae49f31b03:0x9e4f2e15531d645c!8m2!3d-26.5615391!4d28.021605!9m1!1b1!16s%2Fg%2F11t53yynk1?entry=ttu&g_ep=EgoyMDI2MDcyMi4wIKXMDSoASAFQAw%3D%3D",
    // Real trading hours, confirmed by Christiaan 2026-07-22.
    // NOTE: Sundays are closed EXCEPT the monthly Coffee & Cars morning
    // (specials.event) — that one Sunday they open for the event.
    hours: [
      { days: [1, 2], label: "Mon – Tue", open: "09:00", close: "20:00" },
      { days: [3, 4], label: "Wed – Thu", open: "09:00", close: "21:00" },
      { days: [5, 6], label: "Fri – Sat", open: "09:00", close: "00:00" },
      // No open/close means closed. Coffee & Cars Sundays are added to
      // `closures` as dated exceptions once the dates are known.
      { days: [0], label: "Sunday" },
    ],
    // One-off closures and changed-hours days: public holidays, private
    // functions, and the monthly Coffee & Cars Sunday once dates are confirmed.
    // { date: "2026-12-25", reason: "Christmas Day" }
    // { date: "2026-10-04", reason: "Coffee & Cars", open: "09:00", close: "14:00" }
    closures: [] as { date: string; reason?: string; open?: string; close?: string }[],
    rating: "4.7",
    reviewCount: "64",
    hero: {
      // AI-generated cinematic loop (Seedance 2.0 image-to-video, 2026-07-22)
      // derived from Jimmy's own real hero shot — same burger, slow push-in
      // and ease-out so the loop doesn't jump, steam and glisten added.
      // Logged under the CLAUDE.md AI-imagery override. Poster is the video's
      // own first frame so playback starts seamlessly. Local file, no
      // hot-linking. Previous loop kept at /videos/hero-burger-loop.mp4.
      type: "video" as "video" | "image",
      video: "/videos/hero-burger-cinematic.mp4",
      poster: "/images/hero-burger-poster.jpg",
      // Natively generated 9:16 clip for phones (Seedance 2.0, framed wider
      // than the desktop macro shot so the whole burger reads at a glance).
      // A centre-crop of the 16:9 desktop clip was tried first and looked
      // like an abstract cheese/pepper close-up on a phone screen - cropping
      // an already-extreme macro shot loses all context. Regenerated instead.
      videoMobile: "/videos/hero-burger-cinematic-mobile.mp4",
      posterMobile: "/images/hero-burger-poster-mobile.jpg",
    },
    // Backdrop for the drinks band on the home page. Bespoke pour loop
    // (pour is already mid-stream from frame one, no dead lead-in). Falls
    // back to the real Corona bucket shot if video is ever switched off.
    ambience: {
      type: "video" as "video" | "image",
      video: "/videos/drinks-pour-loop.mp4",
      image: "/images/ambience-corona.jpg",
    },
  },

  nav: {
    links: [
      { name: "Home", path: "/" },
      { name: "Food & Drinks", path: "/menu" },
      { name: "Visit", path: "/visit" },
    ]
  },

  // Direct orders are stored atomically in Supabase; notifications run externally.
  booking: {
    seatingOptions: ["No preference", "Inside", "Outside", "Smoking area", "Non-smoking area"],
    minGuests: 1,
    maxGuests: 12,
    maxDaysAhead: 90,
  },

  ordering: {
    orderPrefix: "JB",
    // Collection is the offer. Delivery and table service remain available as
    // request modes but are not guaranteed, so a venue without them omits them.
    fulfilment: ["collection", "delivery", "table"] as const,
    // Shown when a customer picks a day the restaurant is closed. Tenant copy,
    // because "contact us about Coffee & Cars" means nothing to another venue.
    closedDayNote: "Choose an open day. For Coffee & Cars Sundays, contact Jimmy's to check the event date.",
    collectionNote: "Collection requested at 57 Loch Street. Please wait for Jimmy's to confirm the time.",
    tableNote: "Table service requested. Please check with staff before ordering.",
    deliveryNote: "Delivery requested. Jimmy's must confirm availability, timing and any delivery charge.",
    nonAlcoholicDrinks: [
      { name: 'Coke', description: '330ml can', price: 25 },
      { name: 'Coke Zero', description: '330ml can', price: 25 },
      { name: 'Sprite', description: '330ml can', price: 25 },
      { name: 'Fanta Orange', description: '330ml can', price: 25 },
      { name: 'Still Water', description: '500ml', price: 18 },
      { name: 'Sparkling Water', description: '500ml', price: 22 },
      { name: 'Appletiser', description: '330ml', price: 30 },
      { name: 'Heineken 0.0', description: 'Non-alcoholic beer', price: 30 },
    ],
  },

  // ---- Specials -----------------------------------------------------------
  // All real, taken from Jimmy's own Instagram posters. One headline special
  // rotates every Friday; Coffee & Cars runs one Sunday a month.
  specials: {
    intro: "One big special every Friday, plus Coffee & Cars once a month. This is the current rotation.",
    // `poster` = the actual Instagram poster for that special, when we have
    // one on file. Cards with a poster render the real artwork instead of
    // the plain text card.
    fridays: [
      { title: "Osso Buco", price: 120, description: "Slow-braised beef shank, rich gravy, creamy mash and veg. Pure comfort food done right.", note: "While stocks last", poster: "/images/specials/osso-buco.jpg" },
      { title: "Chicken Prego Roll", price: 120, description: "Juicy chicken prego with chips, and a free Windhoek draught on the side.", note: "Free draught included", poster: "/images/specials/chicken-prego-roll.jpg" },
      { title: "Greek Platter", price: 180, description: "Homemade chicken, meatballs, steak strips, olives, salad, chips and flatbread with hummus and tsatsiki.", note: "While stocks last", poster: "/images/specials/greek-platter.jpg" },
      { title: "Mexican Friday", price: 120, description: "Five ice-cold Coronas for the table. Pair them with tacos and the Mexican burger.", note: "5x Corona", poster: "/images/specials/mexican-friday.jpg" },
      { title: "Chicken Souvlaki", price: undefined, description: "Greek-style grilled chicken skewers served with pita, chips and salad.", note: "Ask what it's on for" },
    ],
    event: {
      title: "Coffee & Cars",
      schedule: "One Sunday a month · from 9am",
      description: "Classic cars out front, a Full House Breakfast Special for R95, and a free coffee with any breakfast. Fuel up for the day and the month.",
      image: "/images/specials/coffee-and-cars.jpg",
    },
  },

  // ---- Food menu ----------------------------------------------------------
  // Jimmy's real in-store menu, straight off their printed menu boards.
  menu: {
    categories: [
      {
        name: "Breakfast",
        note: "Served until 12",
        items: [
          { name: "Breakfast Bun", description: "Bun with bacon, egg and cheese, with chips", price: 60 },
          { name: "Breakfast Burger", description: "Beef burger with egg, bacon and chips", price: 95, popular: true },
          { name: "Jimmy's Breakfast", description: "2 eggs, 2 bacon, toast, grilled tomato and chips", price: 70, popular: true },
          { name: "Avo on Toast", description: "Smashed avo on toast with grilled tomatoes", price: 60 },
          { name: "Omelette", description: "Bacon and mushroom, or mushroom and cheese", price: 60 },
          { name: "Carb Clever Breakfast", description: "2 eggs, 2 bacon, tomato and avo", price: 60 },
        ]
      },
      {
        name: "Burgers",
        note: "With chips · served all day",
        items: [
          { name: "Beef Burger", description: "180g beef patty, cheese, tomato, lettuce and Jimmy's sauce", price: 90 },
          { name: "Chicken Burger", description: "Chicken patty, cheese sauce, tomato, lettuce and Jimmy's sauce", price: 90 },
          { name: "Smash Burger", description: "2 smashed patties, cheese and Jimmy's sauce", price: 100, popular: true },
          { name: "Pizza Burger", description: "180g beef patty, tomato sauce, mozzarella and pepperoni", price: 105 },
          { name: "Gourmet Burger", description: "180g beef or chicken, sweet chilli, bacon, onion rings", price: 130 },
          { name: "Nacho Burger", description: "Chicken, bacon, sweet chilli, onion rings and nacho chips", price: 130, popular: true },
        ]
      },
      {
        name: "Small Plates",
        note: "Made for sharing",
        items: [
          { name: "Russian & Chips", description: "Extra russian for R15", price: 55 },
          { name: "Jalapeño Poppers", description: "Crumbed jalapeños stuffed with melted cheese", price: 65, popular: true },
          { name: "Nachos", description: "Spicy, mild or plain · half R60", price: 90 },
          { name: "Steak Strips", description: "With cheese or pepper sauce", price: 80 },
          { name: "Loaded Fries", description: "The basket that never makes it home", price: 60 },
          { name: "Plate of Fries", description: "Crisp and golden", price: 45 },
          { name: "Plate of Onion Rings", description: "Stacked high", price: 35 },
          { name: "Meatballs", description: "House-made, saucy", price: 60 },
        ]
      },
      {
        name: "Platters",
        note: "Built for the table",
        items: [
          { name: "Warrior Platter", description: "Steak strips, russian, wings, chicken strips, salad, chips and onion rings", price: 350, popular: true },
          { name: "Snack Platter", description: "Chicken strips, chicken wings, jalapeño poppers, chips and onion rings", price: 250 },
        ]
      },
      {
        name: "Steaks",
        note: "With chips and onion rings or salad",
        items: [
          { name: "200g Rump Steak", description: "Pepper or mushroom sauce", price: 110, popular: true },
          { name: "300g Rump Steak", description: "Pepper or mushroom sauce", price: 140 },
          { name: "200g Jalapeño Steak", description: "Pepper or mushroom sauce", price: 130 },
          { name: "300g Jalapeño Steak", description: "Pepper or mushroom sauce", price: 160 },
          { name: "250g Fillet Steak", description: "Pepper or mushroom sauce", price: 140 },
          { name: "Extra Sauce", description: "Cheese, pepper or mushroom", price: 25 },
        ]
      },
      {
        name: "Chicken Meals",
        note: "With chips, salad or vegetables",
        items: [
          { name: "Chicken Wings", description: "Glazed and grilled", price: 90, popular: true },
          { name: "Chicken Strips", description: "Golden and tender", price: 70 },
          { name: "Chicken Schnitzel", description: "Crumbed and pan-fried", price: 95 },
        ]
      },
      {
        name: "Toasted Sandwiches",
        note: "With chips",
        items: [
          { name: "Chicken Mayo", description: "The classic, done properly", price: 70 },
          { name: "Bacon & Cheese", description: "Melted through", price: 65 },
          { name: "Cheese & Tomato", description: "Simple and right", price: 50 },
        ]
      },
      {
        name: "Salads",
        note: "Fresh from the kitchen",
        items: [
          { name: "Greek Salad", description: "Lettuce, tomato, onion, cucumber, olives and feta", price: 55 },
          { name: "Jimmy's Salad", description: "Greek salad with chicken, bacon and avocado", price: 80, popular: true },
          { name: "Burger Salad", description: "Greek salad with a 180g patty, bacon and avocado", price: 90 },
          { name: "Chicken Salad", description: "Greek salad with chicken", price: 70 },
          { name: "Steak Salad", description: "Greek salad with steak", price: 85 },
        ]
      },
      {
        name: "Desserts",
        note: "Save space",
        items: [
          { name: "Cake of the Day", description: "Chocolate or carrot, whichever's fresh", price: 45 },
          { name: "Ice Cream & Chocolate Sauce", description: "The one the kids fight over", price: 30 },
          { name: "Affogato", description: "Ice cream and a shot of espresso", price: 45, popular: true },
        ]
      },
    ],
    // Photo tiles for the home-page favourites bento.
    // EVERY tile here is a real photograph of Jimmy's own food, taken from
    // their Instagram. Nothing generated, nothing stock.
    //
    // The three featured items are chosen to match the real photos we have -
    // not the other way round. If you want to feature a different dish, get a
    // real photo of it first; do not generate one to fill the tile. Generated
    // food on a real restaurant's site misrepresents what a customer will
    // actually be served.
    featured: [
      { name: "Smash Burger", description: "2 smashed patties, cheese and Jimmy's sauce, with chips", price: 100, image: "/images/gallery/burger-macro.jpg" },
      { name: "Warrior Platter", description: "Steak strips, russian, wings, chicken strips, salad, chips and onion rings", price: 350, image: "/images/menu/warrior-platter.jpeg" },
      { name: "Jimmy's Breakfast", description: "2 eggs, 2 bacon, toast, grilled tomato and chips. Served until 12.", price: 70, image: "/images/gallery/breakfast-plate.jpg" },
    ],
  },

  // ---- Drinks ---------------------------------------------------------------
  // Jimmy's real bar list, straight off their printed drinks menu.
  drinks: {
    intro: "The real Jimmy's bar list: local lagers, ciders by the bucket, house cocktails and proper coffee.",
    categories: [
      {
        name: "Beer",
        note: "Always cold",
        items: [
          { name: "Castle Lager", detail: "The local", price: 28 },
          { name: "Castle Lite", detail: "Extra cold", price: 28 },
          { name: "Black Label", detail: "Cold and consistent", price: 28 },
          { name: "Castle Milkstout", detail: "Dark and smooth", price: 28 },
          { name: "Windhoek Draught", detail: "440ml", price: 40, popular: true },
          { name: "Windhoek Lager", detail: "440ml", price: 40 },
          { name: "Heineken", detail: "Zero also in the fridge, R30", price: 30 },
          { name: "Corona", detail: "Lime included", price: 35 },
          { name: "Stella Artois", detail: "330ml", price: 35 },
        ]
      },
      {
        name: "Ciders & Coolers",
        items: [
          { name: "Savanna", detail: "Dry, Lite, Neat or non-alcoholic", price: 35, popular: true },
          { name: "Hunter's", detail: "Dry or Gold", price: 35 },
          { name: "Flying Fish", detail: "Pressed lemon", price: 30 },
          { name: "Belgravia", detail: "Dark Cherry or Dry Lemon", price: 35 },
          { name: "Red Square", detail: "Ice cold", price: 35 },
          { name: "Buffelsfontein & Kola", detail: "You know who you are", price: 35 },
        ]
      },
      {
        name: "Cocktails",
        note: "Shaken at the bar",
        items: [
          { name: "Frikkie van Zyl", detail: "Vodka, gin, orange juice and grenadine. The house special.", price: 70, tag: "House", popular: true },
          { name: "Margarita", detail: "Tequila, triple sec, fruit lagoon and lime", price: 70 },
          { name: "Martini", detail: "Martini Bianco, vodka, lime and lemon juice", price: 70 },
          { name: "Purple Rain", detail: "Vodka, Malibu, Butlers Blue, grenadine and lemonade", price: 80 },
          { name: "Strawberry Daiquiri", detail: "Vodka, Butlers strawberry, fruit lagoon and strawberry juice", price: 80 },
          { name: "Long Island Iced Tea", detail: "Malibu, Bacardi, vodka, gin, triple sec, tequila, lime and Coke", price: 160 },
        ]
      },
      {
        name: "Shots",
        note: "For the brave table",
        items: [
          { name: "Tequila", detail: "Gold or silver", price: 27 },
          { name: "Jägermeister", detail: "Ice cold", price: 27 },
          { name: "Jägerbomb", detail: "With Red Bull", price: 35, popular: true },
          { name: "Springbokkie", detail: "Green and gold", price: 22 },
          { name: "Melktertjie", detail: "Sweet and dangerous", price: 20 },
          { name: "Cactus Jack", detail: "Original R20, bubblegum R22", price: 20 },
        ]
      },
      {
        name: "Wine & Bubbles",
        note: "By the glass or bottle",
        items: [
          { name: "Two Oceans Sauvignon Blanc", detail: "Glass R40", price: 130 },
          { name: "Fyn Bos Chenin Blanc", detail: "Glass R45", price: 140 },
          { name: "Van Loveren Merlot", detail: "Bottle", price: 130 },
          { name: "Fyn Bos Merlot", detail: "Glass R45", price: 140 },
          { name: "Four Cousins Rosé", detail: "Bottle", price: 100 },
          { name: "JC Le Roux", detail: "Lachanson, Ledomaine or Lafleurette", price: 180, popular: true },
        ]
      },
      {
        name: "Coffee & Shakes",
        note: "All day",
        items: [
          { name: "Cappuccino", detail: "Double shot", price: 30 },
          { name: "Latte", detail: "Smooth", price: 35 },
          { name: "Hot Chocolate", detail: "Proper winter fuel", price: 40 },
          { name: "Iced Coffee", detail: "Cold brew over ice", price: 38 },
          { name: "Milkshake", detail: "Strawberry or chocolate · small R30", price: 45, popular: true },
          { name: "Rock Shandy", detail: "Lemonade, bitters and sparkling water", price: 50 },
        ]
      },
    ]
  },

  // ---- Testimonials -----------------------------------------------------
  // REAL, verbatim Google reviews from Jimmy's listing (4.7 stars, 64 reviews),
  // supplied by Christiaan on 2026-07-22. Do not edit the wording; if these
  // are ever swapped, the replacements must also be verbatim from Google.
  testimonials: [
    { name: "Nicole Delport", rating: 5, text: "Our waitress, Rea, was speedy, attentive and friendly. The drinks arrived quickly after we ordered. The burgers were well-prepared, and the patties were juicy and seasoned well. Overall, it was a pleasant experience!" },
    { name: "Linda Terblanche", rating: 5, text: "The service was good and the food excellent. I had a huge omelette and my husband the breakfast wrap. Highly recommend and will go again." },
    { name: "Eugene Prins", rating: 5, text: "Very tasty food at affordable prices, and a very welcoming atmosphere and friendly staff as well." },
  ],

  // Copy that a different restaurant would have to change. Marketing prose for
  // the home page lives with its sections, not here.
  copy: {
    brand: {
      tagline: "Good food. Good people.",
      builtBy: "Website by Streamline Automations.",
    },
    notFound: {
      cta: "Back to Jimmy's",
    },
    // Real claims only: menu, specials, address. No invented marketing.
    marquee: [
      "180g patties smashed to order",
      "ice-cold beers",
      "one big special every Friday",
      "57 Loch Street, Meyerton",
      "Coffee & Cars once a month",
    ],
    order: {
      intro: "Order directly from Jimmy's for collection.",
      confirmedHeading: "Jimmy's has received your order.",
      uncertain: "We could not verify receipt of your order. Contact Jimmy's with this reference before ordering again.",
      priorReferenceBody: "This tab previously sent an order request. Contact Jimmy's to check its status before placing another order.",
      softDrinksNote: "Cold, zero-proof and ready to add",
    },
    booking: {
      pendingNote: "This is a request, not a confirmed booking, until Jimmy's contacts you.",
      uncertain: "We could not verify receipt. Contact Jimmy's before sending another request to avoid a duplicate.",
    },
    documents: {
      filePrefix: "jimmys",
    },
  },

  socials: {
    facebook: "https://www.facebook.com/p/Jimmys-Burger-Bar-61560295359926/",
    instagram: "https://www.instagram.com/jimmys_burgerbar/",
  }
});
