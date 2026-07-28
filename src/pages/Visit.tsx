import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Clock, Mail, MapPin, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { config } from '../config';
import { Booking } from './Booking';
import { fadeInUp, riseChild, staggerContainer } from '../lib/motion';
import { RevealHeading } from '../components/RevealHeading';
import { CheckerDivider, WaveDivider } from '../components/SectionDivider';

const visitGallery = [
  { src: '/images/gallery/burger-duo.jpg', caption: 'Burgers for the table' },
  { src: '/images/gallery/heritage-day-team.jpg', caption: 'The Jimmy’s crew' },
  { src: '/images/campaign/coffee-cars.webp', caption: 'Coffee & Cars Sundays' },
  { src: '/images/gallery/greek-meze.jpg', caption: 'Plates made for sharing' },
  { src: '/images/gallery/fireplace-corner.jpg', caption: 'The corner regulars know' },
  { src: '/images/gallery/corona-sunset.jpg', caption: 'One more before sunset' },
];

const galleryLayout = [
  'col-span-12 md:col-span-7 aspect-[4/3] md:-rotate-[0.7deg]',
  'col-span-12 md:col-span-5 aspect-[4/3] md:translate-y-8 md:rotate-[0.8deg]',
  'col-span-6 md:col-span-3 aspect-[3/4]',
  'col-span-6 md:col-span-3 aspect-[3/4] md:translate-y-5',
  'col-span-6 md:col-span-3 aspect-[3/4]',
  'col-span-6 md:col-span-3 aspect-[3/4] md:translate-y-5',
] as const;

