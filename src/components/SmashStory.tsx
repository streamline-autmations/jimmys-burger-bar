import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Starburst } from './Starburst';

gsap.registerPlugin(ScrollTrigger);

// The wow section: a pinned, scroll-scrubbed showcase for the Smash Burger.
// The viewport holds for ~1.8 screens while giant type slides in from both
// sides, the real burger photo scales up and settles onto its sticker tilt,
// and the R100 starburst stamps in late - the whole signature, choreographed
// to the scrollbar. Full royal-blue colour blocking, the only section on the
// site that uses primary as a full-bleed background.
//
// GSAP owns everything inside (no Framer in this tree, so no transform
// conflicts). Lenis is already driven by gsap.ticker, so the pin is accurate.
// Under prefers-reduced-motion the section renders static and unpinned.
export const SmashStory: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: '+=180%',
          scrub: 0.6,
          pin: true,
          // The route-transition wrapper up the tree is display:flex, which
          // makes ScrollTrigger auto-disable pin spacing - force it back on
          // or following sections scroll straight over the pinned scene.
          pinSpacing: true,
        },
      });

      tl.fromTo('.smash-word-1', { xPercent: -28, opacity: 0 }, { xPercent: 0, opacity: 1, ease: 'none', duration: 0.3 }, 0)
        .fromTo('.smash-word-2', { xPercent: 24, opacity: 0 }, { xPercent: 0, opacity: 1, ease: 'none', duration: 0.3 }, 0.05)
        .fromTo(
          '.smash-photo',
          { scale: 0.55, rotate: 9, yPercent: 18 },
          { scale: 1, rotate: -3, yPercent: 0, ease: 'power1.out', duration: 0.45 },
          0.1
        )
        .fromTo(
          '.smash-burst',
          { scale: 0, rotate: -30 },
          { scale: 1, rotate: 0, ease: 'back.out(2.2)', duration: 0.18 },
          0.5
        )
        .fromTo('.smash-copy', { y: 36, opacity: 0 }, { y: 0, opacity: 1, ease: 'none', duration: 0.22 }, 0.55)
        // a final beat of drift so the scene never feels parked
        .to('.smash-word-1', { xPercent: -4, ease: 'none', duration: 0.3 }, 0.7)
        .to('.smash-word-2', { xPercent: 4, ease: 'none', duration: 0.3 }, 0.7);
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative h-[100svh] overflow-hidden bg-primary text-surface">
      {/* Giant type, layered behind and in front of the photo */}
      <div className="absolute inset-0 flex flex-col items-center justify-center select-none" aria-hidden="true">
        <span className="smash-word-1 font-display font-extrabold uppercase leading-[0.85] tracking-tight text-[19vw] md:text-[15vw] text-surface">
          Smashed
        </span>
        <span className="smash-word-2 font-display font-extrabold uppercase leading-[0.85] tracking-tight text-[19vw] md:text-[15vw] text-outline-surface">
          to order
        </span>
      </div>

      {/* The real burger, landing like a sticker over the type */}
      <div className="smash-photo absolute left-1/2 top-[45%] -translate-x-1/2 -translate-y-1/2 w-[58vw] max-w-[260px] md:max-w-[380px]">
        <div className="rounded-2xl overflow-hidden ring-8 ring-surface shadow-2xl shadow-ink/40 aspect-[4/5]">
          <img src="/images/gallery/burger-macro.jpg" alt="The Smash Burger" className="w-full h-full object-cover" />
        </div>
        <div className="smash-burst absolute -top-7 -right-6 md:-right-10 w-24 h-24 md:w-28 md:h-28 text-[28px] md:text-[32px]">
          <Starburst value="R100" className="w-full h-full" />
        </div>
      </div>

      {/* Grounding copy + CTA */}
      <div className="smash-copy absolute bottom-8 md:bottom-12 left-0 right-0 px-6 md:px-12 flex flex-col md:flex-row md:items-end md:justify-between gap-5">
        <p className="max-w-xs text-paper/90 leading-relaxed font-medium">
          Two smashed patties, cheese and Jimmy's sauce. The burger Meyerton drives for.
        </p>
        <Link
          to="/order"
          className="group inline-flex items-center gap-3 bg-surface text-ink pl-7 pr-2 py-2 rounded-full font-display font-bold w-fit transition-transform duration-200 hover:scale-[1.04] active:scale-[0.97]"
        >
          <span>Order the Smash</span>
          <span className="flex items-center justify-center w-11 h-11 rounded-full bg-ink/[0.06] group-hover:translate-x-0.5 transition-transform">
            <ArrowRight size={18} />
          </span>
        </Link>
      </div>
    </section>
  );
};
