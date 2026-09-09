// Tenant resolution.
//
// Restaurant Direct is one codebase serving many restaurants. Which one a build
// is for is decided here, and nowhere else. Components keep importing `config`
// exactly as before, so this is the only file that has to change when tenancy
// moves from build time to request time.

import { jimmys } from './tenants/jimmys/config';
import type { RestaurantConfig } from './core/config/types';

const tenants: Record<string, RestaurantConfig> = {
  jimmys,
};

const requested = import.meta.env.VITE_TENANT ?? 'jimmys';
const resolved = tenants[requested];

if (!resolved) {
  throw new Error(
    `Unknown tenant "${requested}". Available: ${Object.keys(tenants).join(', ')}. ` +
      'Set VITE_TENANT to one of these, or register the new tenant in src/config.ts.',
  );
}

export const config = resolved;
export type { RestaurantConfig };
