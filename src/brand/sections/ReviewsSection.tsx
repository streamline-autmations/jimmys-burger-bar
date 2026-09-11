import React from 'react';
import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';
import { config } from '../../config';
import { GoogleBadge, GoogleG } from '../../components/GoogleBadge';
import { Doodle } from '../../components/Doodle';
import { RevealHeading } from '../../components/RevealHeading';
import { fadeInUp } from '../../lib/motion';
import type { ReviewsContent } from './types';

type Review = (typeof config.testimonials)[number];

// Google-style initial avatar for real reviewers. We deliberately do NOT use
// photos: these are real named people from a public listing, and pairing their
// names with internet stock faces would fabricate identity. Initials-on-colour
// is exactly what Google itself renders.
const AVATAR_STYLE = ['bg-ink text-surface', 'bg-accent text-ink', 'bg-ink text-surface'] as const;

const ReviewerAvatar: React.FC<{ name: string; idx: number; size?: string }> = ({ name, idx, size = 'w-11 h-11 text-base' }) => (
  <span className={`${AVATAR_STYLE[idx % AVATAR_STYLE.length]} ${size} rounded-full flex items-center justify-center font-display font-bold shrink-0 shadow-sm`} aria-hidden="true">
    {name.split(' ').slice(0, 2).map((w) => w[0]).join('')}
  </span>
);

const REVIEW_TILTS = ['lg:-rotate-[1deg]', 'lg:rotate-[1.2deg]', 'lg:-rotate-[0.55deg]'] as const;

const ReviewPoster: React.FC<{ review: Review; index: number; featured?: boolean; content: ReviewsContent }> = ({
  review, index, featured = false, content,
}) => (
  <motion.div {...fadeInUp} className={featured ? 'lg:col-span-7' : 'flex-1'}>
    <article
      className={`relative h-full bg-surface border-2 border-ink/10 rounded-2xl flex flex-col justify-between shadow-[0_18px_45px_-24px_rgb(var(--color-ink)/0.38)] ${
        featured ? 'p-8 md:p-11' : 'p-7 md:p-8'
      } ${REVIEW_TILTS[index % REVIEW_TILTS.length]}`}
    >
      <span className={`absolute -top-3 left-1/2 -translate-x-1/2 h-6 bg-accent/85 border-x border-ink/10 shadow-sm ${featured ? 'w-24 rotate-[1deg]' : 'w-20 -rotate-[1deg]'}`} aria-hidden="true" />
      {/* On desktop the featured poster stretches to the height of the two
          stacked beside it. Its quote is set larger and centred in that space,
          instead of parking at the top over a large blank card. */}
      <div className={featured ? 'flex-1 flex flex-col' : undefined}>
        <div className="flex items-center justify-between gap-4 mb-6">
          <Quote className="text-accent" size={featured ? 38 : 28} fill="currentColor" strokeWidth={0} />
          <span className="text-[9px] font-bold tracking-[0.18em] uppercase text-ink/35">{content.reviewerLabel}</span>
        </div>
        <p className={`${featured ? 'font-display text-xl md:text-2xl lg:text-[1.7rem] xl:text-[1.9rem] leading-snug lg:leading-[1.3] lg:my-auto' : 'leading-relaxed'} text-ink/85`}>{review.text}</p>
      </div>
      <div className="flex items-center justify-between gap-3 pt-5 mt-8 border-t border-ink/10">
        <div className="flex items-center gap-3 min-w-0">
          <ReviewerAvatar name={review.name} idx={index} size={featured ? undefined : 'w-9 h-9 text-sm'} />
          <div className="min-w-0">
            <span className="font-semibold text-ink/80 text-sm block truncate">{review.name}</span>
            <a
              href={config.venue.googleReviews}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-ink/50 hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
              aria-label="Read this review on Google"
            >
              <GoogleG size={12} />
              <span>{content.sourceLabel}</span>
            </a>
          </div>
        </div>
        <div className="flex text-accent shrink-0">
          {[...Array(review.rating)].map((_, starIndex) => (
            <Star key={starIndex} size={featured ? 14 : 12} fill="currentColor" strokeWidth={0} />
          ))}
        </div>
      </div>
    </article>
  </motion.div>
);

export const ReviewsSection: React.FC<{ content: ReviewsContent }> = ({ content }) => {
  const { venue, testimonials } = config;
  if (!testimonials.length) return null;

  return (
    <section className="relative py-20 md:py-28 overflow-hidden bg-surface">
      <Doodle name="shake" className="absolute top-12 -right-4 w-32 h-32 text-primary/[0.06] rotate-12 pointer-events-none" />
      <div className="max-w-7xl mx-auto px-4 md:px-8 relative">
        <motion.div {...fadeInUp} className="flex flex-wrap items-end justify-between gap-6 mb-12">
          <div>
            <span className="font-script text-2xl text-primary">{content.script}</span>
            <RevealHeading text={content.heading} className="font-display text-3xl md:text-5xl font-extrabold text-ink max-w-xl mt-1" />
          </div>
          <GoogleBadge rating={venue.rating} reviewCount={venue.reviewCount} variant="light" href={venue.googleReviews} />
        </motion.div>

        <div className="poster-wall-grid rounded-[1.75rem] md:rounded-[2.25rem] bg-paper p-5 md:p-10 lg:p-12 border border-ink/10 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 lg:gap-9 items-stretch">
            <ReviewPoster review={testimonials[0]} index={0} featured content={content} />
            {testimonials.length > 1 && (
              <div className="lg:col-span-5 flex flex-col gap-7 lg:gap-9">
                {testimonials.slice(1).map((review, index) => (
                  <ReviewPoster key={review.name} review={review} index={index + 1} content={content} />
                ))}
              </div>
            )}
          </div>
          <motion.p {...fadeInUp} className="text-center text-xs text-ink/45 mt-9">{content.footnote}</motion.p>
        </div>
      </div>
    </section>
  );
};
