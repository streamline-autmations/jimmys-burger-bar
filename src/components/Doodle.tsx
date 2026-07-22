import React from 'react';

// Hand-drawn ink line doodles in the voice of a chalkboard menu board.
// Stroke-only, currentColor, deliberately a little wobbly - they are meant to
// read as marker sketches, not icons. Used as faint watermarks on the menu
// and drinks panels (text-primary/ink at low opacity) and scattered in page
// backgrounds. Never used at full opacity and never instead of a real photo.
const ART: Record<string, React.ReactNode> = {
  burger: (
    <>
      <path d="M11 29 C 12 13, 52 13, 53 29" />
      <path d="M22 20 l3 -2 M32 17.5 l3 -1.5 M42 20 l3 -2" strokeWidth={2.4} />
      <path d="M12 33 h40" />
      <path d="M10 38 q4 6 8 0 q4 6 8 0 q4 6 8 0 q4 6 8 0 q4 6 8 0" />
      <path d="M13 45 h38 c0 6 -4 8 -9 8 h-20 c-5 0 -9 -2 -9 -8 z" />
    </>
  ),
  egg: (
    <>
      <path d="M15 35 c-5 -13 8 -21 18 -19 c12 2 20 8 16 19 c-3 10 -8 14 -17 14 c-10 0 -13 -4 -17 -14 z" />
      <circle cx="31" cy="33" r="6.5" />
      <path d="M24 15 q2 -4 0 -8 M34 14 q2 -4 0 -8" strokeWidth={2.4} />
    </>
  ),
  fries: (
    <>
      <path d="M20 33 l-3 21 h30 l-3 -21" />
      <path d="M24 33 l1.5 -16 M31.5 33 v-18 M39 33 l-1.5 -14" />
      <path d="M18 40 h28" />
    </>
  ),
  platter: (
    <>
      <ellipse cx="32" cy="38" rx="24" ry="12" />
      <ellipse cx="32" cy="37" rx="17" ry="7.5" />
      <circle cx="26" cy="35" r="2.4" strokeWidth={2.4} />
      <circle cx="36" cy="39" r="2.4" strokeWidth={2.4} />
      <path d="M30 18 q2 -4 0 -8 M38 20 q2 -4 0 -8" strokeWidth={2.4} />
    </>
  ),
  steak: (
    <>
      <path d="M13 28 c0 -11 14 -13 22 -11 c10 2 17 7 17 15 c0 10 -10 16 -22 16 c-12 0 -17 -8 -17 -20 z" />
      <path d="M22 24 l17 23 M33 21 l13 17" strokeWidth={2.4} />
    </>
  ),
  drumstick: (
    <>
      <path d="M36 11 c14 4 17 23 4 31 c-6 4 -13 4 -17 0 l-8 9" />
      <circle cx="12" cy="55" r="4" />
      <circle cx="19" cy="59" r="4" />
    </>
  ),
  toastie: (
    <>
      <path d="M15 20 h34 v26 h-34 z" />
      <path d="M15 46 L49 20" strokeWidth={2.4} />
      <path d="M26 13 q2 -4 0 -8 M36 13 q2 -4 0 -8" strokeWidth={2.4} />
    </>
  ),
  salad: (
    <>
      <path d="M11 33 h42 c0 14 -9 21 -21 21 c-12 0 -21 -7 -21 -21 z" />
      <path d="M22 33 c-3 -9 2 -15 8 -17 M34 33 c0 -10 6 -13 11 -11" />
      <circle cx="41" cy="27" r="3.6" strokeWidth={2.4} />
    </>
  ),
  sundae: (
    <>
      <path d="M20 26 h24 l-7 21 h-10 z" />
      <path d="M32 47 v6 M25 56 h14" />
      <path d="M20 26 c-1 -8 8 -11 12 -6 c4 -5 13 -2 12 6" />
      <circle cx="32" cy="13" r="3" strokeWidth={2.4} />
    </>
  ),
  beer: (
    <>
      <path d="M18 24 v26 c0 3 2 5 5 5 h14 c3 0 5 -2 5 -5 v-26" />
      <path d="M42 30 c8 0 8 13 0 13" />
      <path d="M16 24 q4 -9 11 -5 q4 -6 10 -1 q7 -4 9 6" />
      <path d="M25 32 v14 M32 32 v14" strokeWidth={2.4} />
    </>
  ),
  bottle: (
    <>
      <path d="M28 8 h8 v10 c6 4 8 9 8 15 v19 c0 4 -2 6 -6 6 h-12 c-4 0 -6 -2 -6 -6 v-19 c0 -6 2 -11 8 -15 z" />
      <path d="M22 36 h20 M22 46 h20" strokeWidth={2.4} />
    </>
  ),
  cocktail: (
    <>
      <path d="M15 14 h34 L32 35 z" />
      <path d="M32 35 v17 M22 54 h20" />
      <circle cx="26" cy="22" r="3" strokeWidth={2.4} />
      <path d="M26 19 l-5 -9" strokeWidth={2.4} />
    </>
  ),
  shot: (
    <>
      <path d="M24 26 l3 24 h10 l3 -24 z" />
      <path d="M26 34 h12" strokeWidth={2.4} />
      <path d="M20 18 l-5 -5 M44 18 l5 -5 M32 14 v-7" strokeWidth={2.4} />
    </>
  ),
  wine: (
    <>
      <path d="M22 10 h20 v9 c0 11 -4 17 -10 17 c-6 0 -10 -6 -10 -17 z" />
      <path d="M32 36 v14 M24 52 h16" />
      <path d="M23 20 h18" strokeWidth={2.4} />
    </>
  ),
  shake: (
    <>
      <path d="M22 21 l4 32 h12 l4 -32" />
      <path d="M20 21 q4 -7 9 -3 q4 -5 8 0 q6 -4 9 3" />
      <path d="M36 15 l7 -11" strokeWidth={2.4} />
    </>
  ),
  coffee: (
    <>
      <path d="M16 28 h28 v9 c0 9 -6 15 -14 15 c-8 0 -14 -6 -14 -15 z" />
      <path d="M44 31 c8 0 8 10 0 10" />
      <path d="M13 56 h38" strokeWidth={2.4} />
      <path d="M26 21 q2 -5 0 -9 M36 21 q2 -5 0 -9" strokeWidth={2.4} />
    </>
  ),
  car: (
    <>
      <path d="M10 38 l4 -10 c1 -3 3 -4 6 -4 h24 c3 0 5 1 6 4 l4 10" />
      <path d="M8 38 h48 v8 h-48 z" />
      <circle cx="20" cy="50" r="5" />
      <circle cx="44" cy="50" r="5" />
      <path d="M26 30 h12" strokeWidth={2.4} />
    </>
  ),
};

export const DOODLE_NAMES = Object.keys(ART);

export const Doodle: React.FC<{ name: string; className?: string; strokeWidth?: number }> = ({
  name,
  className,
  strokeWidth = 3,
}) => {
  const art = ART[name];
  if (!art) return null;
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {art}
    </svg>
  );
};
