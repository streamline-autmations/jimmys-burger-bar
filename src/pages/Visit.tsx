import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Clock, Mail, MapPin, Phone } from 'lucide-react';
import { config } from '../config';
import { Booking } from './Booking';
import { fadeInUp, riseChild, staggerContainer } from '../lib/motion';
import { RevealHeading } from '../components/RevealHeading';

const visitGallery = [
  { src: '/images/gallery/burger-duo.jpg', caption: 'Burgers for the table' },
  { src: '/images/gallery/heritage-day-team.jpg', caption: 'The Jimmy’s crew' },
  { src: '/images/campaign/coffee-cars.webp', caption: 'Coffee & Cars Sundays' },
  { src: '/images/gallery/greek-meze.jpg', caption: 'Plates made for sharing' },
  { src: '/images/gallery/fireplace-corner.jpg', caption: 'The corner regulars know' },
  { src: '/images/gallery/corona-sunset.jpg', caption: 'One more before sunset' },
];

export const Visit: React.FC = () => {
  const { venue } = config;

  return (
    <div className="pt-20 min-h-screen">
      <section className="bg-primary text-surface">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[0.78fr_1.22fr] min-h-[620px] lg:min-h-[700px]">
          <motion.div {...fadeInUp} className="px-5 py-16 md:px-10 lg:px-12 lg:py-24 flex flex-col justify-center">
            <span className="font-script text-2xl text-secondary">57 Loch Street</span>
            <RevealHeading as="h1" text="Come hungry. Stay awhile." className="font-display text-4xl sm:text-6xl lg:text-7xl font-extrabold leading-[0.92] mt-3" />
            <p className="text-surface/75 text-lg leading-relaxed max-w-md mt-7">Find the food, the bar, Coffee & Cars and the people who already know which table they want.</p>
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(venue.address)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 self-start mt-9 bg-accent text-ink px-6 py-3.5 rounded-full font-display font-bold transition-transform hover:scale-[1.03] active:scale-[0.98]">Get directions <ArrowRight size={18} /></a>
          </motion.div>
          <motion.div {...fadeInUp} className="relative min-h-[360px] lg:min-h-full bg-ink overflow-hidden">
            <img src="/images/jimmys-logo-2.png" alt="Jimmy's Burger Bar food and logo" className="absolute inset-0 w-full h-full object-contain bg-primary p-3 md:p-7" />
          </motion.div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-[1.3fr_0.7fr] gap-6 lg:gap-8 items-stretch">
          <motion.div {...fadeInUp} className="min-h-[390px] lg:min-h-[560px] overflow-hidden border border-ink/10 bg-surface">
            <iframe src={venue.googleMapsEmbed} width="100%" height="100%" style={{ border: 0, minHeight: 'inherit' }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Map to Jimmy's Burger Bar" />
          </motion.div>
          <motion.aside {...fadeInUp} className="bg-ink text-surface p-7 md:p-10 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold tracking-[0.18em] uppercase text-accent">Plan your visit</span>
              <h2 className="font-display text-3xl md:text-4xl font-extrabold mt-3">Everything you need.</h2>
              <div className="space-y-4 mt-8 text-sm text-surface/75">
                <p className="flex items-start gap-3"><MapPin size={17} className="text-secondary shrink-0 mt-0.5" /> {venue.address}</p>
                <a href={`tel:${venue.phone}`} className="flex items-center gap-3 hover:text-surface"><Phone size={17} className="text-secondary shrink-0" /> {venue.phone}</a>
                <a href={`mailto:${venue.email}`} className="flex items-center gap-3 hover:text-surface break-all"><Mail size={17} className="text-secondary shrink-0" /> {venue.email}</a>
              </div>
            </div>
            <div className="mt-10 pt-7 border-t border-surface/15">
              <h3 className="font-display font-bold flex items-center gap-2"><Clock size={17} className="text-accent" /> Opening hours</h3>
              <div className="mt-4">{venue.hours.map((hours) => <div key={hours.day} className="flex justify-between gap-5 py-2.5 border-b border-surface/10 last:border-0 text-sm"><span className="text-surface/55">{hours.day}</span><span className="font-semibold">{hours.time}</span></div>)}</div>
            </div>
          </motion.aside>
        </div>
      </section>

      <section id="gallery" className="scroll-mt-20 py-16 md:py-24 bg-surface overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <motion.div {...fadeInUp} className="max-w-2xl mb-10 md:mb-14">
            <span className="font-script text-2xl text-primary">the food, the crowd, the place</span>
            <RevealHeading text="This is Jimmy’s" className="font-display text-4xl md:text-6xl font-extrabold text-ink leading-[0.94] mt-2" />
          </motion.div>
          <motion.div variants={staggerContainer} initial="initial" whileInView="whileInView" viewport={{ once: true, amount: 0.1 }} className="grid grid-cols-12 gap-3 md:gap-5">
            {visitGallery.map((photo, index) => (
              <motion.figure key={photo.src} variants={riseChild} className={`group relative overflow-hidden bg-ink ${index === 0 ? 'col-span-12 md:col-span-7 aspect-[4/3]' : index === 1 ? 'col-span-12 md:col-span-5 aspect-[4/3] md:aspect-auto' : 'col-span-6 md:col-span-3 aspect-[3/4]'}`}>
                <img src={photo.src} alt={photo.caption} loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-transparent" />
                <figcaption className="absolute bottom-0 left-0 right-0 p-4 md:p-5 text-surface font-display font-bold text-sm md:text-base">{photo.caption}</figcaption>
              </motion.figure>
            ))}
          </motion.div>
        </div>
      </section>

      <section id="book" className="scroll-mt-20 py-16 md:py-24 bg-paper">
        <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-[0.72fr_1.28fr] gap-10 lg:gap-16 items-start">
          <motion.div {...fadeInUp} className="lg:sticky lg:top-28">
            <span className="font-script text-2xl text-primary">save your spot</span>
            <RevealHeading text="Book a table" className="font-display text-4xl md:text-6xl font-extrabold text-ink leading-[0.94] mt-2" />
            <p className="text-ink/60 text-lg leading-relaxed mt-5 max-w-md">Tell us when you’re coming, how many seats you need and where you’d prefer to sit.</p>
            <p className="text-xs text-ink/40 mt-6 max-w-sm">This is a polished demo booking flow. Jimmy’s will confirm availability before the table is final.</p>
          </motion.div>
          <div className="visit-booking"><Booking embedded /></div>
        </div>
      </section>
    </div>
  );
};
