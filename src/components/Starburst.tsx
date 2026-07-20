import React from 'react';

// The golden "ONLY R120" starburst sticker Jimmy's slaps on every specials
// poster. 16-point star generated mathematically, price set in display type.
// The outer div takes positioning classes from the caller; the inner wrapper
// provides the local positioning context.
const POINTS = Array.from({ length: 32 }, (_, i) => {
  const angle = (i * Math.PI) / 16;
  const r = i % 2 === 0 ? 50 : 40;
  return `${(50 + r * Math.cos(angle)).toFixed(2)},${(50 + r * Math.sin(angle)).toFixed(2)}`;
}).join(' ');

export const Starburst: React.FC<{ label?: string; value: string; className?: string }> = ({
  label = 'only',
  value,
  className,
}) => (
  <div className={className} aria-label={`${label} ${value}`}>
    <div className="relative w-full h-full">
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
        <polygon points={POINTS} className="fill-accent" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center -rotate-6">
        <span className="font-script text-ink text-[0.6em] leading-none">{label}</span>
        <span className="font-display font-extrabold text-ink text-[1em] leading-tight">{value}</span>
      </div>
    </div>
  </div>
);
