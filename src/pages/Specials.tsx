import React, { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Clock, ArrowRight, X } from 'lucide-react';
import { config } from '../config';
import { Starburst } from '../components/Starburst';
import { fadeInUp } from '../lib/motion';
import { Stack } from '../components/Stack';
import { useHorizontalWheel } from '../lib/useHorizontalWheel';

const whatsappHref = `https://wa.me/${config.venue.whatsapp}?text=${encodeURIComponent(
  `Hi! I'd like to book a table at ${config.venue.name}.`
)}`;

export const Specials: React.FC = () => {
  const { specials } = config;
  const [isPosterBrowserOpen, setIsPosterBrowserOpen] = useState(false);
  const posterRailRef = useRef<HTMLDivElement>(null);
  useHorizontalWheel(posterRailRef);
  const specialCards = specials.fridays.map((s) => ({
    id: s.title,
    content: s.poster ? (
      <img src={s.poster} alt={`${s.title} special poster`} className="w-full h-full object-cover" />
    ) : (
      <div className="relative w-full h-full bg-ink p-7 pt-9 text-surface flex flex-col">
        {s.price && <Starburst value={s.price} className="absolute -top-5 -right-3 w-[82px] h-[82px] text-[24px]" />}
        <span className="font-script text-secondary text-xl">Friday special</span>
        <h3 className="font-display text-[28px] font-extrabold leading-tight mt-1.5 pr-10">{s.title}</h3>
        <p className="text-paper/75 leading-relaxed text-sm mt-3.5">{s.description}</p>
        <p className="text-xs font-bold text-accent mt-auto pt-4">{s.note}</p>
      </div>
    ),
  }));

  return (
    <div className="pt-28 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <motion.div {...fadeInUp} className="max-w-xl mb-14">
          <span className="font-script text-2xl text-primary">worth coming in for</span>
          <h1 className="font-display text-4xl md:text-6xl font-extrabold text-ink mt-1 mb-4">What's on</h1>
          <p className="text-ink/60 text-lg">{specials.intro}</p>
        </motion.div>

        {/* Coffee & Cars: the headline act */}
        <motion.div
          {...fadeInUp}
          className="rounded-2xl overflow-hidden mb-16 grid grid-cols-1 md:grid-cols-2 bg-ink"
        >
          <div className="relative min-h-[260px]">
            <img
              src="/images/campaign/coffee-cars.webp"
              alt="Classic car at a Coffee & Cars morning"
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <Starburst label="breakfast" value="R95" className="absolute bottom-4 right-4 w-24 h-24 md:w-28 md:h-28 text-[28px] md:text-[32px]" />
          </div>
          <div className="p-9 md:p-12">
            <div className="flex items-center gap-3 text-secondary mb-4">
              <Clock size={18} />
              <span className="font-bold text-sm text-paper/85">{specials.event.schedule}</span>
            </div>
            <h2 className="font-display text-3xl md:text-5xl font-extrabold text-surface mb-4">{specials.event.title}</h2>
            <p className="text-paper/80 text-lg leading-relaxed max-w-lg">{specials.event.description}</p>
          </div>
        </motion.div>

        {/* Friday rotation: poster wall */}
        <motion.div {...fadeInUp} className="mb-8">
          <h2 className="font-display text-3xl md:text-4xl font-extrabold text-ink">The Friday rotation</h2>
          <p className="text-ink/60 mt-2 max-w-md">
            One of these lands every Friday. Follow
            {' '}<a href={config.socials.instagram} target="_blank" rel="noopener noreferrer" className="text-primary font-bold hover:underline">@jimmys_burgerbar</a>{' '}
            to catch the week's poster.
          </p>
        </motion.div>

        <motion.div {...fadeInUp} className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(320px,0.55fr)] items-center gap-12 mb-20 pt-3">
          <div>
            <Stack cards={specialCards} onSelect={() => setIsPosterBrowserOpen(true)} />
            <p className="text-sm text-ink/55 text-center mt-7">Tap a poster to open the Friday wall. Swipe to shuffle the stack.</p>
          </div>
          <div className="rounded-2xl border-2 border-dashed border-ink/25 p-8 md:p-10 flex flex-col items-start justify-center gap-4 min-h-[250px]">
            <p className="text-ink/65 leading-relaxed">
              Friday tables go fast when the poster drops. Big groups welcome,
              especially for Coffee & Cars mornings.
            </p>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 bg-primary text-surface pl-5 pr-1.5 py-1.5 rounded-full font-display font-bold text-sm transition-transform duration-200 hover:scale-[1.04] active:scale-[0.97]"
            >
              <span>Book a Table</span>
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-surface/15 group-hover:translate-x-0.5 transition-transform">
                <ArrowRight size={14} />
              </span>
            </a>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {isPosterBrowserOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-ink/90 backdrop-blur-md p-4 md:p-10 flex items-center"
            role="dialog"
            aria-modal="true"
            aria-label="Friday specials"
            onClick={() => setIsPosterBrowserOpen(false)}
          >
            <div className="w-full max-w-4xl mx-auto" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-center justify-between gap-4 mb-6 text-surface">
                <div><span className="font-script text-secondary text-xl">the poster wall</span><h2 className="font-display text-3xl md:text-5xl font-extrabold">Friday specials</h2></div>
                <button onClick={() => setIsPosterBrowserOpen(false)} className="p-3 rounded-full bg-surface/10 hover:bg-surface/20" aria-label="Close specials"><X size={24} /></button>
              </div>
              <div ref={posterRailRef} className="horizontal-rail flex items-center gap-4 md:gap-6 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4 -mx-4 px-4 md:mx-0 md:px-0">
                {specialCards.map((card) => (
                  <div key={card.id} className="shrink-0 w-[min(76vw,290px)] md:w-[290px] aspect-[4/5] overflow-hidden rounded-2xl snap-center shadow-2xl shadow-black/35">
                    {card.content}
                  </div>
                ))}
              </div>
              <p className="text-paper/70 text-sm mt-5">Swipe or scroll through the wall — three posters stay in view on larger screens.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
