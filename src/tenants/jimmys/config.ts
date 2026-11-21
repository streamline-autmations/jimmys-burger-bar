// ============================================================================
// CLIENT CONFIG — Jimmy's Burger Bar, 57 Loch St, Meyerton.
// Brand tokens, menu, drinks and specials are sourced from Jimmy's real brand
// collateral (logo, in-store menu and Instagram specials designed by Ameli van
// Zyl) — see the brand board at ameli-designs.netlify.app/projects/jimmys-burger-bar.
// ============================================================================

import { ZAR } from "../../core/domain/money";
import { defineRestaurant } from "../../core/config/define";
import { jimmysSections } from "./sections";

const smashBurgerPhoto = {
  src: "/images/gallery/smash-burger.jpg",
  alt: "Jimmy's Smash Burger with chips",
  objectPosition: "50% 27%",
};

const coldDrinks = [
  { name: "Coke", price: 22 },
  { name: "Sprite", price: 22 },
  { name: "Cappy", price: 22 },
  { name: "Still Water", price: 22 },
  { name: "Sparkling Water", price: 22 },
  { name: "Red Bull", price: 35 },
  { name: "Tonic", price: 17 },
  { name: "Pink Tonic", price: 17 },
  { name: "Lemonade", price: 17 },
  { name: "Ginger Ale", price: 17 },
  { name: "Grapetizer", price: 28 },
  { name: "Appletizer", price: 28 },
  { name: "Iced Tea", price: 22 },
];

const icedDrinks = [
  { name: "Iced Coffee", price: 45 },
  { name: "Strawberry Milkshake (Small)", price: 35 },
  { name: "Chocolate Milkshake (Small)", price: 35 },
  { name: "Strawberry Milkshake (Large)", price: 45 },
  { name: "Chocolate Milkshake (Large)", price: 45 },
];

const heinekenZero = { name: "Heineken Zero", price: 30 };
const savannah = { name: "Savannah", detail: "Dry, Lite, Neat or Non-Alcoholic", price: 35 };