export const Visit: React.FC = () => {
  const { venue } = config;
  const directionsHref = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(venue.address)}`;

  return (
    <div className="pt-20 min-h-screen bg-paper">
      {/* The invitation: same navy poster world as the homepage hero. */}
      <section className="bg-ink text-surface overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[0.82fr_1.18fr] min-h-[680px] lg:min-h-[760px]">
          <motion.div {...fadeInUp} className="relative z-10 px-5 py-16 md:px-10 lg:px-12 lg:py-24 flex flex-col justify-center">
            <span className="font-script text-2xl text-accent">your night out, sorted</span>
            <RevealHeading
              as="h1"
              text="Meet you at Jimmy’s."
              className="font-display text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[0.9] mt-3"
            />
            <p className="text-surface/75 text-lg leading-relaxed max-w-md mt-7">
              Come hungry, find your table and stay awhile. The food, the bar and the people are all right here on Loch Street.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-9">
              <a href={directionsHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-3 bg-accent text-ink px-6 py-3.5 rounded-full font-display font-bold transition-transform hover:scale-[1.03] active:scale-[0.98]">
                Get directions <ArrowRight size={18} />
              </a>
              <Link to="/visit#book" className="inline-flex items-center justify-center gap-3 border border-surface/35 text-surface px-6 py-3.5 rounded-full font-display font-bold hover:bg-surface hover:text-ink transition-colors">
                Book a table
              </Link>
            </div>
          </motion.div>

          <motion.div {...fadeInUp} className="relative min-h-[500px] lg:min-h-full overflow-hidden bg-ink">
            <img
              src="/images/gallery/heritage-day-team.jpg"
              alt="The Jimmy's Burger Bar team outside the restaurant"
              className="absolute inset-0 w-full h-full object-cover object-top"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-transparent lg:bg-gradient-to-r lg:from-ink/35 lg:via-transparent lg:to-transparent" />
            <div className="absolute left-5 right-5 bottom-5 md:left-8 md:right-auto md:bottom-8 md:w-[360px] bg-accent text-ink rounded-2xl p-6 shadow-2xl border border-ink/10">
              <span className="text-[9px] font-bold tracking-[0.18em] uppercase text-ink/55">The address to remember</span>
              <p className="font-display text-2xl font-extrabold leading-tight mt-2">57 Loch Street</p>
              <p className="font-script text-lg mt-1">Meyerton, Gauteng</p>
            </div>
          </motion.div>
        </div>
      </section>
      <WaveDivider fill="rgb(var(--color-paper))" />

      {/* The practical details use the same image + ticket pairing as the close. */}
      <section className="py-20 md:py-28 bg-paper">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <motion.div {...fadeInUp} className="max-w-2xl mb-10 md:mb-14">
            <span className="font-script text-2xl text-primary">one address, the whole night</span>
            <RevealHeading text="Plan the night." className="font-display text-4xl md:text-6xl font-extrabold text-ink leading-[0.94] mt-2" />
            <p className="text-ink/60 text-lg mt-5 max-w-xl">Directions, opening hours and the details worth saving before you leave home.</p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.28fr_0.72fr] gap-6 lg:gap-8 items-stretch">
            <motion.div {...fadeInUp} className="min-h-[420px] lg:min-h-[590px] overflow-hidden rounded-2xl border border-ink/10 bg-surface jimmy-media-frame">
              <iframe src={venue.googleMapsEmbed} width="100%" height="100%" style={{ border: 0, minHeight: 'inherit' }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Map to Jimmy's Burger Bar" />
            </motion.div>

            <motion.aside {...fadeInUp} className="relative bg-ink text-surface rounded-2xl p-7 md:p-10 flex flex-col justify-between overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-2 bg-accent" aria-hidden="true" />
              <div>
                <span className="text-xs font-bold tracking-[0.18em] uppercase text-accent">Keep this ticket</span>
                <h2 className="font-display text-3xl md:text-4xl font-extrabold mt-3">Everything you need.</h2>
                <div className="space-y-4 mt-8 text-sm text-surface/75">
                  <p className="flex items-start gap-3"><MapPin size={17} className="text-accent shrink-0 mt-0.5" /> {venue.address}</p>
                  <a href={`tel:${venue.phone}`} className="flex items-center gap-3 hover:text-surface"><Phone size={17} className="text-accent shrink-0" /> {venue.phone}</a>
                  <a href={`mailto:${venue.email}`} className="flex items-center gap-3 hover:text-surface break-all"><Mail size={17} className="text-accent shrink-0" /> {venue.email}</a>
                </div>
              </div>
              <div className="mt-10 pt-7 border-t border-surface/15">
                <h3 className="font-display font-bold flex items-center gap-2"><Clock size={17} className="text-accent" /> Opening hours</h3>
                <div className="mt-4">
                  {venue.hours.map((hours) => (
                    <div key={hours.day} className="flex justify-between gap-5 py-2.5 border-b border-surface/10 last:border-0 text-sm">
                      <span className="text-surface/55">{hours.day}</span>
                      <span className="font-semibold">{hours.time}</span>
                    </div>
                  ))}
                </div>
                <a href={directionsHref} target="_blank" rel="noopener noreferrer" className="mt-7 inline-flex items-center gap-2 text-accent font-bold">
                  Open in Google Maps <ArrowRight size={17} />
                </a>
              </div>
            </motion.aside>
          </div>
        </div>
      </section>
      <CheckerDivider fill="rgb(var(--color-ink))" />

      {/* The gallery is a controlled poster collage, never a random masonry wall. */}
      <section id="gallery" className="scroll-mt-20 py-20 md:py-28 bg-ink text-surface overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <motion.div {...fadeInUp} className="max-w-2xl mb-10 md:mb-14">
            <span className="font-script text-2xl text-accent">the food, the crowd, the place</span>
            <RevealHeading text="This is Jimmy’s." className="font-display text-4xl md:text-6xl font-extrabold text-surface leading-[0.94] mt-2" />
          </motion.div>
          <motion.div variants={staggerContainer} initial="initial" whileInView="whileInView" viewport={{ once: true, amount: 0.1 }} className="grid grid-cols-12 gap-3 md:gap-5 md:pb-8">
            {visitGallery.map((photo, index) => (
              <motion.figure
                key={photo.src}
                variants={riseChild}
                className={`group relative overflow-hidden bg-ink rounded-2xl border border-surface/10 shadow-[0_18px_44px_-25px_rgb(0_0_0/0.75)] ${galleryLayout[index]}`}
              >
                <img src={photo.src} alt={photo.caption} loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-transparent to-transparent" />
                <figcaption className="absolute bottom-0 left-0 right-0 p-4 md:p-5 text-surface font-display font-bold text-sm md:text-base">{photo.caption}</figcaption>
              </motion.figure>
            ))}
          </motion.div>
        </div>
      </section>
      <WaveDivider fill="rgb(var(--color-paper))" />

      <section id="book" className="scroll-mt-20 py-20 md:py-28 bg-paper">
        <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-[0.72fr_1.28fr] gap-10 lg:gap-16 items-start">
          <motion.div {...fadeInUp} className="lg:sticky lg:top-28">
            <span className="font-script text-2xl text-primary">save your spot</span>
            <RevealHeading text="Book a table." className="font-display text-4xl md:text-6xl font-extrabold text-ink leading-[0.94] mt-2" />
            <p className="text-ink/60 text-lg leading-relaxed mt-5 max-w-md">Tell us when you&apos;re coming, how many seats you need and where you&apos;d prefer to sit.</p>
            <div className="mt-8 border-l-4 border-accent pl-5">
              <p className="font-display font-bold text-ink">Demo booking flow</p>
              <p className="text-sm text-ink/50 mt-1 max-w-sm">Jimmy&apos;s would confirm availability before the table is final.</p>
            </div>
          </motion.div>
          <div className="visit-booking"><Booking embedded /></div>
        </div>
      </section>
    </div>
  );
};
