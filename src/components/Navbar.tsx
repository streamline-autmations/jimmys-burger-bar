import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { config } from '../config';
import { Logo } from './Logo';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { EASE, STAMP_EASE } from '../lib/motion';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const whatsappHref = `https://wa.me/${config.venue.whatsapp}?text=${encodeURIComponent(
  `Hi! I'd like to book a table at ${config.venue.name}.`
)}`;

// Minimal bar (logo + menu toggle only, every breakpoint) that auto-hides on
// scroll down and returns on scroll up - Crav-style. All navigation, on
// every page, lives in the full-screen overlay below; the bar itself never
// carries page links or CTA buttons, so it stays out of the way of the hero.
export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const lastScrollY = useRef(0);
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

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-4 md:px-8',
        isScrolled || isMenuOpen
          ? 'py-2 bg-paper/95 backdrop-blur-md border-b border-ink/10'
          : 'py-3 bg-transparent border-b border-transparent',
        isHidden && !isMenuOpen ? '-translate-y-full' : 'translate-y-0'
      )}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between h-12">
        <Link to="/" className="shrink-0" aria-label="Home">
          <Logo className="h-11 md:h-12 w-auto" />
        </Link>

        <button
          onClick={() => setIsMenuOpen((v) => !v)}
          aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isMenuOpen}
          className={cn(
            'relative z-10 p-2.5 rounded-full transition-colors',
            isMenuOpen || isScrolled ? 'text-ink hover:bg-ink/5' : 'text-surface hover:bg-surface/10'
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="fixed inset-0 z-40 flex items-center justify-center p-4"
            >
              {/* Blurred photo + gradient backdrop */}
              <div className="absolute inset-0 -z-10 overflow-hidden">
                <img
                  src="/images/gallery/burger-macro.jpg"
                  alt=""
                  className="w-full h-full object-cover scale-110 blur-2xl opacity-60"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-paper/90 via-paper/80 to-ink/85" />
              </div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 12 }}
                transition={{ duration: 0.45, ease: STAMP_EASE, delay: 0.05 }}
                className="w-full max-w-md bg-ink rounded-[2rem] px-8 py-10 sm:px-10 sm:py-12 shadow-2xl shadow-ink/50 flex flex-col items-center gap-1.5"
              >
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
                        'block py-2.5 font-display text-3xl sm:text-4xl font-bold text-center transition-colors',
                        location.pathname === link.path ? 'text-secondary' : 'text-surface/90 hover:text-surface'
                      )}
                    >
                      {link.name}
                    </Link>
                  </motion.div>
                ))}

                {config.features.ordering && (
                  <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 + 0.05 * config.nav.links.length, ease: EASE }}
                  >
                    <Link
                      to="/order"
                      className={cn(
                        'block py-2.5 font-display text-3xl sm:text-4xl font-bold text-center transition-colors',
                        location.pathname === '/order' ? 'text-secondary' : 'text-surface/90 hover:text-surface'
                      )}
                    >
                      Order
                    </Link>
                  </motion.div>
                )}

                <motion.a
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.35, ease: EASE }}
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 bg-accent text-ink px-8 py-3.5 rounded-full font-display font-bold text-base shadow-lg shadow-accent/25 transition-transform duration-200 hover:scale-[1.03] active:scale-[0.97]"
                >
                  Book a Table
                </motion.a>

                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.45 }}
                  className="mt-5 font-script text-secondary/70 text-lg"
                >
                  57 Loch Street, Meyerton
                </motion.span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </nav>
  );
};
