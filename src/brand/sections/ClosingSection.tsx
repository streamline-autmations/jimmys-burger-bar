import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock, MapPin, MessageCircle, Phone } from 'lucide-react';
import { config } from '../../config';
import { todayHoursLabel } from '../../core/tenant';
import { RevealHeading } from '../../components/RevealHeading';
import { fadeInUp } from '../../lib/motion';
import type { ClosingContent } from './types';

export const ClosingSection: React.FC<{ content: ClosingContent }> = ({ content }) => {
  const { venue } = config;
  const phoneHref = `tel:${venue.phone.replace(/[^\d+]/g, '')}`;

  return (
    <section className="relative overflow-hidden bg-accent">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] min-h-[680px] lg:min-h-[720px]">
        <motion.div {...fadeInUp} className="px-5 md:px-10 lg:px-12 py-20 md:py-24 flex flex-col justify-center">
          {content.script && <span className="font-script text-2xl text-ink/80">{content.script}</span>}
          <RevealHeading text={content.heading} className="font-display text-5xl sm:text-6xl lg:text-7xl font-extrabold text-ink leading-[0.9] mt-3" />
          <p className="text-ink/85 text-lg leading-relaxed max-w-md mt-7">{content.body}</p>
          <div className="flex flex-col sm:flex-row gap-3 mt-9">
            <Link to={content.primaryCta.to} className="inline-flex items-center justify-center gap-2 bg-ink text-surface px-7 py-4 rounded-full font-display font-bold transition-transform hover:scale-[1.03] active:scale-[0.98]">
              {content.primaryCta.label} <ArrowRight size={18} />
            </Link>
            <Link to={content.secondaryCta.to} className="inline-flex items-center justify-center gap-2 bg-surface text-ink px-7 py-4 rounded-full font-display font-bold transition-transform hover:scale-[1.03] active:scale-[0.98]">
              {content.secondaryCta.label}
            </Link>
          </div>
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(venue.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 self-start mt-4 py-3 text-ink font-bold underline decoration-ink/35 decoration-1 underline-offset-[6px] hover:decoration-ink"
          >
            <MapPin size={17} /> {content.directionsLabel}
          </a>
        </motion.div>

        {/* Desktop: the photo bleeds to the viewport's right edge. Inside the
            max-w-7xl grid it used to stop short and leave a strip of gold down
            the right-hand side on any screen wider than the container. */}
        <motion.div {...fadeInUp} className="relative min-h-[560px] lg:min-h-0 lg:absolute lg:inset-y-0 lg:right-0 lg:w-[52%] overflow-hidden">
          <img src={content.image} alt={content.imageAlt} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/65 via-transparent to-transparent lg:bg-gradient-to-r lg:from-accent/35 lg:via-transparent lg:to-transparent" />
          {/* The visit card answers the three questions a guest has before
              leaving the house: are you open, where are you, can I ask. */}
          <div className="absolute left-5 right-5 bottom-5 md:left-8 md:right-auto md:bottom-8 md:w-[340px] bg-surface text-ink rounded-2xl p-6 shadow-2xl border border-ink/10">
            <p className="flex items-center gap-2 text-sm font-bold text-ink">
              <Clock size={16} className="text-ink/75" aria-hidden="true" /> {todayHoursLabel()}
            </p>
            <p className="font-display text-xl font-extrabold mt-3">{content.card.address}</p>
            <p className="text-sm text-ink/75 mt-1">{content.card.note}</p>
            <div className="grid grid-cols-2 gap-2 mt-5">
              <a
                href={`https://wa.me/${venue.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 min-h-11 rounded-full bg-ink text-surface text-sm font-bold transition-transform hover:scale-[1.03] active:scale-[0.98]"
              >
                <MessageCircle size={16} aria-hidden="true" /> WhatsApp
              </a>
              <a
                href={phoneHref}
                aria-label={`Call ${venue.phone}`}
                className="inline-flex items-center justify-center gap-2 min-h-11 rounded-full border border-ink/25 text-ink text-sm font-bold transition-colors hover:bg-ink hover:text-surface"
              >
                <Phone size={16} aria-hidden="true" /> Call
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
