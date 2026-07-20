import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { config } from '../config';
import { Logo } from './Logo';
import { Magnetic } from './Magnetic';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { EASE } from '../lib/motion';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const whatsappHref = `https://wa.me/${config.venue.whatsapp}?text=${encodeURIComponent(
  `Hi! I'd like to book a table at ${config.venue.name}.`
)}`;

export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const lastScrollY = useRef(0);
  const { scrollY } = useScroll();

  // Driven by Motion's batched scroll value (not a raw scroll listener) so
  // this stays passive and frame-aligned with Lenis's smooth scroll.
  useMotionValueEvent(scrollY, 'change', (currentScrollY) => {
    setIsScrolled(currentScrollY > 24);

    // Desktop-only auto-hide: slide the navbar away on scroll down, bring
    // it back on scroll up. Mobile keeps it pinned (nav opens as an
    // overlay, so a disappearing trigger would strand the menu button).
    const isDesktop = window.innerWidth >= 1024;
    if (isDesktop && currentScrollY > lastScrollY.current && currentScrollY > 120) {
      setIsHidden(true);
    } else {
      setIsHidden(false);
    }
    lastScrollY.current = currentScrollY;
  });

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileMenuOpen]);

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-4 md:px-8 bg-paper/95 backdrop-blur-md border-b border-ink/10',
        isScrolled ? 'py-2' : 'py-3',
        isHidden ? 'lg:-translate-y-full' : 'lg:translate-y-0'
      )}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between h-12">
        {/* The real oval badge */}
        <Link to="/" className="shrink-0" aria-label="Home">
          <Logo className="h-11 md:h-12 w-auto" />
        </Link>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-9">
          {config.nav.links.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={cn(
                'relative py-1 text-[15px] font-medium transition-colors',
                location.pathname === link.path ? 'text-ink' : 'text-ink/55 hover:text-ink'
              )}
            >
              {link.name}
              {location.pathname === link.path && (
                <motion.span
                  layoutId="nav-underline"
                  className="absolute -bottom-0.5 left-0 w-full h-px bg-primary"
                />
              )}
            </Link>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <Magnetic className="hidden sm:inline-block" strength={0.25}>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center bg-primary text-surface px-5 py-2.5 rounded-full text-sm font-display font-bold transition-transform duration-200 hover:scale-[1.04] active:scale-[0.97] shadow-lg shadow-primary/20"
            >
              Book a Table
            </a>
          </Magnetic>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            className="lg:hidden p-2 rounded-full text-ink transition-colors hover:bg-ink/5"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu — portaled to body because the nav's backdrop-filter
          creates a containing block that would trap fixed positioning. */}
      {createPortal(
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-40 bg-paper flex flex-col items-center justify-center gap-2 lg:hidden"
          >
            {config.nav.links.map((link, i) => (
              <motion.div
                key={link.path}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.06 * i, ease: EASE }}
              >
                <Link
                  to={link.path}
                  className={cn(
                    'block py-3 font-display text-4xl font-bold transition-colors',
                    location.pathname === link.path ? 'text-primary' : 'text-ink/85'
                  )}
                >
                  {link.name}
                </Link>
              </motion.div>
            ))}

            <motion.a
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35, ease: EASE }}
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 bg-primary text-surface px-9 py-4 rounded-full font-display font-bold text-lg shadow-xl shadow-primary/20"
            >
              Book a Table
            </motion.a>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
      )}
    </nav>
  );
};
