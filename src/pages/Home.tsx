import React, { useRef, useState } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Star, Quote, Clock, MapPin } from 'lucide-react';
import { config } from '../config';
import { Starburst } from '../components/Starburst';
import { GoogleBadge, GoogleG } from '../components/GoogleBadge';
import { Doodle } from '../components/Doodle';
import { Magnetic } from '../components/Magnetic';
import { fadeInUp, staggerContainer, riseChild, heroItem, stampContainer, stampChild, imageSettle } from '../lib/motion';
import { useRailSkew } from '../lib/useRailSkew';
import { RevealHeading } from '../components/RevealHeading';
import { Marquee } from '../components/Marquee';
import { WaveDivider, CheckerDivider } from '../components/SectionDivider';
import { BurgerAssembly } from '../components/BurgerAssembly';

const coffeeAndCarsImages = [
  { src: '/images/campaign/coffee-cars.webp', label: 'Coffee and Cars morning' },
  { src: '/images/campaign/cars-1.webp', label: 'Coffee and Cars line-up' },
  { src: '/images/campaign/coffee-cars-alt.webp', label: 'Breakfast at Coffee and Cars' },
  { src: '/images/campaign/coffee-1.webp', label: 'Coffee, cars and a Sunday morning' },
];

const whatsappHref = `https://wa.me/${config.venue.whatsapp}?text=${encodeURIComponent(
  `Hi! I'd like to book a table at ${config.venue.name}.`
)}`;

// Google-style initial avatar for real reviewers. We deliberately do NOT use
// photos here: these are real named people from Jimmy's Google listing, and
// pairing their names with internet stock faces would fabricate identity.
// Initials-on-colour is exactly what Google itself renders.
const AVATAR_BG = ['bg-primary', 'bg-secondary', 'bg-accent'] as const;
const ReviewerAvatar: React.FC<{ name: string; idx: number; size?: string }> = ({ name, idx, size = 'w-11 h-11 text-base' }) => (
  <span
    className={`${AVATAR_BG[idx % AVATAR_BG.length]} ${size} rounded-full flex items-center justify-center font-display font-bold text-surface shrink-0 shadow-sm`}
    aria-hidden="true"
  >
    {name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0])
      .join('')}
  </span>
);

const PostedOnGoogle: React.FC = () => (
  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-ink/50">
    <GoogleG size={12} />
    <span>Posted on Google</span>
  </span>
);

export const Home: React.FC = () => {
  const { venue, specials, testimonials } = config;

  const shouldReduceMotion = useReducedMotion();
  const [coffeeImage, setCoffeeImage] = useState(coffeeAndCarsImages[0].src);

  // The poster rails lean with drag velocity — same sticker physics as the
  // stamp, applied to the track only (Framer owns the cards' transforms).
  const specialsRail = useRailSkew<HTMLDivElement>();
  const galleryRail = useRailSkew<HTMLDivElement>();

  // Drinks band: the pour video drifts a few px against the scroll, echoing
  // the hero parallax so the two video bands read as one system.
  const drinksRef = useRef<HTMLElement>(null);
  const { scrollYProgress: drinksProgress } = useScroll({ target: drinksRef, offset: ['start end', 'end start'] });
  const drinksY = useTransform(drinksProgress, [0, 1], shouldReduceMotion ? [0, 0] : [-40, 40]);

  return (
    <div className="flex flex-col w-full">
      {/* ============ Hero: a flat-top stage for the assembling burger ============ */}
      <section className="relative min-h-[100dvh] w-full overflow-hidden bg-ink text-surface">

        <div className="absolute top-0 right-0 w-[58vw] h-full border-l border-surface/10 hidden lg:block" aria-hidden="true" />
        <div className="relative z-10 max-w-7xl mx-auto min-h-[100dvh] px-4 md:px-8 pt-24 md:pt-28 pb-10 grid grid-cols-1 lg:grid-cols-[minmax(0,0.82fr)_minmax(440px,1.18fr)] gap-4 lg:gap-10 items-center">
          <div className="order-2 lg:order-1 max-w-xl pb-3 lg:pb-0">
            <motion.div {...heroItem(0.1)} className="flex flex-wrap items-center gap-3 mb-7">
              <GoogleBadge rating={venue.rating} reviewCount={venue.reviewCount} />
              <span className="text-xs md:text-sm font-bold tracking-[0.08em] uppercase text-accent">Meyerton, SA</span>
            </motion.div>
            <motion.p {...heroItem(0.18)} className="text-xs font-bold tracking-[0.18em] uppercase text-secondary mb-4">The Jimmy's smash</motion.p>
            <motion.h1 {...heroItem(0.28)} className="font-display text-[3.2rem] sm:text-6xl md:text-7xl lg:text-[5.4rem] leading-[0.92] font-extrabold mb-6">
              Proper food.<span className="font-script font-normal text-accent block leading-[1.15] text-[0.8em] pb-2">Done right.</span>
            </motion.h1>
            <motion.p {...heroItem(0.4)} className="text-base md:text-lg text-paper/80 leading-relaxed mb-8 max-w-md">{venue.description}</motion.p>
            <motion.div {...heroItem(0.5)} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Magnetic className="w-full sm:w-auto"><a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="block w-full sm:w-auto text-center bg-accent text-ink px-7 py-3.5 rounded-full font-display font-bold shadow-lg shadow-black/30 transition-transform duration-200 hover:scale-[1.04] active:scale-[0.97]">Book a Table</a></Magnetic>
              <Link to="/menu" className="w-full sm:w-auto text-center border border-surface/35 text-surface px-7 py-3.5 rounded-full font-display font-bold hover:bg-surface hover:text-ink hover:border-surface transition-colors duration-200">View the Menu</Link>
            </motion.div>
          </div>
          <motion.div {...heroItem(0.16)} className="order-1 lg:order-2 w-full max-w-[620px] mx-auto lg:max-w-none -mt-4 lg:mt-0"><BurgerAssembly /></motion.div>
        </div>
      </section>
      {/* Golden marquee band: constant life in the sticker voice */}
      <Marquee />

      {/* ============ Friday specials: the poster wall ============ */}
      <section className="relative py-20 md:py-24 overflow-hidden bg-secondary/10">
        <Doodle name="platter" className="absolute -top-6 right-[8%] w-36 h-36 text-primary/[0.08] rotate-12 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <motion.div {...fadeInUp} className="flex items-end justify-between gap-6 mb-4">
            <div>
              <span className="font-script text-2xl text-primary">every week, one big one</span>
              <RevealHeading text="Friday specials" className="font-display text-3xl md:text-5xl font-extrabold text-ink mt-1" />
            </div>
            <Link to="/specials" className="hidden sm:inline-flex items-center gap-2 text-primary font-bold group whitespace-nowrap pb-1.5">
              <span>All specials</span>
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
          <motion.p {...fadeInUp} className="text-ink/60 max-w-md mb-12">
            Straight from Jimmy's own poster wall. One rotates in every Friday, while stocks last.
          </motion.p>
        </div>

        {/* The signature moment: posters stamp down like stickers on the wall.
            This is the ONLY place on the page that moves with intent. */}
        <motion.div
          ref={specialsRail}
          variants={stampContainer}
          initial="initial"
          whileInView="whileInView"
          viewport={{ once: true, amount: 0.15 }}
          className="flex gap-5 overflow-x-auto scrollbar-hide snap-x snap-mandatory px-4 md:px-8 pt-6 pb-4 lg:max-w-7xl lg:mx-auto"
        >
          {specials.fridays.map((s, i) => (
            <motion.div
              key={s.title}
              variants={shouldReduceMotion ? riseChild : stampChild}
              custom={i % 2 === 0 ? -1.4 : 1.2}
              whileHover={shouldReduceMotion ? undefined : { rotate: 0, y: -6, scale: 1.015 }}
              className={`snap-start shrink-0 w-[272px] md:w-[300px] rounded-2xl relative overflow-hidden ${
                s.poster ? 'shadow-xl shadow-ink/20' : 'bg-ink p-7 pt-9'
              }`}
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
                    <Starburst value={s.price} className="absolute -top-5 -right-3 w-[86px] h-[86px] text-[26px]" />
                  )}
                  <span className="font-script text-secondary text-xl block">Friday special</span>
                  <h3 className="font-display text-[28px] font-extrabold text-surface leading-tight mt-1.5 pr-10">{s.title}</h3>
                  <p className="text-paper/75 text-sm leading-relaxed mt-3.5 min-h-[84px]">{s.description}</p>
                  <p className="text-xs font-bold text-accent mt-4">{s.note}</p>
                </>
              )}
            </motion.div>
          ))}
        </motion.div>

        <div className="sm:hidden text-center mt-6">
          <Link to="/specials" className="inline-flex items-center gap-2 text-primary font-bold">
            <span>All specials</span>
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Divider experiment 1: soft wave into Crowd favourites */}
      <WaveDivider fill="rgb(var(--color-surface))" />

      {/* ============ Food: the hands-on choice ============ */}
      <section className="relative py-20 md:py-28 bg-surface overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <motion.div {...fadeInUp} className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-10 md:mb-14">
            <div className="max-w-xl">
              <span className="text-xs font-bold tracking-[0.16em] uppercase text-primary">Pick your hunger</span>
              <RevealHeading text="Made to hold with both hands" className="font-display text-4xl md:text-6xl font-extrabold text-ink leading-[0.96] mt-3" />
            </div>
            <p className="text-ink/60 max-w-sm leading-relaxed">Big patties, crisp edges and the kind of burger that needs a proper grip.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <Link to="/menu" className="group relative min-h-[440px] md:min-h-[620px] overflow-hidden bg-ink block">
              <img src="/images/campaign/beef-burger-hand.webp" alt="Beef burger held in both hands" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/10 to-transparent" />
              <div className="absolute left-6 right-6 bottom-6 md:left-9 md:right-9 md:bottom-9 flex items-end justify-between gap-4 text-surface">
                <div><span className="text-xs font-bold tracking-[0.14em] uppercase text-accent">The classic</span><h3 className="font-display text-3xl md:text-4xl font-extrabold mt-1">Beef Burgers</h3></div>
                <ArrowRight size={24} className="shrink-0 transition-transform duration-300 group-hover:translate-x-2" />
              </div>
            </Link>
            <Link to="/menu" className="group relative min-h-[440px] md:min-h-[620px] overflow-hidden bg-primary block md:mt-12">
              <img src="/images/campaign/chicken-burger-hand.webp" alt="Chicken burger held in both hands" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/10 to-transparent" />
              <div className="absolute left-6 right-6 bottom-6 md:left-9 md:right-9 md:bottom-9 flex items-end justify-between gap-4 text-surface">
                <div><span className="text-xs font-bold tracking-[0.14em] uppercase text-accent">The other favourite</span><h3 className="font-display text-3xl md:text-4xl font-extrabold mt-1">Chicken Burgers</h3></div>
                <ArrowRight size={24} className="shrink-0 transition-transform duration-300 group-hover:translate-x-2" />
              </div>
            </Link>
          </div>
        </div>
      </section>
      {/* ============ Coffee & Cars: Jimmy's monthly ritual ============ */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <div className="checker absolute top-0 left-0 right-0 opacity-70" aria-hidden="true" />
        <Doodle name="car" className="absolute bottom-6 right-[4%] w-40 h-40 text-primary/[0.08] -rotate-3 pointer-events-none" />
        <Doodle name="coffee" className="absolute top-16 left-[3%] w-24 h-24 text-primary/[0.07] rotate-6 pointer-events-none hidden md:block" />
        <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center pt-6">
          <motion.div {...fadeInUp} className="relative">
            <div className="rounded-2xl overflow-hidden rotate-[-1.5deg] ring-8 ring-surface shadow-xl shadow-ink/15 relative">
              <motion.img {...imageSettle} src={coffeeImage} alt="Coffee and Cars morning at Jimmy's" loading="lazy" className="w-full h-[320px] md:h-[420px] object-cover object-center" />
              <div className="absolute left-3 top-3 flex gap-2" aria-label="Coffee and Cars photos">
                {coffeeAndCarsImages.map((image) => (
                  <button key={image.src} type="button" onMouseEnter={() => setCoffeeImage(image.src)} onFocus={() => setCoffeeImage(image.src)} onClick={() => setCoffeeImage(image.src)} aria-label={image.label} className={`w-11 h-11 overflow-hidden border-2 transition-all ${coffeeImage === image.src ? 'border-accent scale-105' : 'border-surface/70 hover:border-accent'}`}>
                    <img src={image.src} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>            <Starburst label="breakfast" value="R95" className="absolute -bottom-6 -right-2 md:-right-6 w-24 h-24 md:w-28 md:h-28 text-[28px] md:text-[32px]" />
          </motion.div>

          <motion.div {...fadeInUp}>
            <span className="font-script text-2xl text-primary">start your engines</span>
            <RevealHeading text={specials.event.title} className="font-display text-4xl md:text-5xl font-extrabold text-ink mt-1 mb-5" />
            <p className="text-ink/65 text-lg leading-relaxed max-w-md mb-7">
              {specials.event.description}
            </p>
            <div className="inline-flex items-center gap-2.5 bg-ink text-paper px-5 py-2.5 rounded-full text-sm font-bold">
              <Clock size={16} className="text-secondary" />
              <span>{specials.event.schedule}</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============ Drinks band: ambience video under navy ============ */}
      <section ref={drinksRef} className="relative py-28 md:py-40 overflow-hidden bg-ink">
        <motion.div style={{ y: drinksY }} className="absolute inset-x-0 -inset-y-12 z-0">
          {venue.ambience.type === 'video' ? (
            <video src={venue.ambience.video} autoPlay muted loop playsInline className="w-full h-full object-cover opacity-45" />
          ) : (
            <img src={venue.ambience.image} alt="" className="w-full h-full object-cover opacity-45" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/75 to-ink/30" />
        </motion.div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8">
          <motion.div {...fadeInUp} className="max-w-xl">
            <h2 className="font-display text-4xl md:text-5xl font-extrabold text-surface mb-5">Cold ones,<span className="font-script font-normal text-secondary block leading-[1.3] pb-2 text-[0.8em]">sorted.</span></h2>
            <p className="text-lg text-paper/85 leading-relaxed mb-9 max-w-md">Local lagers at R28, Savannas by the bucket, and a house cocktail called the Frikkie van Zyl. Ask the bar, they'll explain.</p>
            <Link to="/drinks" className="group inline-flex items-center gap-3 bg-surface text-ink pl-7 pr-2 py-2 rounded-full font-display font-bold transition-transform duration-200 hover:scale-[1.04] active:scale-[0.97]"><span>The bar list</span><span className="flex items-center justify-center w-11 h-11 rounded-full bg-ink/[0.06] group-hover:translate-x-0.5 transition-transform"><ArrowRight size={18} /></span></Link>
          </motion.div>
        </div>
      </section>
      {/* Divider experiment 2: checkered-flag edge into Story - the site's
          existing racing/Coffee&Cars motif, bent into a section break rather
          than the flat .checker strip */}
      <CheckerDivider fill="rgb(var(--color-surface))" />

      {/* ============ Story: the place after the plate ============ */}
      <section className="py-20 md:py-28 bg-surface overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <motion.div {...fadeInUp} className="relative min-h-[480px] md:min-h-[620px] order-2 lg:order-1">
            <img src="/images/campaign/atmosphere.webp" alt="Atmosphere at Jimmy's Burger Bar" loading="lazy" className="absolute top-0 left-0 w-[78%] h-[78%] object-cover" />
            <div className="absolute right-0 bottom-0 w-[54%] h-[56%] bg-primary border-[10px] border-surface shadow-xl shadow-ink/20 flex items-center justify-center p-6">
              <img src="/images/jimmys-logo-2.png" alt="Jimmy's Burger Bar logo" loading="lazy" className="max-h-full max-w-full object-contain" />
            </div>
          </motion.div>
          <motion.div {...fadeInUp} className="order-1 lg:order-2">
            <span className="text-xs font-bold tracking-[0.16em] uppercase text-primary">More than a quick stop</span>
            <RevealHeading text="The food brings you in. The place keeps you here." className="font-display text-4xl md:text-5xl font-extrabold text-ink leading-[0.96] mt-4 mb-6" />
            <div className="space-y-4 text-ink/70 leading-relaxed max-w-md"><p>Jimmy's is where the table turns into another round, the bar gets louder and the regulars already know your order.</p><p>Come through for proper food, live music, Coffee & Cars and a night that does not need a reason.</p></div>
            <div className="grid grid-cols-3 gap-5 mt-10 pt-7 border-t border-ink/15 max-w-md"><div><p className="font-display text-3xl font-extrabold text-primary inline-flex items-center gap-1">{venue.rating}<Star size={22} fill="currentColor" strokeWidth={0} /></p><p className="text-sm text-ink/55 mt-1">Google rating</p></div><div><p className="font-display text-3xl font-extrabold text-primary">{venue.reviewCount}+</p><p className="text-sm text-ink/55 mt-1">local reviews</p></div><div><p className="font-display text-3xl font-extrabold text-primary">180g</p><p className="text-sm text-ink/55 mt-1">smash patties</p></div></div>
          </motion.div>
        </div>
      </section>
      {/* ============ Regulars say ============ */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <Doodle name="shake" className="absolute top-12 -right-4 w-32 h-32 text-primary/[0.06] rotate-12 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 md:px-8 relative">
          <motion.div {...fadeInUp} className="flex flex-wrap items-end justify-between gap-6 mb-12">
            <RevealHeading
              text="Take it from the regulars"
              className="font-display text-3xl md:text-4xl font-extrabold text-ink max-w-lg"
            />
            <GoogleBadge rating={venue.rating} reviewCount={venue.reviewCount} variant="light" />
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div {...fadeInUp} className="bg-surface p-9 md:p-10 rounded-2xl flex flex-col justify-between shadow-[0_8px_30px_-12px_rgb(var(--color-ink)/0.18)] ring-1 ring-ink/[0.04]">
              <div>
                <Quote className="text-secondary/60 mb-5" size={36} fill="currentColor" strokeWidth={0} />
                <p className="font-display text-xl md:text-2xl text-ink/90 leading-snug mb-8">{testimonials[0].text}</p>
              </div>
              <div className="flex items-center justify-between gap-3 pt-5 border-t border-ink/10">
                <div className="flex items-center gap-3 min-w-0">
                  <ReviewerAvatar name={testimonials[0].name} idx={0} />
                  <div className="min-w-0">
                    <span className="font-semibold text-ink/80 block truncate">{testimonials[0].name}</span>
                    <PostedOnGoogle />
                  </div>
                </div>
                <div className="flex text-accent shrink-0">
                  {[...Array(testimonials[0].rating)].map((_, i) => (
                    <Star key={i} size={14} fill="currentColor" strokeWidth={0} />
                  ))}
                </div>
              </div>
            </motion.div>

            <div className="flex flex-col gap-6">
              {testimonials.slice(1).map((t, i) => (
                <motion.div key={t.name} {...fadeInUp} className="bg-surface p-8 rounded-2xl flex-1 shadow-[0_8px_30px_-12px_rgb(var(--color-ink)/0.18)] ring-1 ring-ink/[0.04]">
                  <p className="text-ink/75 leading-relaxed mb-6">{t.text}</p>
                  <div className="flex items-center justify-between gap-3 pt-4 border-t border-ink/10">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <ReviewerAvatar name={t.name} idx={i + 1} size="w-9 h-9 text-sm" />
                      <div className="min-w-0">
                        <span className="font-semibold text-ink/80 text-sm block truncate">{t.name}</span>
                        <PostedOnGoogle />
                      </div>
                    </div>
                    <div className="flex text-accent shrink-0">
                      {[...Array(t.rating)].map((_, i) => (
                        <Star key={i} size={13} fill="currentColor" strokeWidth={0} />
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ Gallery teaser: the place, in photos ============ */}
      <section className="py-20 md:py-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <motion.div {...fadeInUp} className="flex items-end justify-between gap-6 mb-10">
            <div>
              <span className="font-script text-2xl text-primary">the food, the crowd, the place</span>
              <RevealHeading text="See it for yourself" className="font-display text-3xl md:text-5xl font-extrabold text-ink mt-1" />
            </div>
            <Link to="/gallery" className="hidden sm:inline-flex items-center gap-2 text-primary font-bold group whitespace-nowrap pb-1.5">
              <span>Full gallery</span>
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>

        <motion.div
          ref={galleryRail}
          variants={staggerContainer}
          initial="initial"
          whileInView="whileInView"
          viewport={{ once: true, amount: 0.15 }}
          className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory px-4 md:px-8"
        >
          {[
            { src: '/images/gallery/burger-macro.jpg', tall: true },
            { src: '/images/gallery/heritage-day-team.jpg', tall: false },
            { src: '/images/gallery/quesadilla-corona.jpg', tall: true },
            { src: '/images/gallery/fireplace-corner.jpg', tall: false },
            { src: '/images/gallery/greek-meze.jpg', tall: true },
            { src: '/images/gallery/corona-sunset.jpg', tall: false },
          ].map((img, i) => (
            <motion.div
              key={img.src}
              variants={riseChild}
              className={`snap-start shrink-0 rounded-2xl overflow-hidden ring-1 ring-ink/[0.06] shadow-[0_8px_30px_-14px_rgb(var(--color-ink)/0.25)] ${
                img.tall ? 'w-[220px] md:w-[260px] aspect-[3/4]' : 'w-[280px] md:w-[340px] aspect-[4/3]'
              } ${i % 3 === 1 ? 'md:mt-8' : ''}`}
            >
              <img src={img.src} alt="" loading="lazy" className="w-full h-full object-cover" />
            </motion.div>
          ))}
          <Link
            to="/gallery"
            className="snap-start shrink-0 w-[220px] md:w-[260px] rounded-2xl bg-ink flex flex-col items-center justify-center gap-3 text-surface font-display font-bold text-center px-6"
          >
            <span>See the full gallery</span>
            <ArrowRight size={20} />
          </Link>
        </motion.div>
      </section>

      {/* ============ Visit strip ============ */}
      <section className="py-20 md:py-24 bg-surface/70 border-t border-ink/10">
        <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16">
          <motion.div {...fadeInUp} className="space-y-7">
            <h2 className="font-display text-2xl md:text-3xl font-extrabold text-ink flex items-center gap-3">
              <Clock className="text-primary" size={24} />
              <span>Opening hours</span>
            </h2>
            <div>
              {venue.hours.map((h) => (
                <div key={h.day} className="flex justify-between items-center py-3.5 border-b border-ink/10">
                  <span className="text-ink/60">{h.day}</span>
                  <span className="font-semibold text-ink">{h.time}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div {...fadeInUp} className="space-y-7">
            <h2 className="font-display text-2xl md:text-3xl font-extrabold text-ink flex items-center gap-3">
              <MapPin className="text-primary" size={24} />
              <span>Find us</span>
            </h2>
            <div className="bg-ink p-8 rounded-2xl text-paper">
              <p className="text-lg leading-relaxed mb-8">{venue.address}</p>
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center justify-center gap-3 w-full bg-surface text-ink pl-7 pr-2 py-2 rounded-full font-display font-bold hover:bg-secondary transition-colors duration-200"
              >
                <span>Book a Table</span>
                <span className="flex items-center justify-center w-11 h-11 rounded-full bg-ink/[0.06] group-hover:translate-x-0.5 transition-transform">
                  <ArrowRight size={18} />
                </span>
              </a>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};
