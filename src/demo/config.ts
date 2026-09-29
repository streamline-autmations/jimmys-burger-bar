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
  // Christiaan's comparison rate for the sales pitch (2026-09-29). Shown on
  // screen as an assumption, never as a quoted app's actual fee.
  reporting: { appCommissionRate: 0.25 },
  seo: {
    ...jimmys.seo,
    title: "Restaurant Direct demo - Jimmy's Burger Bar (fictional records)",
    description: 'Sales demonstration of Restaurant Direct. All orders, bookings and guests shown are fictional.',
  },
});

export type { RestaurantConfig } from '../core/config/types';

/**
 * When the nightly job emails review requests, from `reviewRequests.localTime`
 * in supabase/tenants/jimmys.json. The demo's preview cards quote it, so a test
 * keeps the two equal.
 */
export const REVIEW_REQUEST_TIME = '20:00';
