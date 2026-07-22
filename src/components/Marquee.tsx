import React from 'react';

// Golden marquee band in the voice of Jimmy's price stickers. Every line is
// real (menu, specials, address) - the marquee is allowed to be loud, it is
// not allowed to invent claims. CSS-driven (see .marquee-track in index.css)
// so it costs nothing on the main thread and pauses automatically under
// prefers-reduced-motion.
const ITEMS = [
  '180g patties smashed to order',
  'ice-cold beers',
  'one big special every Friday',
  '57 Loch Street, Meyerton',
  'Coffee & Cars once a month',
];

const Track: React.FC<{ ariaHidden?: boolean }> = ({ ariaHidden }) => (
  <div aria-hidden={ariaHidden || undefined} className="marquee-track flex items-center shrink-0">
    {ITEMS.map((item) => (
      <React.Fragment key={item}>
        <span className="font-display font-extrabold uppercase tracking-wide text-ink text-sm md:text-base whitespace-nowrap px-5 md:px-7">
          {item}
        </span>
        <span aria-hidden="true" className="text-ink/70 text-xs">
          ✦
        </span>
      </React.Fragment>
    ))}
  </div>
);

export const Marquee: React.FC = () => (
  <div className="flex overflow-hidden bg-accent py-3 md:py-3.5 select-none" role="marquee">
    <Track />
    <Track ariaHidden />
  </div>
);
