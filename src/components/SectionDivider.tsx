import React, { useId } from 'react';

// Two experimental section-break treatments, both full-bleed SVG top-edges
// (negative margin pulls them into the section above so there's no seam).
// `fill` should be the CSS colour of the section BELOW the divider - the
// shape reads as that section's top edge cutting into the one above it.

// A soft, single-crest wave. Generic on its own, but works as a calm break
// between quiet content sections.
export const WaveDivider: React.FC<{ fill: string; className?: string }> = ({ fill, className }) => (
  <svg
    viewBox="0 0 1440 80"
    preserveAspectRatio="none"
    className={`w-full h-[50px] md:h-20 -mb-px ${className ?? ''}`}
    aria-hidden="true"
  >
    <path d="M0,40 C 240,90 480,0 720,20 C 960,40 1200,90 1440,40 L1440,80 L0,80 Z" fill={fill} />
  </svg>
);

// A checkered-flag edge - on brand for Jimmy's Coffee & Cars motif (the
// existing .checker strip is a straight two-row band; this bends the same
// squares diagonally so it reads as a flag snapping, not a rule). The
// checker pattern is masked by a diagonal-topped shape.
export const CheckerDivider: React.FC<{ fill: string; className?: string; flip?: boolean }> = ({
  fill,
  className,
  flip = false,
}) => {
  const patternId = useId();
  const topPath = flip ? 'M0,0 L1440,30 L1440,60 L0,60 Z' : 'M0,30 L1440,0 L1440,60 L0,60 Z';

  return (
    <svg
      viewBox="0 0 1440 60"
      preserveAspectRatio="none"
      className={`w-full h-9 md:h-14 -mb-px ${className ?? ''}`}
      aria-hidden="true"
    >
      <defs>
        <pattern id={patternId} width="36" height="36" patternUnits="userSpaceOnUse">
          <rect width="18" height="18" fill={fill} />
          <rect x="18" y="18" width="18" height="18" fill={fill} />
        </pattern>
      </defs>
      <path d={topPath} fill={`url(#${patternId})`} />
    </svg>
  );
};
