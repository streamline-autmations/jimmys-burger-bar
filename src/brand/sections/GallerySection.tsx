import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { RevealHeading } from '../../components/RevealHeading';
import { useRailSkew } from '../../lib/useRailSkew';
import { useDragScroll } from '../../lib/useDragScroll';
import { DESKTOP_QUERY } from '../../lib/useDesktop';
import { staggerContainer, riseChild, fadeInUp } from '../../lib/motion';
import type { GalleryContent } from './types';

gsap.registerPlugin(ScrollTrigger);

export const GallerySection: React.FC<{ content: GalleryContent }> = ({ content }) => {
  const galleryRail = useRailSkew<HTMLDivElement>();
  useDragScroll(galleryRail);
  const sectionRef = useRef<HTMLElement>(null);

  // Desktop: the section pins and vertical scroll walks the rail sideways, so
  // every photo is reached with the wheel a desktop visitor already has in
  // hand. On a phone the rail stays a native swipe, untouched.
  //
  // GSAP owns the TRACK's transform (x for the walk, skewX for the lean), and
  // the track carries no Framer transform values, only stagger timing, so the
  // two never write the same property. The lean is the rails' existing sticker
  // physics, fed by scroll velocity here instead of swipe velocity.
  useEffect(() => {
    const section = sectionRef.current;
    const track = galleryRail.current;
    if (!section || !track) return;

    const media = gsap.matchMedia();
    media.add(`${DESKTOP_QUERY} and (prefers-reduced-motion: no-preference)`, () => {
      // The rail is walked by transform, not scrolled, while pinned. Set here
      // rather than as a class so reduced-motion desktop visitors, who get no
      // pin, keep a scrollable (and draggable) rail.
      gsap.set(track, { overflow: 'visible' });

      const travel = () => {
        const last = track.lastElementChild as HTMLElement | null;
        if (!last) return 0;
        const endPadding = parseFloat(getComputedStyle(track).paddingRight) || 0;
        return Math.max(0, last.offsetLeft + last.offsetWidth + endPadding - track.clientWidth);
      };
      const lean = gsap.quickTo(track, 'skewX', { duration: 0.5, ease: 'power3.out' });

      gsap.to(track, {
        x: () => -travel(),
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: () => `+=${travel()}`,
          scrub: 0.6,
          pin: true,
          // The route-transition wrapper up the tree is display:flex, which
          // makes ScrollTrigger silently drop pin spacing - keep this explicit
          // or the closing section scrolls straight over the pinned gallery.
          pinSpacing: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => lean(gsap.utils.clamp(-3, 3, self.getVelocity() / -350)),
          onScrubComplete: () => lean(0),
        },
      });

      // Headings reflow once the display font lands, which moves every trigger
      // below them; re-measure so the pin starts exactly at the section top.
      void document.fonts?.ready.then(() => ScrollTrigger.refresh());
    });

    return () => media.revert();
  }, [galleryRail]);

  return (
    <section ref={sectionRef} className="py-20 md:py-24 lg:py-16 overflow-hidden bg-ink lg:min-h-[100svh] lg:flex lg:flex-col lg:justify-center">
      <div className="w-full max-w-7xl mx-auto px-4 md:px-8">
        <motion.div {...fadeInUp} className="flex items-end justify-between gap-6 mb-10">
          <div>
            <span className="font-script text-2xl text-accent">{content.script}</span>
            <RevealHeading text={content.heading} className="font-display text-3xl md:text-5xl font-extrabold text-surface mt-1" />
          </div>
          <Link to={content.linkTo} className="hidden sm:inline-flex items-center gap-2 text-accent font-bold group whitespace-nowrap pb-1.5">
            <span>{content.linkLabel}</span>
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
        className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory px-4 md:px-8 lg:relative lg:snap-none"
      >
        {content.images.map((img, i) => (
          <motion.div
            key={img.src}
            variants={riseChild}
            className={`snap-start shrink-0 rounded-2xl overflow-hidden ring-1 ring-surface/15 shadow-[0_8px_30px_-14px_rgb(0_0_0/0.45)] ${
              img.tall ? 'w-[220px] md:w-[260px] lg:w-[290px] aspect-[3/4]' : 'w-[280px] md:w-[340px] lg:w-[420px] aspect-[4/3]'
            } ${i % 3 === 1 ? 'md:mt-8' : ''}`}
          >
            <img src={img.src} alt="" loading="lazy" className="w-full h-full object-cover" />
          </motion.div>
        ))}
        <Link to={content.linkTo} className="snap-start shrink-0 w-[220px] md:w-[260px] lg:w-[290px] rounded-2xl bg-accent flex flex-col items-center justify-center gap-3 text-ink font-display font-bold text-center px-6">
          <span>{content.ctaLabel}</span>
          <ArrowRight size={20} />
        </Link>
      </motion.div>
    </section>
  );
};
