// ============================================================================
// CLIENT CONFIG — Jimmy's Burger Bar, 57 Loch St, Meyerton.
// Brand tokens, menu, drinks and specials are sourced from Jimmy's real brand
// collateral (logo, in-store menu and Instagram specials designed by Ameli van
// Zyl) — see the brand board at ameli-designs.netlify.app/projects/jimmys-burger-bar.
// ============================================================================

export const config = {
  // ---- Feature flags -------------------------------------------------------
  // Premium/paid features stay OFF by default — they are the upsell.
  features: {
    ordering: true,       // online ordering + cart — upsell demo, now live
    reservations: false,  // table booking system (not yet built)
    scrollVideo: false,   // experimental scroll-scrubbed hero (R&D)
  },

  // ---- Visual identity ------------------------------------------------------
  // Jimmy's real palette, lifted from their printed menu and Instagram posters:
  //   paper   = powder blue page background (their menu paper)
  //   surface = ice-white panels (their menu item panels)
  //   ink     = deep navy TEXT + dark section background (their logo oval)
  //   primary = royal blue (menu headers, poster type)
  //   secondary = periwinkle (the script "Jimmy's" in the logo)
  //   accent  = golden yellow (their "ONLY R120" starburst stickers)
  theme: {
    colors: {
      primary: "#1D4E94",
      secondary: "#7C8FCB",
      ink: "#1E2A4E",
      paper: "#D3DFE6",
      surface: "#F2F7F9",
      accent: "#F2A93B",
    },
    fonts: {
      display: "'Baloo 2', sans-serif",
      body: "'Quicksand', sans-serif",
      script: "'Pacifico', cursive",
    },
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
    googleMapsEmbed: "https://maps.google.com/maps?q=Jimmy%27s+Burger+Bar+Meyerton&output=embed",
    // Real trading hours, confirmed by Christiaan 2026-07-22.
    // NOTE: Sundays are closed EXCEPT the monthly Coffee & Cars morning
    // (specials.event) — that one Sunday they open for the event.
    hours: [
      { day: "Mon – Tue", time: "09:00 – 20:00" },
      { day: "Wed – Thu", time: "09:00 – 21:00" },
      { day: "Fri – Sat", time: "09:00 – 00:00" },
      { day: "Sunday", time: "Closed" },
    ],
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
      { name: "Menu", path: "/menu" },
      { name: "Drinks", path: "/drinks" },
      { name: "Specials", path: "/specials" },
      { name: "Gallery", path: "/gallery" },
      { name: "Visit", path: "/visit" },
    ]
  },

  // ---- Online ordering (upsell demo) ---------------------------------------
  // Client-side only: cart -> WhatsApp deep link. The wait time and order
  // tracking below are illustrative (demo of what the paid feature looks
  // like), never real kitchen data — gated entirely behind features.ordering.
  ordering: {
    avgWaitMins: 18,
    orderPrefix: "JB",
    collectionNote: "Ready for collection at 57 Loch Street.",
    tableNote: "We'll bring it straight to your table.",
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
      { title: "Osso Buco", price: "R120", description: "Slow-braised beef shank, rich gravy, creamy mash and veg. Pure comfort food done right.", note: "While stocks last", poster: "/images/specials/osso-buco.jpg" },
      { title: "Chicken Prego Roll", price: "R120", description: "Juicy chicken prego with chips, and a free Windhoek draught on the side.", note: "Free draught included", poster: "/images/specials/chicken-prego-roll.jpg" },
      { title: "Greek Platter", price: "R180", description: "Homemade chicken, meatballs, steak strips, olives, salad, chips and flatbread with hummus and tsatsiki.", note: "While stocks last", poster: "/images/specials/greek-platter.jpg" },
      { title: "Mexican Friday", price: "R120", description: "Five ice-cold Coronas for the table. Pair them with tacos and the Mexican burger.", note: "5x Corona", poster: "/images/specials/mexican-friday.jpg" },
      { title: "Chicken Souvlaki", price: "", description: "Greek-style grilled chicken skewers served with pita, chips and salad.", note: "Ask what it's on for" },
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
          { name: "Breakfast Bun", description: "Bun with bacon, egg and cheese, with chips", price: "R60" },
          { name: "Breakfast Burger", description: "Beef burger with egg, bacon and chips", price: "R95", popular: true },
          { name: "Jimmy's Breakfast", description: "2 eggs, 2 bacon, toast, grilled tomato and chips", price: "R70", popular: true },
          { name: "Avo on Toast", description: "Smashed avo on toast with grilled tomatoes", price: "R60" },
          { name: "Omelette", description: "Bacon and mushroom, or mushroom and cheese", price: "R60" },
          { name: "Carb Clever Breakfast", description: "2 eggs, 2 bacon, tomato and avo", price: "R60" },
        ]
      },
      {
        name: "Burgers",
        note: "With chips · served all day",
        items: [
          { name: "Beef Burger", description: "180g beef patty, cheese, tomato, lettuce and Jimmy's sauce", price: "R90" },
          { name: "Chicken Burger", description: "Chicken patty, cheese sauce, tomato, lettuce and Jimmy's sauce", price: "R90" },
          { name: "Smash Burger", description: "2 smashed patties, cheese and Jimmy's sauce", price: "R100", popular: true },
          { name: "Pizza Burger", description: "180g beef patty, tomato sauce, mozzarella and pepperoni", price: "R105" },
          { name: "Gourmet Burger", description: "180g beef or chicken, sweet chilli, bacon, onion rings", price: "R130" },
          { name: "Nacho Burger", description: "Chicken, bacon, sweet chilli, onion rings and nacho chips", price: "R130", popular: true },
        ]
      },
      {
        name: "Small Plates",
        note: "Made for sharing",
        items: [
          { name: "Russian & Chips", description: "Extra russian for R15", price: "R55" },
          { name: "Jalapeño Poppers", description: "Crumbed jalapeños stuffed with melted cheese", price: "R65", popular: true },
          { name: "Nachos", description: "Spicy, mild or plain · half R60", price: "R90" },
          { name: "Steak Strips", description: "With cheese or pepper sauce", price: "R80" },
          { name: "Loaded Fries", description: "The basket that never makes it home", price: "R60" },
          { name: "Plate of Fries", description: "Crisp and golden", price: "R45" },
          { name: "Plate of Onion Rings", description: "Stacked high", price: "R35" },
          { name: "Meatballs", description: "House-made, saucy", price: "R60" },
        ]
      },
      {
        name: "Platters",
        note: "Built for the table",
        items: [
          { name: "Warrior Platter", description: "Steak strips, russian, wings, chicken strips, salad, chips and onion rings", price: "R350", popular: true },
          { name: "Snack Platter", description: "Chicken strips, chicken wings, jalapeño poppers, chips and onion rings", price: "R250" },
        ]
      },
      {
        name: "Steaks",
        note: "With chips and onion rings or salad",
        items: [
          { name: "200g Rump Steak", description: "Pepper or mushroom sauce", price: "R110", popular: true },
          { name: "300g Rump Steak", description: "Pepper or mushroom sauce", price: "R140" },
          { name: "200g Jalapeño Steak", description: "Pepper or mushroom sauce", price: "R130" },
          { name: "300g Jalapeño Steak", description: "Pepper or mushroom sauce", price: "R160" },
          { name: "250g Fillet Steak", description: "Pepper or mushroom sauce", price: "R140" },
          { name: "Extra Sauce", description: "Cheese, pepper or mushroom", price: "R25" },
        ]
      },
      {
        name: "Chicken Meals",
        note: "With chips, salad or vegetables",
        items: [
          { name: "Chicken Wings", description: "Glazed and grilled", price: "R90", popular: true },
          { name: "Chicken Strips", description: "Golden and tender", price: "R70" },
          { name: "Chicken Schnitzel", description: "Crumbed and pan-fried", price: "R95" },
        ]
      },
      {
        name: "Toasted Sandwiches",
        note: "With chips",
        items: [
          { name: "Chicken Mayo", description: "The classic, done properly", price: "R70" },
          { name: "Bacon & Cheese", description: "Melted through", price: "R65" },
          { name: "Cheese & Tomato", description: "Simple and right", price: "R50" },
        ]
      },
      {
        name: "Salads",
        note: "Fresh from the kitchen",
        items: [
          { name: "Greek Salad", description: "Lettuce, tomato, onion, cucumber, olives and feta", price: "R55" },
          { name: "Jimmy's Salad", description: "Greek salad with chicken, bacon and avocado", price: "R80", popular: true },
          { name: "Burger Salad", description: "Greek salad with a 180g patty, bacon and avocado", price: "R90" },
          { name: "Chicken Salad", description: "Greek salad with chicken", price: "R70" },
          { name: "Steak Salad", description: "Greek salad with steak", price: "R85" },
        ]
      },
      {
        name: "Desserts",
        note: "Save space",
        items: [
          { name: "Cake of the Day", description: "Chocolate or carrot, whichever's fresh", price: "R45" },
          { name: "Ice Cream & Chocolate Sauce", description: "The one the kids fight over", price: "R30" },
          { name: "Affogato", description: "Ice cream and a shot of espresso", price: "R45", popular: true },
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
      { name: "Smash Burger", description: "2 smashed patties, cheese and Jimmy's sauce, with chips", price: "R100", image: "/images/gallery/burger-macro.jpg" },
      { name: "Warrior Platter", description: "Steak strips, russian, wings, chicken strips, salad, chips and onion rings", price: "R350", image: "/images/menu/warrior-platter.jpeg" },
      { name: "Jimmy's Breakfast", description: "2 eggs, 2 bacon, toast, grilled tomato and chips. Served until 12.", price: "R70", image: "/images/gallery/breakfast-plate.jpg" },
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
          { name: "Castle Lager", detail: "The local", price: "R28" },
          { name: "Castle Lite", detail: "Extra cold", price: "R28" },
          { name: "Black Label", detail: "Cold and consistent", price: "R28" },
          { name: "Castle Milkstout", detail: "Dark and smooth", price: "R28" },
          { name: "Windhoek Draught", detail: "440ml", price: "R40", popular: true },
          { name: "Windhoek Lager", detail: "440ml", price: "R40" },
          { name: "Heineken", detail: "Zero also in the fridge, R30", price: "R30" },
          { name: "Corona", detail: "Lime included", price: "R35" },
          { name: "Stella Artois", detail: "330ml", price: "R35" },
        ]
      },
      {
        name: "Ciders & Coolers",
        items: [
          { name: "Savanna", detail: "Dry, Lite, Neat or non-alcoholic", price: "R35", popular: true },
          { name: "Hunter's", detail: "Dry or Gold", price: "R35" },
          { name: "Flying Fish", detail: "Pressed lemon", price: "R30" },
          { name: "Belgravia", detail: "Dark Cherry or Dry Lemon", price: "R35" },
          { name: "Red Square", detail: "Ice cold", price: "R35" },
          { name: "Buffelsfontein & Kola", detail: "You know who you are", price: "R35" },
        ]
      },
      {
        name: "Cocktails",
        note: "Shaken at the bar",
        items: [
          { name: "Frikkie van Zyl", detail: "Vodka, gin, orange juice and grenadine. The house special.", price: "R70", tag: "House", popular: true },
          { name: "Margarita", detail: "Tequila, triple sec, fruit lagoon and lime", price: "R70" },
          { name: "Martini", detail: "Martini Bianco, vodka, lime and lemon juice", price: "R70" },
          { name: "Purple Rain", detail: "Vodka, Malibu, Butlers Blue, grenadine and lemonade", price: "R80" },
          { name: "Strawberry Daiquiri", detail: "Vodka, Butlers strawberry, fruit lagoon and strawberry juice", price: "R80" },
          { name: "Long Island Iced Tea", detail: "Malibu, Bacardi, vodka, gin, triple sec, tequila, lime and Coke", price: "R160" },
        ]
      },
      {
        name: "Shots",
        note: "For the brave table",
        items: [
          { name: "Tequila", detail: "Gold or silver", price: "R27" },
          { name: "Jägermeister", detail: "Ice cold", price: "R27" },
          { name: "Jägerbomb", detail: "With Red Bull", price: "R35", popular: true },
          { name: "Springbokkie", detail: "Green and gold", price: "R22" },
          { name: "Melktertjie", detail: "Sweet and dangerous", price: "R20" },
          { name: "Cactus Jack", detail: "Original R20, bubblegum R22", price: "R20" },
        ]
      },
      {
        name: "Wine & Bubbles",
        note: "By the glass or bottle",
        items: [
          { name: "Two Oceans Sauvignon Blanc", detail: "Glass R40", price: "R130" },
          { name: "Fyn Bos Chenin Blanc", detail: "Glass R45", price: "R140" },
          { name: "Van Loveren Merlot", detail: "Bottle", price: "R130" },
          { name: "Fyn Bos Merlot", detail: "Glass R45", price: "R140" },
          { name: "Four Cousins Rosé", detail: "Bottle", price: "R100" },
          { name: "JC Le Roux", detail: "Lachanson, Ledomaine or Lafleurette", price: "R180", popular: true },
        ]
      },
      {
        name: "Coffee & Shakes",
        note: "All day",
        items: [
          { name: "Cappuccino", detail: "Double shot", price: "R30" },
          { name: "Latte", detail: "Smooth", price: "R35" },
          { name: "Hot Chocolate", detail: "Proper winter fuel", price: "R40" },
          { name: "Iced Coffee", detail: "Cold brew over ice", price: "R38" },
          { name: "Milkshake", detail: "Strawberry or chocolate · small R30", price: "R45", popular: true },
          { name: "Rock Shandy", detail: "Lemonade, bitters and sparkling water", price: "R50" },
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

  socials: {
    facebook: "https://www.facebook.com/p/Jimmys-Burger-Bar-61560295359926/",
    instagram: "https://www.instagram.com/jimmys_burgerbar/",
  }
};
