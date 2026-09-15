import React from 'react';
import { config } from '../config';

// The restaurant's own logo file, from its config (Jimmy's: the navy oval by
// Ameli van Zyl). Never recoloured or redrawn.
export const Logo: React.FC<{ className?: string }> = ({ className }) => (
  <img
    src={config.assets.logo}
    alt={`${config.venue.name} ${config.venue.nameSuffix} logo`}
    className={className}
  />
);
