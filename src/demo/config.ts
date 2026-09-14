// The demo tenant: Jimmy's brand, fictional records.
//
// Christiaan's decision (2026-09-09): the sales walkthrough shows Jimmy's real
// design, with every guest, order and booking unmistakably fictional. See the
// "Demo build" override in CLAUDE.md for the safeguards that decision depends on.
//
// Only reachable through vite-plugin-demo.ts with VITE_DEMO=1.

import { jimmys } from '../tenants/jimmys/config';
import { defineRestaurant } from '../core/config/define';

export const config = defineRestaurant({
  ...jimmys,
  // Separate browser storage from the real site: a presenter who also uses
  // jimmysburgerbar.co.za in the same browser never mixes carts or references.
  slug: 'jimmys-demo',
  // The 3.4s first-load poster is Jimmy's signature, but it eats a tenth of a
  // 60-second walkthrough. The route curtain stays, without the extra hold.
  motion: { intro: 'off', routeHold: 0 },
  seo: {
    ...jimmys.seo,
    title: "Restaurant Direct demo - Jimmy's Burger Bar (fictional records)",
    description: 'Sales demonstration of Restaurant Direct. All orders, bookings and guests shown are fictional.',
  },
});

export type { RestaurantConfig } from '../core/config/types';
