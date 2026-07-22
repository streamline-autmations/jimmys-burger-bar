import React from 'react';
import { motion } from 'framer-motion';
import { Clock, ArrowRight } from 'lucide-react';
import { config } from '../config';
import { Starburst } from '../components/Starburst';
import { fadeInUp, staggerContainer, riseChild } from '../lib/motion';

const whatsappHref = `https://wa.me/${config.venue.whatsapp}?text=${encodeURIComponent(
  `Hi! I'd like to book a table at ${config.venue.name}.`
)}`;

export const Specials: React.FC = () => {
  const { specials } = config;

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

        <motion.div
          variants={staggerContainer}
          initial="initial"
          whileInView="whileInView"
          viewport={{ once: true, amount: 0.05 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20 pt-4"
        >
          {specials.fridays.map((s, i) => (
            <motion.div
              key={s.title}
              variants={riseChild}
              className={`rounded-2xl relative overflow-hidden transition-transform duration-300 hover:rotate-0 hover:-translate-y-1 ${
                i % 2 === 0 ? 'rotate-[-1deg]' : 'rotate-[0.8deg]'
              } ${s.poster ? 'shadow-xl shadow-ink/20' : 'bg-ink p-8 pt-9'}`}
            >
              {s.poster ? (
                <img
                  src={s.poster}
                  alt={`${s.title} special poster`}
                  loading="lazy"
                  className="w-full h-full aspect-[4/5] object-cover"
                />
              ) : (
                <>
                  {s.price && (
                    <Starburst value={s.price} className="absolute -top-5 -right-3 w-[88px] h-[88px] text-[26px]" />
                  )}
                  <span className="font-script text-secondary text-xl block">Friday special</span>
                  <h3 className="font-display text-[28px] font-extrabold text-surface leading-tight mt-1.5 pr-10">{s.title}</h3>
                  <p className="text-paper/75 leading-relaxed text-sm mt-3.5">{s.description}</p>
                  <p className="text-xs font-bold text-accent mt-4">{s.note}</p>
                </>
              )}
            </motion.div>
          ))}

          {/* Booking cell completes the grid */}
          <motion.div
            variants={riseChild}
            className="rounded-2xl border-2 border-dashed border-ink/25 p-8 flex flex-col items-start justify-center gap-4"
          >
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
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};
