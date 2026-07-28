import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Star, Quote, Clock, MapPin } from 'lucide-react';
import { config } from '../config';
import { Starburst } from '../components/Starburst';
import { GoogleBadge, GoogleG } from '../components/GoogleBadge';
import { Doodle } from '../components/Doodle';
import { Magnetic } from '../components/Magnetic';
import { EASE, fadeInUp, staggerContainer, riseChild, heroItem, stampContainer, stampChild } from '../lib/motion';
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


// Google-style initial avatar for real reviewers. We deliberately do NOT use
// photos here: these are real named people from Jimmy's Google listing, and
// pairing their names with internet stock faces would fabricate identity.
// Initials-on-colour is exactly what Google itself renders.
const AVATAR_STYLE = ['bg-ink text-surface', 'bg-accent text-ink', 'bg-ink text-surface'] as const;
const ReviewerAvatar: React.FC<{ name: string; idx: number; size?: string }> = ({ name, idx, size = 'w-11 h-11 text-base' }) => (
  <span
    className={`${AVATAR_STYLE[idx % AVATAR_STYLE.length]} ${size} rounded-full flex items-center justify-center font-display font-bold shrink-0 shadow-sm`}
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
  <a
    href={config.venue.googleReviews}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-ink/50 hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
    aria-label="Read this review on Google"
  >
    <GoogleG size={12} />
    <span>Posted on Google</span>
  </a>
);

const REVIEW_TILTS = ['lg:-rotate-[1deg]', 'lg:rotate-[1.2deg]', 'lg:-rotate-[0.55deg]'] as const;
type Review = (typeof config.testimonials)[number];

