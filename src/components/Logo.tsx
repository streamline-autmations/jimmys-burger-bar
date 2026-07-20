import React from 'react';
import { config } from '../config';

// Jimmy's real logo (Ameli van Zyl brand collateral): navy oval, "Jimmy's"
// in periwinkle script, "BURGER BAR" in white spaced caps. Transparent PNG.
export const Logo: React.FC<{ className?: string }> = ({ className }) => (
  <img
    src="/images/logo.png"
    alt={`${config.venue.name} ${config.venue.nameSuffix} logo`}
    className={className}
  />
);
