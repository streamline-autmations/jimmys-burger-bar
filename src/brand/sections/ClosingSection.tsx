import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock, MapPin } from 'lucide-react';
import { config } from '../../config';
import { RevealHeading } from '../../components/RevealHeading';
import { fadeInUp } from '../../lib/motion';
import type { ClosingContent } from './types';

export const ClosingSection: React.FC<{ content: ClosingContent }> = ({ content }) => (
  <section className="relative overflow-hidden bg-accent">
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] min-h-[680px] lg:min-h-[720px]">
      <motion.div {...fadeInUp} className="px-5 md:px-10 lg:px-12 py-20 md:py-24 flex flex-col justify-center">
        <span className="font-script text-2xl text-ink/75">{content.script}</span>
        <RevealHeading text={content.heading} className="font-display text-5xl sm:text-6xl lg:text-7xl font-extrabold text-ink leading-[0.9] mt-3" />
        <p className="text-ink/70 text-lg leading-relaxed max-w-md mt-7">{content.body}</p>
        <div className="flex flex-col sm:flex-row gap-3 mt-9">
          <Link to={content.primaryCta.to} className="inline-flex items-center justify-center gap-2 bg-ink text-surface px-7 py-4 rounded-full font-display font-bold transition-transform hover:scale-[1.03] active:scale-[0.98]">
            {content.primaryCta.label} <ArrowRight size={18} />
          </Link>
          <Link to={content.secondaryCta.to} className="inline-flex items-center justify-center gap-2 bg-surface text-ink px-7 py-4 rounded-full font-display font-bold transition-transform hover:scale-[1.03] active:scale-[0.98]">
            {content.secondaryCta.label}
          </Link>
        </div>
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(config.venue.address)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 self-start mt-7 text-ink font-bold border-b border-ink/35 pb-1 hover:border-ink"
        >
          <MapPin size={17} /> {content.directionsLabel}
        </a>
      </motion.div>

      <motion.div {...fadeInUp} className="relative min-h-[520px] lg:min-h-full overflow-hidden">
        <img src={content.image} alt={content.imageAlt} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/65 via-transparent to-transparent lg:bg-gradient-to-r lg:from-accent/35 lg:via-transparent lg:to-transparent" />
        <div className="absolute left-5 right-5 bottom-5 md:left-8 md:right-auto md:bottom-8 md:w-[330px] bg-surface text-ink rounded-2xl p-6 shadow-2xl border border-ink/10">
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.18em] uppercase text-ink/55">
            <Clock size={15} className="text-accent" /> {content.card.hoursLabel}
          </div>
          <p className="font-display text-xl font-extrabold mt-3">{content.card.address}</p>
          <p className="text-sm text-ink/55 mt-1">{content.card.note}</p>
        </div>
      </motion.div>
    </div>
  </section>
);
