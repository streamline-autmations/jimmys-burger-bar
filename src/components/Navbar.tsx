import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import { Menu, MessageCircle, Phone, X } from 'lucide-react';
import { config } from '../config';
import { Logo } from './Logo';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { EASE, STAMP_EASE } from '../lib/motion';
import { orderCtaLabel, todayHoursLabel } from '../core/tenant';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}


// Minimal bar (logo + menu toggle only, every breakpoint) that auto-hides on
// scroll down and returns on scroll up - Crav-style. All navigation, on
// every page, lives in the full-screen overlay below; the bar itself never
// carries page links or CTA buttons, so it stays out of the way of the hero.
export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const hasDarkHero = location.pathname === '/';
  const lastScrollY = useRef(0);
  const navRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const { scrollY } = useScroll();

  // Driven by Motion's batched scroll value (not a raw scroll listener) so
  // this stays passive and frame-aligned with Lenis's smooth scroll.
  useMotionValueEvent(scrollY, 'change', (currentScrollY) => {
    setIsScrolled(currentScrollY > 24);

    if (currentScrollY > lastScrollY.current && currentScrollY > 120) {
      setIsHidden(true);
    } else {
      setIsHidden(false);
    }
    lastScrollY.current = currentScrollY;
  });

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  // Lock body scroll while the overlay is open.
  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMenuOpen]);

  // The open overlay is a modal: the page behind it goes inert (the toggle stays
  // live so it can close the menu), focus moves into the menu, and Escape
  // closes it and hands focus back to the toggle.
  useEffect(() => {
    const nav = navRef.current;
    if (!isMenuOpen || !nav?.parentElement) return;
    // The logo link sits in the bar but leads away, so it goes inert too; only
    // the toggle stays live. No aria-modal: the toggle is outside the dialog,
    // and inert already keeps assistive tech and Tab out of the page behind.
    const logo = nav.querySelector('[data-nav-logo]');
    const behind = [...Array.from(nav.parentElement.children).filter((el) => el !== nav), ...(logo ? [logo] : [])];
    behind.forEach((el) => el.setAttribute('inert', ''));
    const focusFirst = requestAnimationFrame(() => document.querySelector<HTMLElement>('#site-menu a')?.focus());
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsMenuOpen(false);
      toggleRef.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(focusFirst);
      document.removeEventListener('keydown', onKey);
      behind.forEach((el) => el.removeAttribute('inert'));
    };
  }, [isMenuOpen]);

  return (
    <nav
      ref={navRef}
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-4 md:px-8',
        // Open menu: the bar stays clear so the logo and close button sit on
        // the navy dialog instead of a cream strip.
        isScrolled && !isMenuOpen
          ? 'py-2 bg-paper/95 backdrop-blur-md border-b border-ink/10'
          : 'py-3 bg-transparent border-b border-transparent',
        isHidden && !isMenuOpen ? '-translate-y-full' : 'translate-y-0'
      )}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between h-12">
        {/* data-nav-logo is where the first-load intro lands its logo on desktop. */}
        <Link to="/" className="shrink-0" aria-label="Home" data-nav-logo>
          {/* Gold ring, as in the footer: the oval badge is navy-on-navy over the hero. */}
          <span className="inline-block rounded-full ring-2 ring-secondary/60">
            <Logo className="h-11 md:h-12 w-auto" />
          </span>
        </Link>

        <button
          ref={toggleRef}
          onClick={() => setIsMenuOpen((v) => !v)}
          aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isMenuOpen}
          aria-controls="site-menu"
          className={cn(
            'relative z-10 p-2.5 rounded-full transition-colors',
            !isMenuOpen && (isScrolled || !hasDarkHero) ? 'text-ink hover:bg-ink/5' : 'text-surface hover:bg-surface/10'
          )}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={isMenuOpen ? 'close' : 'open'}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2, ease: EASE }}
              className="block"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </motion.span>
          </AnimatePresence>
        </button>
      </div>

      {/* Full-screen overlay menu, portaled to body because the nav's
          backdrop-filter creates a containing block that would trap fixed
          positioning. Blurred real photo backdrop + a stamped-in navy card,
          matching the site's signature landing motion. */}
      {createPortal(
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              id="site-menu"
              role="dialog"
              aria-label="Site menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="fixed inset-0 z-40 bg-primary overflow-y-auto"
            >
              <motion.div
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                transition={{ duration: 0.4, ease: STAMP_EASE, delay: 0.05 }}
                className="min-h-[100dvh] max-w-5xl mx-auto px-7 pt-28 pb-10 sm:px-12 flex flex-col"
              >
                <div className="flex items-center justify-between border-b border-surface/20 pb-6 mb-7"><span className="font-script text-3xl text-secondary">{config.venue.name}</span><span className="text-xs font-bold tracking-[0.18em] uppercase text-surface/65">{config.venue.locality}</span></div>
                <div className="flex-1 flex flex-col justify-center gap-1.5">
                {config.nav.links.map((link, i) => (
                  <motion.div
                    key={link.path}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 + 0.05 * i, ease: EASE }}
                  >
                    <Link
                      to={link.path}
                      className={cn(
                        'block py-2 font-display text-4xl sm:text-5xl font-bold transition-colors',
                        location.pathname === link.path ? 'text-accent' : 'text-surface hover:text-accent'
                      )}
                    >
                      {link.name}
                    </Link>
                  </motion.div>
                ))}

                </div>
                {/* Ordering is the one call to action, so it appears once, as the button. */}
                {config.features.ordering && (
                  <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.35, ease: EASE }}
                    className="mt-8 self-start"
                  >
                    <Link
                      to="/order"
                      aria-current={location.pathname === '/order' ? 'page' : undefined}
                      className="block bg-accent text-ink px-8 py-4 rounded-full font-display font-bold text-lg transition-transform duration-200 hover:scale-[1.03] active:scale-[0.97]"
                    >
                      {orderCtaLabel}
                    </Link>
                  </motion.div>
                )}

                {/* The visit facts a guest wants before leaving the house. */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.45 }}
                  className="mt-8 pt-6 border-t border-surface/20 text-surface/80 text-sm"
                >
                  <p className="font-bold text-surface">{todayHoursLabel()}</p>
                  <p className="mt-1">{config.venue.address}</p>
                  <div className="flex flex-wrap gap-x-6 mt-2">
                    <a href={`https://wa.me/${config.venue.whatsapp}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 min-h-11 font-bold text-accent hover:text-surface transition-colors">
                      <MessageCircle size={16} aria-hidden="true" /> WhatsApp
                    </a>
                    <a href={`tel:${config.venue.phone.replace(/[^\d+]/g, '')}`} aria-label={`Call ${config.venue.phone}`} className="inline-flex items-center gap-2 min-h-11 font-bold text-accent hover:text-surface transition-colors">
                      <Phone size={16} aria-hidden="true" /> Call {config.venue.phone}
                    </a>
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </nav>
  );
};