const ReviewPoster: React.FC<{ review: Review; index: number; featured?: boolean }> = ({
  review,
  index,
  featured = false,
}) => (
  <motion.div {...fadeInUp} className={featured ? 'lg:col-span-7' : 'flex-1'}>
    <article
      className={`relative h-full bg-surface border-2 border-ink/10 rounded-2xl flex flex-col justify-between shadow-[0_18px_45px_-24px_rgb(var(--color-ink)/0.38)] ${
        featured ? 'p-8 md:p-11' : 'p-7 md:p-8'
      } ${REVIEW_TILTS[index % REVIEW_TILTS.length]}`}
    >
      <span
        className={`absolute -top-3 left-1/2 -translate-x-1/2 h-6 bg-accent/85 border-x border-ink/10 shadow-sm ${
          featured ? 'w-24 rotate-[1deg]' : 'w-20 -rotate-[1deg]'
        }`}
        aria-hidden="true"
      />
      <div>
        <div className="flex items-center justify-between gap-4 mb-6">
          <Quote className="text-accent" size={featured ? 38 : 28} fill="currentColor" strokeWidth={0} />
          <span className="text-[9px] font-bold tracking-[0.18em] uppercase text-ink/35">Local regular</span>
        </div>
        <p className={`${featured ? 'font-display text-xl md:text-2xl leading-snug' : 'leading-relaxed'} text-ink/85`}>
          {review.text}
        </p>
      </div>
      <div className="flex items-center justify-between gap-3 pt-5 mt-8 border-t border-ink/10">
        <div className="flex items-center gap-3 min-w-0">
          <ReviewerAvatar name={review.name} idx={index} size={featured ? undefined : 'w-9 h-9 text-sm'} />
          <div className="min-w-0">
            <span className="font-semibold text-ink/80 text-sm block truncate">{review.name}</span>
            <PostedOnGoogle />
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

export const Home: React.FC = () => {
  const { venue, specials, testimonials } = config;

  const shouldReduceMotion = useReducedMotion();
  const [coffeeImage, setCoffeeImage] = useState(coffeeAndCarsImages[0].src);

  useEffect(() => {
    if (shouldReduceMotion) return;
    const rotation = window.setInterval(() => {
      setCoffeeImage((current) => {
        const currentIndex = coffeeAndCarsImages.findIndex((image) => image.src === current);
        return coffeeAndCarsImages[(currentIndex + 1) % coffeeAndCarsImages.length].src;
      });
    }, 2500);
    return () => window.clearInterval(rotation);
  }, [shouldReduceMotion]);

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
              <GoogleBadge rating={venue.rating} reviewCount={venue.reviewCount} href={venue.googleReviews} />
              <span className="text-xs md:text-sm font-bold tracking-[0.08em] uppercase text-accent">Meyerton, SA</span>
            </motion.div>
            <motion.p {...heroItem(0.18)} className="text-xs font-bold tracking-[0.18em] uppercase text-secondary mb-4">The Jimmy's smash</motion.p>
            <motion.h1 {...heroItem(0.28)} className="font-display text-[2.85rem] sm:text-6xl md:text-7xl lg:text-[5.4rem] leading-[0.92] font-extrabold mb-5 md:mb-6">
              Proper food.<span className="font-script font-normal text-accent block leading-[1.15] text-[0.8em] pb-2">Done right.</span>
            </motion.h1>
            <motion.p {...heroItem(0.4)} className="text-sm sm:text-base md:text-lg text-paper/80 leading-relaxed mb-7 md:mb-8 max-w-md">{venue.description}</motion.p>
            <motion.div {...heroItem(0.5)} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Magnetic className="w-full sm:w-auto"><Link to="/order" className="block w-full sm:w-auto text-center bg-accent text-ink px-7 py-3.5 rounded-full font-display font-bold shadow-lg shadow-black/30 transition-transform duration-200 hover:scale-[1.04] active:scale-[0.97]">Order Online</Link></Magnetic>
              <Link to="/menu" className="w-full sm:w-auto text-center border border-surface/35 text-surface px-7 py-3.5 rounded-full font-display font-bold hover:bg-surface hover:text-ink hover:border-surface transition-colors duration-200">View the Menu</Link>
            </motion.div>
          </div>
          <motion.div {...heroItem(0.16)} className="order-1 lg:order-2 w-full max-w-[310px] sm:max-w-[480px] md:max-w-[620px] mx-auto lg:max-w-none -mt-4 lg:mt-0"><BurgerAssembly /></motion.div>
        </div>
      </section>
      {/* Golden marquee band: constant life in the sticker voice */}
      <Marquee />

      {/* ============ Friday specials: the poster wall ============ */}
      <section className="relative py-20 md:py-24 overflow-hidden bg-paper">
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

      {/* The paper poster wall gives way to the dark food feature. */}
      <WaveDivider fill="rgb(var(--color-ink))" />

      {/* ============ Food: the hands-on choice ============ */}
      <section className="relative py-20 md:py-28 bg-ink overflow-hidden text-surface">
        <Doodle name="burger" className="absolute -right-12 top-4 w-64 h-64 text-accent/[0.07] rotate-6 pointer-events-none" />
        <div className="absolute inset-0 poster-wall-grid opacity-[0.08] pointer-events-none" aria-hidden="true" />
        <div className="max-w-7xl mx-auto px-4 md:px-8 relative">
          <motion.div {...fadeInUp} className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-10 md:mb-14">
            <div className="max-w-xl">
              <span className="text-xs font-bold tracking-[0.16em] uppercase text-accent">Pick your hunger</span>
              <RevealHeading text="Pick your kind of proper" className="font-display text-4xl md:text-6xl font-extrabold text-surface leading-[0.96] mt-3" />
            </div>
            <p className="text-paper/70 max-w-sm leading-relaxed">Beef or chicken, stacked high and finished Jimmy&apos;s way. One choice, no wrong answer.</p>
          </motion.div>

          <motion.div {...fadeInUp} className="flex flex-wrap gap-x-8 gap-y-2 border-y border-surface/15 py-4 mb-7 text-xs md:text-sm font-bold tracking-[0.12em] uppercase text-accent">
            <span>180g smash patties</span>
            <span>Crisp off the grill</span>
            <span>Jimmy&apos;s sauce</span>
          </motion.div>

          <div className="flex md:grid md:grid-cols-[1.08fr_0.92fr] gap-3 md:gap-0 overflow-x-auto md:overflow-visible snap-x snap-mandatory scrollbar-hide -mx-4 md:mx-0 px-4 md:px-0">
            <Link to="/menu" className="burger-wall-panel group relative shrink-0 w-[86vw] md:w-auto min-h-[400px] md:min-h-[600px] overflow-hidden bg-primary block snap-center rounded-2xl md:rounded-r-none ring-1 ring-surface/10">
              <img src="/images/campaign/beef-burger-hand.webp" alt="Beef burger held up at Jimmy's" loading="lazy" className="burger-hand-photo absolute inset-0 w-full h-full object-contain transition-transform duration-700" />
              <div className="absolute z-10 left-6 right-6 bottom-6 md:left-9 md:right-9 md:bottom-9 flex items-end justify-between gap-4 text-surface">
                <div><span className="text-xs font-bold tracking-[0.14em] uppercase text-accent">The classic</span><h3 className="font-display text-3xl md:text-4xl font-extrabold mt-1">Beef Burgers</h3></div>
                <ArrowRight size={24} className="shrink-0 transition-transform duration-300 group-hover:translate-x-2" />
              </div>
            </Link>
            <Link to="/menu" className="burger-wall-panel group relative shrink-0 w-[86vw] md:w-auto min-h-[400px] md:min-h-[600px] overflow-hidden bg-primary block snap-center md:translate-y-10 rounded-2xl md:rounded-l-none ring-1 ring-surface/10">
              <img src="/images/campaign/chicken-burger-hand.webp" alt="Chicken burger held up at Jimmy's" loading="lazy" className="burger-hand-photo absolute inset-0 w-full h-full object-contain transition-transform duration-700" />
              <div className="absolute z-10 left-6 right-6 bottom-6 md:left-9 md:right-9 md:bottom-9 flex items-end justify-between gap-4 text-surface">
                <div><span className="text-xs font-bold tracking-[0.14em] uppercase text-accent">The other favourite</span><h3 className="font-display text-3xl md:text-4xl font-extrabold mt-1">Chicken Burgers</h3></div>
                <ArrowRight size={24} className="shrink-0 transition-transform duration-300 group-hover:translate-x-2" />
              </div>
            </Link>
          </div>
        </div>
      </section>
      {/* ============ Coffee & Cars: Jimmy's monthly ritual ============ */}
      <section className="relative py-20 md:py-28 overflow-hidden bg-accent">
        <div className="checker checker-ink absolute top-0 left-0 right-0 opacity-25" aria-hidden="true" />
        <Doodle name="car" className="absolute bottom-6 right-[4%] w-40 h-40 text-primary/[0.08] -rotate-3 pointer-events-none" />
        <Doodle name="coffee" className="absolute top-16 left-[3%] w-24 h-24 text-primary/[0.07] rotate-6 pointer-events-none hidden md:block" />
        <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center pt-6">
          <motion.div {...fadeInUp} className="relative">
            <div className="h-[320px] md:h-[420px] rounded-2xl overflow-hidden rotate-[-1.5deg] ring-8 ring-surface shadow-xl shadow-ink/15 relative bg-ink">
              <AnimatePresence initial={false}>
                <motion.img
                  key={coffeeImage}
                  src={coffeeImage}
                  alt="Coffee and Cars morning at Jimmy's"
                  loading="lazy"
                  initial={{ opacity: 0, scale: 1.025 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.7, ease: EASE }}
                  className="absolute inset-0 w-full h-full object-cover object-center"
                />
              </AnimatePresence>
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
            <Link to="/menu?tab=drinks" className="group inline-flex items-center gap-3 bg-surface text-ink pl-7 pr-2 py-2 rounded-full font-display font-bold transition-transform duration-200 hover:scale-[1.04] active:scale-[0.97]"><span>The bar list</span><span className="flex items-center justify-center w-11 h-11 rounded-full bg-ink/[0.06] group-hover:translate-x-0.5 transition-transform"><ArrowRight size={18} /></span></Link>
          </motion.div>
        </div>
      </section>
      {/* Divider experiment 2: checkered-flag edge into Story - the site's
          existing racing/Coffee&Cars motif, bent into a section break rather
          than the flat .checker strip */}
      <CheckerDivider fill="rgb(var(--color-paper))" />

      {/* ============ Story: the place after the plate ============ */}
      <section className="py-20 md:py-28 bg-paper overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <motion.div {...fadeInUp} className="relative min-h-[420px] md:min-h-[620px] order-2 lg:order-1 rounded-2xl overflow-hidden jimmy-media-frame">
            <img src="/images/jimmys-logo-2.png" alt="Jimmy's Burger Bar burgers and logo" loading="lazy" className="absolute inset-0 w-full h-full object-contain bg-primary p-4 md:p-8" />
          </motion.div>
          <motion.div {...fadeInUp} className="order-1 lg:order-2">
            <span className="text-xs font-bold tracking-[0.16em] uppercase text-primary">More than a quick stop</span>
            <RevealHeading text="The food brings you in. The place keeps you here." className="font-display text-4xl md:text-5xl font-extrabold text-ink leading-[0.96] mt-4 mb-6" />
            <div className="space-y-4 text-ink/70 leading-relaxed max-w-md"><p>Jimmy's is where the table turns into another round, the bar gets louder and the regulars already know your order.</p><p>Come through for proper food, live music, Coffee & Cars and a night that does not need a reason.</p></div>
            <div className="grid grid-cols-3 gap-5 mt-10 pt-7 border-t border-ink/15 max-w-md">
              <a href={venue.googleReviews} target="_blank" rel="noopener noreferrer" className="group rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                <p className="font-display text-3xl font-extrabold text-primary inline-flex items-center gap-1 group-hover:text-accent transition-colors">{venue.rating}<Star size={22} fill="currentColor" strokeWidth={0} /></p>
                <p className="text-sm text-ink/55 mt-1">Google rating</p>
              </a>
              <a href={venue.googleReviews} target="_blank" rel="noopener noreferrer" className="group rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                <p className="font-display text-3xl font-extrabold text-primary group-hover:text-accent transition-colors">{venue.reviewCount}+</p>
                <p className="text-sm text-ink/55 mt-1">local reviews</p>
              </a>
              <div><p className="font-display text-3xl font-extrabold text-primary">180g</p><p className="text-sm text-ink/55 mt-1">smash patties</p></div>
            </div>
          </motion.div>
        </div>
      </section>
      <WaveDivider fill="rgb(var(--color-surface))" />

      {/* ============ Regulars say ============ */}
      <section className="relative py-20 md:py-28 overflow-hidden bg-surface">
        <Doodle name="shake" className="absolute top-12 -right-4 w-32 h-32 text-primary/[0.06] rotate-12 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 md:px-8 relative">
          <motion.div {...fadeInUp} className="flex flex-wrap items-end justify-between gap-6 mb-12">
            <div>
              <span className="font-script text-2xl text-primary">pinned by the people who know us</span>
              <RevealHeading
                text="Take it from the regulars"
                className="font-display text-3xl md:text-5xl font-extrabold text-ink max-w-xl mt-1"
              />
            </div>
            <GoogleBadge rating={venue.rating} reviewCount={venue.reviewCount} variant="light" href={venue.googleReviews} />
          </motion.div>

          <div className="poster-wall-grid rounded-[1.75rem] md:rounded-[2.25rem] bg-paper p-5 md:p-10 lg:p-12 border border-ink/10 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 lg:gap-9 items-stretch">
              <ReviewPoster review={testimonials[0]} index={0} featured />
              <div className="lg:col-span-5 flex flex-col gap-7 lg:gap-9">
                {testimonials.slice(1).map((review, index) => (
                  <ReviewPoster key={review.name} review={review} index={index + 1} />
                ))}
              </div>
            </div>
            <motion.p {...fadeInUp} className="text-center text-xs text-ink/45 mt-9">
              Real words from Jimmy&apos;s Google listing. Tap any Google label to read more.
            </motion.p>
          </div>
        </div>
      </section>
      <WaveDivider fill="rgb(var(--color-ink))" />

      {/* ============ Gallery teaser: the place, in photos ============ */}
      <section className="py-20 md:py-24 overflow-hidden bg-ink">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <motion.div {...fadeInUp} className="flex items-end justify-between gap-6 mb-10">
            <div>
              <span className="font-script text-2xl text-accent">the food, the crowd, the place</span>
              <RevealHeading text="See it for yourself" className="font-display text-3xl md:text-5xl font-extrabold text-surface mt-1" />
            </div>
            <Link to="/visit#gallery" className="hidden sm:inline-flex items-center gap-2 text-accent font-bold group whitespace-nowrap pb-1.5">
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
              className={`snap-start shrink-0 rounded-2xl overflow-hidden ring-1 ring-surface/15 shadow-[0_8px_30px_-14px_rgb(0_0_0/0.45)] ${
                img.tall ? 'w-[220px] md:w-[260px] aspect-[3/4]' : 'w-[280px] md:w-[340px] aspect-[4/3]'
              } ${i % 3 === 1 ? 'md:mt-8' : ''}`}
            >
              <img src={img.src} alt="" loading="lazy" className="w-full h-full object-cover" />
            </motion.div>
          ))}
          <Link
            to="/visit#gallery"
            className="snap-start shrink-0 w-[220px] md:w-[260px] rounded-2xl bg-accent flex flex-col items-center justify-center gap-3 text-ink font-display font-bold text-center px-6"
          >
            <span>See the full gallery</span>
            <ArrowRight size={20} />
          </Link>
        </motion.div>
      </section>

      <CheckerDivider fill="rgb(var(--color-accent))" flip />

      {/* ============ Closing invitation: one clear end to the story ============ */}
      <section className="relative overflow-hidden bg-accent">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] min-h-[680px] lg:min-h-[720px]">
          <motion.div {...fadeInUp} className="px-5 md:px-10 lg:px-12 py-20 md:py-24 flex flex-col justify-center">
            <span className="font-script text-2xl text-ink/75">the table, the sunset, one more round</span>
            <RevealHeading
              text="Your table’s waiting."
              className="font-display text-5xl sm:text-6xl lg:text-7xl font-extrabold text-ink leading-[0.9] mt-3"
            />
            <p className="text-ink/70 text-lg leading-relaxed max-w-md mt-7">
              Come for the food, stay for the people. Jimmy&apos;s is right here on Loch Street when you&apos;re ready.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-9">
              <Link to="/order" className="inline-flex items-center justify-center gap-2 bg-ink text-surface px-7 py-4 rounded-full font-display font-bold transition-transform hover:scale-[1.03] active:scale-[0.98]">
                Order online <ArrowRight size={18} />
              </Link>
              <Link to="/menu" className="inline-flex items-center justify-center gap-2 bg-surface text-ink px-7 py-4 rounded-full font-display font-bold transition-transform hover:scale-[1.03] active:scale-[0.98]">
                View the menu
              </Link>
            </div>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(venue.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 self-start mt-7 text-ink font-bold border-b border-ink/35 pb-1 hover:border-ink"
            >
              <MapPin size={17} /> Get directions to 57 Loch Street
            </a>
          </motion.div>

          <motion.div {...fadeInUp} className="relative min-h-[520px] lg:min-h-full overflow-hidden">
            <img
              src="/images/gallery/corona-sunset.jpg"
              alt="Cold drinks and a Friday sunset at Jimmy's Burger Bar"
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/65 via-transparent to-transparent lg:bg-gradient-to-r lg:from-accent/35 lg:via-transparent lg:to-transparent" />
            <div className="absolute left-5 right-5 bottom-5 md:left-8 md:right-auto md:bottom-8 md:w-[330px] bg-surface text-ink rounded-2xl p-6 shadow-2xl border border-ink/10">
              <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.18em] uppercase text-ink/55">
                <Clock size={15} className="text-accent" /> Open Monday to Saturday
              </div>
              <p className="font-display text-xl font-extrabold mt-3">57 Loch Street, Meyerton</p>
              <p className="text-sm text-ink/55 mt-1">Kitchen, bar and a table with your name on it.</p>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};