// Jimmy's printed Extras and Extra Sauces boards, sold as standalone items.
// Extras photos are AI-generated (Codex, 2026-11-20) under the CLAUDE.md
// AI-imagery override and logged there. Swap for real photos when shot.
const extraBoard = [
  { name: "Extra Bacon", price: 25, image: "/images/menu/extras/extra-bacon.webp" },
  { name: "Extra Egg", price: 20, image: "/images/menu/extras/extra-egg.webp" },
  { name: "Extra Toast", price: 15, image: "/images/menu/extras/extra-toast.webp" },
  { name: "Extra Cheese Griller", price: 30, image: "/images/menu/extras/extra-cheese-griller.webp" },
  { name: "Extra Hashbrown", price: 30, image: "/images/menu/extras/extra-hashbrown.webp" },
  { name: "Extra Vienna", price: 25, image: "/images/menu/extras/extra-vienna.webp" },
  { name: "Extra Pork Banger", price: 30, image: "/images/menu/extras/extra-pork-banger.webp" },
  { name: "Extra Patty", price: 35, image: "/images/menu/extras/extra-patty.webp" },
  { name: "Extra Russian", price: 35, image: "/images/menu/extras/extra-russian.webp" },
  { name: "Extra Cheese Slice", price: 15, image: "/images/menu/extras/extra-cheese-slice.webp" },
  { name: "Extra Cheddar", price: 30, image: "/images/menu/extras/extra-cheddar.webp" },
  { name: "Extra Mozzarella", price: 30, image: "/images/menu/extras/extra-mozzarella.webp" },
  { name: "Extra Feta", price: 30, image: "/images/menu/extras/extra-feta.webp" },
  { name: "Extra Cream Cheese", price: 35, image: "/images/menu/extras/extra-cream-cheese.webp" },
  { name: "Extra Jalapeños", price: 20, image: "/images/menu/extras/extra-jalapenos.webp" },
  { name: "Extra Avocado", description: "Seasonal", price: 30, image: "/images/menu/extras/extra-avocado.webp" },
  { name: "Extra Mushroom", price: 30, image: "/images/menu/extras/extra-mushroom.webp" },
  { name: "Extra Guacamole", price: 30, image: "/images/menu/extras/extra-guacamole.webp" },
  { name: "Extra Tomato", price: 10, image: "/images/menu/extras/extra-tomato.webp" },
];
// Extra Sauces photos are AI-generated (Codex, 2026-11-20) under the CLAUDE.md
// AI-imagery override and logged there. Swap for real photos when shot.
const sauceBoard = [
  { name: "Extra Cheese Sauce", price: 30, image: "/images/menu/extra-sauces/extra-cheese-sauce.webp" },
  { name: "Extra Pepper Sauce", price: 30, image: "/images/menu/extra-sauces/extra-pepper-sauce.webp" },
  { name: "Extra Mushroom Sauce", price: 30, image: "/images/menu/extra-sauces/extra-mushroom-sauce.webp" },
];
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

  // The four-stage first-load sequence is Jimmy's signature. routeHold is
  // 0.2s by client direction (2026-09-14): at 0.5 the curtain logo overstayed.
  motion: {
    intro: "full" as const,
    routeHold: 0.2,
  },

  venue: {
    name: "Jimmy's",
    nameSuffix: "Burger Bar",
    locality: "Meyerton",
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
    // Product default pending Christiaan's confirmation: collection orders for
    // up to a week ahead. Set to 0 to restrict ordering to today.
    maxDaysAhead: 7,
    collectionNote: "Collection requested at 57 Loch Street. Please wait for Jimmy's to confirm the time.",
    tableNote: "Table service requested. Please check with staff before ordering.",
    deliveryNote: "Delivery requested. Jimmy's must confirm availability, timing and any delivery charge.",
    nonAlcoholicDrinks: [
      ...coldDrinks,
      ...icedDrinks,
      heinekenZero,
      { name: "Savannah Non-Alcoholic", price: savannah.price },
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
  // Jimmy's supplied menu board and price workbook.
  menu: {
    // Jimmy's own designed menu. Without `pdf`, the site builds a plain PDF from the board.
    pdf: "/jimmys-menu.pdf",
    categories: [
      {
        name: "Breakfast",
        // Codex generated Avo on Toast, Carb Clever Breakfast, Breakfast Wrap, Eggs
        // Benedict and Mince on Toast (2026-11-19) under the CLAUDE.md AI-imagery override.
        // Breakfast Bun and Breakfast Burger use earlier AI photos. Jimmy's Breakfast
        // and Omelette use real photos. Swap the AI photos for real photos when shot.
        note: "Served until 12pm",
        availableUntil: "12:00",
        items: [
          { name: "Breakfast Bun", description: "Bacon, egg and cheese bun with chips", price: 70, image: "/images/menu/breakfast/breakfast-bun.webp" },
          { name: "Breakfast Burger", description: "120g beef burger with egg, bacon and chips", price: 105, popular: true, image: "/images/menu/breakfast/breakfast-burger.webp" },
          { name: "Jimmy's Breakfast", description: "2 eggs, 2 bacon, toast, grilled tomato and chips", price: 80, popular: true, image: "/images/menu/breakfast/jimmys-breakfast.webp" },
          { name: "Avo on Toast", description: "Seasonal. 2 pieces of avocado toast. Extra bacon R25.", price: 50, image: "/images/menu/breakfast/avo-on-toast-updated.webp" },
          { name: "Omelette", description: "3-cheese omelette with toast and 2 fillings: bacon, mushroom, tomatoes or pepper", price: 95, image: "/images/menu/breakfast/omelette.webp" },
          { name: "Carb Clever Breakfast", description: "Seasonal. 2 eggs, half an avocado, bacon, raw tomato, mozzarella and cheddar.", price: 80, image: "/images/menu/breakfast/carb-clever-breakfast-updated.webp" },
          { name: "Breakfast Wrap", description: "Seasonal. Eggs, bacon, avocado, feta, mozzarella, cheddar, lettuce and tomato.", price: 105, image: "/images/menu/breakfast/breakfast-wrap.webp" },
          { name: "Eggs Benedict", description: "2 poached eggs, bacon, hashbrown and hollandaise sauce", price: 110, image: "/images/menu/breakfast/eggs-benedict.webp" },
          { name: "Mince on Toast", description: "2 pieces of toast with mince", price: 80, image: "/images/menu/breakfast/mince-on-toast.webp" },
        ]
      },
      {
        name: "Burgers",
        // Chicken, Smash, Gourmet Beef, Gourmet Chicken and Nacho Burger photos are
        // AI-generated (Codex, 2026-11-19) under the CLAUDE.md AI-imagery override and
        // logged there. Pizza Burger is also AI (2026-09-28). Beef Burger is a real iPhone photo.
        note: "With chips · served all day",
        items: [
          { name: "Beef Burger", description: "180g beef patty, cheese, tomato, lettuce and Jimmy's sauce", price: 100, image: "/images/menu/burgers/beef-burger.webp" },
          { name: "Chicken Burger", description: "Crumbed chicken fillet, cheese sauce, tomato, lettuce and Jimmy's sauce", price: 100, image: "/images/menu/burgers/chicken-burger-v2.webp" },
          { name: "Smash Burger", description: "2 smashed patties, cheese, peppers, onions and Jimmy's sauce", price: 110, popular: true, image: "/images/menu/burgers/smash-burger-v2.webp" },
          { name: "Pizza Burger", description: "180g beef patty, Napolitana sauce, mozzarella and pepperoni", price: 120, image: "/images/menu/burgers/pizza-burger.webp" },
          { name: "Gourmet Beef Burger", description: "180g crumbed beef patty, bacon, onion rings and pepper sauce", price: 145, image: "/images/menu/burgers/gourmet-beef-burger.webp" },
          { name: "Gourmet Chicken Burger", description: "Crumbed chicken fillet, sweet chilli sauce, bacon, onion rings and cheese sauce", price: 145, image: "/images/menu/burgers/gourmet-chicken-burger.webp" },
          { name: "Nacho Burger", description: "Seasonal. 2 smashed patties, bacon, sweet chilli, nacho chips, onion rings and guacamole.", price: 145, image: "/images/menu/burgers/nacho-burger-v2.webp" },
        ]
      },
      {
        name: "Small Plates",
        // Nachos (Full) and Meatballs use real iPhone photos. The other Small Plates
        // photos are AI-generated (Codex, 2026-11-19) under the CLAUDE.md AI-imagery
        // override and logged there. Swap for real photos when shot.
        items: [
          { name: "Russian & Chips", description: "Extra Russian R35", price: 65, image: "/images/menu/small-plates/russian-and-chips.webp" },
          { name: "Jalapeño Poppers (Half)", description: "Seasonal. 2 homemade jalapeño poppers.", price: 65, image: "/images/menu/small-plates/jalapeno-poppers-half.webp" },
          { name: "Jalapeño Poppers (Full)", description: "Seasonal. 4 homemade jalapeño poppers.", price: 100, image: "/images/menu/small-plates/jalapeno-poppers-full.webp" },
          { name: "Nachos (Half)", description: "Seasonal. Nacho chips with cheese, salsa and guacamole, mild or spicy. Extra cream cheese R35.", price: 80, image: "/images/menu/small-plates/nachos-half.webp" },
          { name: "Nachos (Full)", description: "Seasonal. Nacho chips with cheese, salsa and guacamole, mild or spicy. Extra cream cheese R35.", price: 130, image: "/images/menu/small-plates/nachos.webp" },
          { name: "Steak Strips", description: "180g basted steak strips with cheese, pepper or mushroom sauce", price: 110, image: "/images/menu/small-plates/steak-strips.webp" },
          { name: "Loaded Fries", description: "Chips with cheese, bacon and chicken. Extra Russian with this dish R30.", price: 90, image: "/images/menu/small-plates/loaded-fries.webp" },
          { name: "Loaded Fries with Extra Russian", description: "Chips with cheese, bacon, chicken and an extra Russian", price: 90 + 30, image: "/images/menu/small-plates/loaded-fries-extra-russian.webp" },
          { name: "Plate of Chips", price: 50, image: "/images/menu/small-plates/plate-of-chips.webp" },
          { name: "Plate of Onion Rings", price: 40, image: "/images/menu/small-plates/plate-of-onion-rings.webp" },
          { name: "Meatballs", description: "4 meatballs with basting", price: 70, image: "/images/menu/small-plates/meatballs.webp" },
          { name: "Italian Meatballs", description: "4 meatballs with Napolitana sauce and mozzarella", price: 90, image: "/images/menu/small-plates/italian-meatballs.webp" },
          { name: "Mozzarella Sticks", description: "3 homemade sticks with sweet chilli sauce", price: 90, image: "/images/menu/small-plates/mozzarella-sticks.webp" },
          { name: "Halloumi Sticks", description: "3 grilled sticks with sweet chilli sauce", price: 110, image: "/images/menu/small-plates/halloumi-sticks.webp" },
          { name: "Crumbed Mushroom", description: "6 homemade panko-crusted mushrooms with cheese, pepper or mushroom sauce", price: 80, image: "/images/menu/small-plates/crumbed-mushroom.webp" },
        ]
      },
      {
        name: "Platters",
        items: [
          { name: "Warrior Platter", description: "Steak strips, Russian, wings, chicken strips, salad, chips and onion rings", price: 385, popular: true, image: "/images/menu/platters/warrior-platter.webp" },
          { name: "Snack Platter", description: "Seasonal. Chicken strips, chicken wings, jalapeño poppers, chips and onion rings.", price: 275, image: "/images/menu/platters/snack-platter.webp" },
        ]
      },
      {
        name: "Steaks",
        note: "With chips and onion rings or salad",
        items: [
          { name: "200g Rump Steak", price: 140, popular: true, image: "/images/menu/steaks/rump-steak.webp" },
          { name: "300g Rump Steak", price: 155, image: "/images/menu/steaks/rump-steak.webp" },
          { name: "200g Jalapeño Rump Steak", description: "With cheese, pepper or mushroom sauce", price: 145, image: "/images/menu/steaks/jalapeno-steak.webp" },
          { name: "300g Jalapeño Rump Steak", description: "With cheese, pepper or mushroom sauce", price: 175, image: "/images/menu/steaks/jalapeno-steak.webp" },
          { name: "250g Fillet Steak", description: "With pepper or mushroom sauce", price: 155, image: "/images/menu/steaks/fillet-steak.webp" },
        ]
      },
      {
        name: "Chicken Meals",
        // Chicken Wings, Chicken Strips and Chicken Schnitzel (Half) are AI-generated
        // (Codex, 2026-11-19) under the CLAUDE.md override. The Full photo is real.
        note: "With chips, salad or vegetables",
        items: [
          { name: "Chicken Wings", description: "3 wings with sweet chilli sauce", price: 100, popular: true, image: "/images/menu/chicken-meals/chicken-wings-three.webp" },
          { name: "Chicken Strips", description: "6 homemade panko-crusted strips with sweet chilli sauce", price: 80, image: "/images/menu/chicken-meals/chicken-strips-six.webp" },
          { name: "Chicken Schnitzel (Half)", description: "Homemade panko-crusted schnitzel with cheese, pepper or mushroom sauce", price: 80, image: "/images/menu/chicken-meals/chicken-schnitzel-half.webp" },
          { name: "Chicken Schnitzel (Full)", description: "Homemade panko-crusted schnitzel with cheese, pepper or mushroom sauce", price: 130, image: "/images/menu/chicken-meals/chicken-schnitzel.webp" },
        ]
      },
      {
        name: "Toasted Sandwiches",
        // Toasted Sandwiches photos are AI-generated (Codex, 2026-11-19) under the
        // CLAUDE.md AI-imagery override and logged there. Swap for real photos when shot.
        note: "With chips",
        items: [
          { name: "Chicken Mayo & Mozzarella", price: 80, image: "/images/menu/toasted-sandwiches/chicken-mayo-and-mozzarella.webp" },
          { name: "Bacon & Cheese", price: 70, image: "/images/menu/toasted-sandwiches/bacon-and-cheese.webp" },
          { name: "Cheese & Tomato", price: 55, image: "/images/menu/toasted-sandwiches/cheese-and-tomato.webp" },
          { name: "Bacon, Egg & Cheese", price: 80, image: "/images/menu/toasted-sandwiches/bacon-egg-and-cheese.webp" },
          { name: "Bacon, Mushroom & Cheese", price: 80, image: "/images/menu/toasted-sandwiches/bacon-mushroom-and-cheese.webp" },
        ]
      },
      {
        name: "Wraps",
        // Wraps photos are AI-generated (Codex, 2026-11-19) under the CLAUDE.md
        // AI-imagery override and logged there. Swap for real photos when shot.
        note: "With chips",
        items: [
          { name: "Chicken Wrap", description: "Crumbed chicken, feta, mozzarella, cheddar, lettuce, tomato, red onion and bell peppers", price: 105, image: "/images/menu/wraps/chicken-wrap.webp" },
          { name: "Steak Strip Wrap", description: "200g steak strips, feta, mozzarella, cheddar, lettuce, tomato and red onions", price: 130, image: "/images/menu/wraps/steak-strip-wrap.webp" },
        ]
      },
      {
        name: "Salads",
        // Greek Salad, Burger Salad, Chicken Salad and Halloumi Salad use AI photos
        // under the CLAUDE.md override. Steak Salad and Jimmy's Salad use real photos.
        items: [
          { name: "Greek Salad", description: "Lettuce, tomato, onion, cucumber, olives and feta", price: 70, image: "/images/menu/salads/greek-salad.webp" },
          { name: "Chicken Salad", description: "Seasonal. Lettuce, tomato, onion, cucumber, olives, feta, chicken and avocado.", price: 110, image: "/images/menu/salads/chicken-salad-with-avocado.webp" },
          { name: "Steak Salad", description: "Seasonal. Lettuce, tomato, onion, cucumber, olives, feta, steak strips and avocado.", price: 120, image: "/images/menu/salads/steak-salad.webp" },
          { name: "Jimmy's Salad", description: "Seasonal. Lettuce, tomato, onion, cucumber, olives, feta, chicken, bacon and avocado.", price: 130, image: "/images/menu/salads/jimmys-salad.webp" },
          { name: "Burger Salad", description: "Seasonal. Lettuce, tomato, onion, cucumber, olives, feta, a 180g patty, bacon and avocado.", price: 140, image: "/images/menu/salads/burger-salad.webp" },
          { name: "Halloumi Salad", description: "Seasonal. Lettuce, tomato, onion, cucumber, olives, halloumi, avocado and bacon.", price: 110, image: "/images/menu/salads/halloumi-salad.webp" },
        ]
      },
      {
        name: "Desserts",
        // Cake of the Day (Codex, 2026-11-20) and Ice Cream & Chocolate Sauce (Codex,
        // 2026-11-19) are AI-generated under the CLAUDE.md AI-imagery override.
        // Italian Kisses and Affogato use real photos.
        items: [
          { name: "Cake of the Day", price: 50, image: "/images/menu/desserts/cake-of-the-day.webp" },
          { name: "Ice Cream & Chocolate Sauce", price: 35, image: "/images/menu/desserts/ice-cream-and-chocolate-sauce.webp" },
          { name: "Italian Kisses (4 pieces)", price: 60, image: "/images/menu/desserts/italian-kisses.webp" },
          { name: "Affogato", description: "Ice cream and espresso", price: 50, popular: true, image: "/images/menu/desserts/affogato.webp" },
        ]
      },
      { name: "Extras", items: extraBoard },
      { name: "Extra Sauces", items: sauceBoard },
    ],
    // The featured Smash Burger uses the same AI source as its menu thumbnail.
    featured: [
      { name: "Smash Burger", description: "2 smashed patties, cheese, peppers, onions and Jimmy's sauce, with chips", price: 110, image: "/images/menu/burgers/smash-burger-v2-large.jpg" },
      { name: "Warrior Platter", description: "Steak strips, Russian, wings, chicken strips, salad, chips and onion rings", price: 385, image: "/images/menu/warrior-platter.jpeg" },
      { name: "Jimmy's Breakfast", description: "2 eggs, 2 bacon, toast, grilled tomato and chips. Served until 12pm.", price: 80, image: "/images/gallery/breakfast-plate.jpg" },
    ],
  },

  // ---- Drinks ---------------------------------------------------------------
  // The full printed bar list can be browsed on Food & Drinks.
  drinks: {
    intro: "Cold drinks, coffee, shakes, beers, ciders, spirits and cocktails.",
    categories: [
      {
        name: "Cold Drinks",
        items: coldDrinks,
      },
      {
        name: "Beer & Ciders",
        items: [
          { name: "Windhoek Draught", price: 40, popular: true },
          { name: "Swagga Draught", detail: "California Blonde", price: 45 },
          { name: "Castle Lager", price: 28 },
          { name: "Castle Lite", price: 28 },
          { name: "Castle Milkstout", price: 28 },
          { name: "Heineken", price: 30 },
          heinekenZero,
          { name: "Black Label", price: 28 },
          { name: "Corona", price: 35 },
          { name: "Stella Artois", price: 35 },
          savannah,
          { name: "Hunters", detail: "Dry or Gold", price: 35 },
          { name: "Flying Fish", price: 30 },
          { name: "R&R", price: 35 },
          { name: "Belgravia", detail: "Dark Cherry or Dry Lemon", price: 35 },
          { name: "Red Square", price: 35 },
          { name: "Buffelsfontein & Kola", price: 35 },
          { name: "Bernini", price: 30 },
        ]
      },
      {
        name: "Hot Drinks",
        items: [
          { name: "Cappuccino", price: 30 },
          { name: "Latte", price: 35 },
          { name: "Espresso", price: 25 },
          { name: "Cortado", price: 28 },
          { name: "Coffee", price: 25 },
          { name: "Hot Chocolate", price: 40 },
          { name: "Tea (Cup)", price: 20 },
          { name: "Tea (Pot)", price: 40 },
        ]
      },
      {
        name: "Iced Drinks",
        items: icedDrinks,
      },
      {
        name: "Mixed Drinks",
        items: [
          { name: "Rock Shandy", detail: "Lemonade, bitters and sparkling water", price: 50 },
          { name: "Steel Works", detail: "Ginger ale, cola tonic and bitters", price: 40 },
        ]
      },
      {
        name: "Cordial",
        items: [
          { name: "Passionfruit", price: 10 },
          { name: "Lime", price: 10 },
          { name: "Cola Tonic", price: 10 },
        ]
      },
      {
        name: "Brandy",
        items: [
          { name: "Klipdrift", price: 25 },
          { name: "Richelieu", price: 25 },
          { name: "Olof Bergh", price: 25 },
          { name: "Buffelfontein", price: 25 },
          { name: "KWV", price: 25 },
          { name: "Klipdrift Premium", price: 30 },
        ]
      },
      {
        name: "Rum",
        items: [
          { name: "Captain Morgan", detail: "Spiced Gold or Dark Rum", price: 28 },
          { name: "Redheart", price: 30 },
        ]
      },
      {
        name: "Whiskey",
        items: [
          { name: "Bell’s", price: 28 },
          { name: "J&B", price: 28 },
          { name: "Jameson", price: 32 },
          { name: "Scottish Leader", price: 25 },
          { name: "Label 5", price: 25 },
          { name: "Johnnie Walker Black", price: 32 },
        ]
      },
      {
        name: "Vodka",
        items: [
          { name: "Smirnoff", price: 25 },
          { name: "Pushkin", price: 25 },
        ]
      },
      {
        name: "Gin",
        items: [
          { name: "Gordons", price: 25 },
          { name: "Tanqueray", price: 35 },
          { name: "Old Buck", price: 20 },
        ]
      },
      {
        name: "Shots",
        items: [
          { name: "Tequila", detail: "Gold or silver", price: 27 },
          { name: "Jägermeister", price: 27 },
          { name: "Melktertjie", price: 20 },
          { name: "Springbokkie", price: 22 },
          { name: "Cactus Jack Original", price: 20 },
          { name: "Cactus Jack Bubblegum", price: 22 },
          { name: "Oester", price: 25 },
          { name: "Jägerbomb", price: 35, popular: true },
        ]
      },
      {
        name: "Cocktails",
        items: [
          { name: "Frikkie van Zyl", detail: "Vodka, gin, orange juice and grenadine", price: 70, popular: true },
          { name: "Martini", detail: "Martini Blanco, vodka, lime and lemon juice", price: 80 },
          { name: "Margarita", detail: "Bacardi, tequila, triple sec, fruit lagoon and lime", price: 85 },
          { name: "Aperol Spritz", detail: "Aperol, Prosecco and soda water", price: 95 },
          { name: "Tequila Sunrise", detail: "Tequila, orange juice and grenadine", price: 70 },
          { name: "Purple Rain / Hurricane", detail: "Vodka, Malibu, Butlers Blue, grenadine and lemonade", price: 80 },
          { name: "Strawberry Daiquiri", detail: "Vodka, Butlers Strawberry, fruit lagoon and strawberry juice", price: 80 },
          { name: "Long Island Iced Tea", detail: "Malibu, Bacardi, vodka, gin, triple sec, tequila, lime and Coke", price: 145 },
          { name: "Blue Lagoon", detail: "Butlers Blue, Malibu, vodka and Sprite", price: 85 },
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

  // Words and photographs on the fixed pages that belong to Jimmy's alone.
  pages: {
    order: { image: smashBurgerPhoto },
    visit: {
      script: "your night out, sorted",
      heading: "Meet you at Jimmy’s.",
      intro: "Come hungry, find your table and stay awhile. The food, the bar and the people are all right here on Loch Street.",
      heroImage: { src: "/images/gallery/heritage-day-team.jpg", alt: "The Jimmy's Burger Bar team outside the restaurant" },
      address: { line1: "57 Loch Street", line2: "Meyerton, Gauteng" },
      galleryHeading: "This is Jimmy’s.",
      gallery: [
        { src: "/images/gallery/burger-duo.jpg", caption: "Burgers for the table" },
        { src: "/images/gallery/heritage-day-team.jpg", caption: "The Jimmy’s crew" },
        { src: "/images/campaign/coffee-cars.webp", caption: "Coffee & Cars Sundays" },
        { src: "/images/gallery/greek-meze.jpg", caption: "Plates made for sharing" },
        { src: "/images/gallery/fireplace-corner.jpg", caption: "The corner regulars know" },
        { src: "/images/gallery/corona-sunset.jpg", caption: "One more before sunset" },
      ],
    },
    menu: {
      script: "the whole Jimmy's board",
      food: {
        description: "Breakfast, 180g burgers, plates for the table and the full kitchen board.",
        caption: "Fresh off the grill.",
        // AI-generated from the real Smash Burger photo (2026-11-21), logged in CLAUDE.md.
        image: { src: "/images/menu/food-header/food-header-desktop.webp", alt: "Jimmy's Smash Burger with chips on the bar" },
        imageMobile: "/images/menu/food-header/food-header-mobile.webp",
      },
      drinks: {
        description: "Cold drinks, local beers, ciders, cocktails and coffee.",
        caption: "Straight from the bar.",
        video: "/videos/drinks-pour-loop.mp4",
      },
      // Posters Christiaan made 2026-11-20 (Images/Mobile-app-promos). Pictures only: none of these
      // specials is an orderable menu item, so the cart charges menu prices (Christiaan accepted this).
      promos: [
        { src: "/images/promos/friday-skaap-card.webp", full: "/images/promos/friday-skaap.webp", alt: "Friday special: Italian style skaap and slaai, only R145, while stocks last" },
        { src: "/images/promos/burger-special-card.webp", full: "/images/promos/burger-special.webp", alt: "Burger special on Mondays and Wednesdays: 2 chicken or 120g beef burgers, only R120" },
        { src: "/images/promos/coffee-and-cars-card.webp", full: "/images/promos/coffee-and-cars.webp", alt: "Coffee and Cars, first Sunday of every month from 9am, at 57 Loch Street" },
      ],
    },
  },

  sections: jimmysSections,

  socials: {
    facebook: "https://www.facebook.com/p/Jimmys-Burger-Bar-61560295359926/",
    instagram: "https://www.instagram.com/jimmys_burgerbar/",
  }
});
