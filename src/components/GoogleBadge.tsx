import React from 'react';
import { config } from '../config';
import { Star, BadgeCheck } from 'lucide-react';
import { cn } from '../lib/utils';

// Standard four-color "G" mark, used the way Google's own review widgets do.
export const GoogleG: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" />
    <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z" />
    <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z" />
    <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z" />
  </svg>
);

// The official-looking "Google reviews" trust badge: G mark, star row,
// a verified checkmark and the rating figures. Used anywhere the site
// wants to lean on real Google credibility rather than a plain text line.
export const GoogleBadge: React.FC<{
  rating: string;
  reviewCount: string;
  variant?: 'light' | 'dark';
  className?: string;
  href?: string;
}> = ({ rating, reviewCount, variant = 'dark', className, href }) => {
  const isDark = variant === 'dark';
  const stars = Math.round(parseFloat(rating));
  const badgeClassName = cn(
    'inline-flex items-center gap-3 rounded-full pl-2 pr-4 py-2',
    isDark ? 'bg-surface/95 shadow-lg shadow-ink/30' : 'bg-ink/5 ring-1 ring-ink/10',
    href && 'transition-transform duration-200 hover:scale-[1.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
    className
  );
  const content = (
    <>
      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-white shadow-sm shrink-0">
        <GoogleG size={16} />
      </span>
      <span className="flex items-center gap-1.5">
        <span className="font-display font-extrabold text-sm text-ink">
          {rating}
        </span>
        <span className="flex text-accent -mt-px">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} size={11} fill={i < stars ? 'currentColor' : 'none'} strokeWidth={i < stars ? 0 : 1.5} />
          ))}
        </span>
        <span className="text-xs font-semibold text-ink/60">
          ({reviewCount} reviews)
        </span>
      </span>
      <BadgeCheck size={16} className="text-ink shrink-0" strokeWidth={2} />
    </>
  );

  return href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Read ${config.venue.name}'s ${rating}-star rating and ${reviewCount} reviews on Google`}
      className={badgeClassName}
    >
      {content}
    </a>
  ) : (
    <div className={badgeClassName}>{content}</div>
  );
};
