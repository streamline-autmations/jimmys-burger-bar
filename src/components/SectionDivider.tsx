import React from 'react';

// Two section-break treatments, both full-bleed top edges. `fill` should be the
// CSS colour of the section BELOW the divider - the shape reads as that
// section's top edge cutting into the one above it.

// A torn poster edge. The site's sections should feel pinned together, not
// separated by generic SaaS waves.
export const WaveDivider: React.FC<{ fill: string; className?: string }> = ({ fill, className }) => (
  <svg
    viewBox="0 0 1440 80"
    preserveAspectRatio="none"
    className={`section-poster-edge w-full h-[38px] md:h-14 -mb-px ${className ?? ''}`}
    aria-hidden="true"
  >
    <path d="M0,28 L72,14 L144,34 L216,11 L288,30 L360,16 L432,36 L504,12 L576,31 L648,15 L720,34 L792,10 L864,29 L936,16 L1008,35 L1080,12 L1152,31 L1224,14 L1296,34 L1368,11 L1440,28 L1440,80 L0,80 Z" fill={fill} />
  </svg>
);

// A checkered-flag edge - on brand for Jimmy's Coffee & Cars motif (the
// existing .checker strip is a straight two-row band; this cuts the same
// squares on a diagonal so it reads as a flag snapping, not a rule).
//
// `behind` is the colour of the section ABOVE, and it is what shows through
// the empty squares. It used to be left out, so the empty squares showed the
// page's paper instead: under a paper section that made the whole edge
// invisible, and under a navy one it became a white band. The squares are CSS
// rather than an SVG pattern because the pattern sat in a stretched
// (preserveAspectRatio="none") viewBox, which squashed them into slivers on a
// phone. These stay square at every width.
export const CheckerDivider: React.FC<{ fill: string; behind?: string; className?: string; flip?: boolean }> = ({
  fill,
  behind = 'transparent',
  className,
  flip = false,
}) => (
  <div
    aria-hidden="true"
    className={`relative w-full h-9 md:h-14 -mb-px [--checker:24px] md:[--checker:36px] ${className ?? ''}`}
    style={{ background: behind }}
  >
    <div
      className="absolute inset-0"
      style={{
        backgroundImage: `conic-gradient(${fill} 90deg, transparent 90deg 180deg, ${fill} 180deg 270deg, transparent 270deg)`,
        backgroundSize: 'var(--checker) var(--checker)',
        backgroundPosition: 'left bottom',
        clipPath: flip ? 'polygon(0 0, 100% 50%, 100% 100%, 0 100%)' : 'polygon(0 50%, 100% 0, 100% 100%, 0 100%)',
      }}
    />
  </div>
);
