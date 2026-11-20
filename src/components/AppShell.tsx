import React, { Suspense, useEffect, useLayoutEffect } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import { ReceiptText, ShoppingBag, UtensilsCrossed } from 'lucide-react';
import { config } from '../config';
import { copy, todayHoursLabel } from '../core/tenant';
import { EASE, STAMP_EASE } from '../lib/motion';
import { selectCartCount, useCartStore } from '../lib/cartStore';
import { ErrorBoundary } from './ErrorBoundary';
import { Logo } from './Logo';

// The installed app: what opens from the home screen icon or the Android app.
// Menu first, three tabs, no marketing home page and no route curtain (a tab
// switch has to feel instant). Same tokens and the same stamp: the active tab's
// gold sticker and the cart count land like Jimmy's price stickers.
//
// The pages are the website's own pages; only the chrome around them changes.

export interface AppPages {
  Order: React.ComponentType;
  Track: React.ComponentType;
  MyOrders: React.ComponentType;
  Privacy: React.ComponentType;
  FoodDrinks: React.ComponentType;
  Visit: React.ComponentType;
  NotFound: React.ComponentType;
}

/** Tab bar height without the safe area; pages pad their bottom by this. */
export const TAB_BAR_HEIGHT = 68;

const TABS = [
  { key: 'menu', label: 'Menu', to: '/order', icon: UtensilsCrossed },
  { key: 'cart', label: 'Cart', to: '/order?view=cart', icon: ShoppingBag },
  { key: 'orders', label: 'My orders', to: '/orders', icon: ReceiptText },
] as const;

const activeTab = (pathname: string, search: string): string | null => {
  if (pathname === '/order') return ['cart', 'checkout', 'confirmed'].includes(new URLSearchParams(search).get('view') ?? '') ? 'cart' : 'menu';
  if (pathname === '/orders' || pathname === '/track') return 'orders';
  if (pathname === '/menu') return 'menu';
  return null;
};

const TabBar: React.FC = () => {
  const { pathname, search } = useLocation();
  const count = useCartStore(selectCartCount);
  const current = activeTab(pathname, search);

  return (
    <nav
      aria-label="App"
      className="fixed inset-x-0 bottom-0 z-50 bg-ink text-paper shadow-[0_-12px_32px_-20px_rgb(var(--color-ink)/0.7)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto grid max-w-lg grid-cols-3" style={{ height: TAB_BAR_HEIGHT }}>
        {TABS.map(({ key, label, to, icon: Icon }) => {
          const active = current === key;
          return (
            <li key={key} className="flex">
              <Link
                to={to}
                aria-current={active ? 'page' : undefined}
                className={`group relative flex flex-1 flex-col items-center justify-center gap-1 font-display text-[12px] font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${active ? 'text-accent' : 'text-paper/70 hover:text-paper'}`}
              >
                <span className="relative flex h-8 w-14 items-center justify-center">
                  {active && (
                    <motion.span
                      key={pathname + search}
                      aria-hidden="true"
                      className="absolute inset-0 rounded-full bg-accent"
                      initial={{ scale: 0.6, rotate: -8, opacity: 0 }}
                      animate={{ scale: 1, rotate: -3, opacity: 1 }}
                      transition={{ duration: 0.36, ease: STAMP_EASE }}
                    />
                  )}
                  <Icon size={20} strokeWidth={2.4} aria-hidden="true" className={`relative ${active ? 'text-ink' : ''}`} />
                  {key === 'cart' && count > 0 && (
                    <motion.span
                      key={count}
                      aria-hidden="true"
                      className="absolute -right-1 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-paper px-1 text-[11px] font-extrabold leading-none text-ink ring-2 ring-ink"
                      initial={{ scale: 0.4, rotate: -16 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ duration: 0.4, ease: STAMP_EASE }}
                    >
                      {count}
                    </motion.span>
                  )}
                </span>
                <span className="whitespace-nowrap [word-spacing:0.18em]">{label}</span>
                {key === 'cart' && count > 0 && <span className="sr-only">, {count} {count === 1 ? 'item' : 'items'}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

const TopBar: React.FC = () => (
  <header className="bg-paper" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
    <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5 md:px-8">
      <Link to="/order" aria-label={`${config.venue.name} menu`} className="shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
        <Logo className="h-11 w-auto" />
      </Link>
      <div className="min-w-0 text-right leading-tight">
        <p className="font-script text-lg text-primary">{copy.brand.tagline.toLowerCase()}</p>
        <p className="truncate text-xs font-bold text-ink/70">{todayHoursLabel()}</p>
      </div>
    </div>
  </header>
);

export const AppShell: React.FC<{ pages: AppPages; onMount: () => void }> = ({ pages, onMount }) => {
  const location = useLocation();
  const { Order, Track, MyOrders, Privacy, FoodDrinks, Visit, NotFound } = pages;

  // No intro in the app, so nothing else takes the pre-paint boot layer down.
  useLayoutEffect(() => { document.getElementById('boot')?.remove(); }, []);
  useEffect(onMount, [onMount]);
  // A tab is a fresh screen: start it at the top, straight away.
  // 'instant' overrides the site-wide smooth scrolling, which made a tab switch glide.
  useEffect(() => {
    if (location.pathname === '/privacy' && location.hash === '#delete') return;
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname, location.search, location.hash]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex min-h-screen flex-col bg-paper" style={{ paddingBottom: `calc(${TAB_BAR_HEIGHT}px + env(safe-area-inset-bottom))` }} data-app-shell="">
        <TopBar />
        <AnimatePresence mode="wait" initial={false}>
          <motion.main
            key={location.pathname}
            className="flex-grow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.18, ease: EASE } }}
            exit={{ opacity: 0, transition: { duration: 0.1, ease: EASE } }}
          >
            <ErrorBoundary resetKey={location.pathname}>
              <Suspense fallback={<div role="status" className="min-h-[60vh] px-6 pt-10 text-ink">Loading…</div>}>
                <Routes location={location}>
                  <Route path="/" element={<Navigate to="/order" replace />} />
                  <Route path="/order" element={<Order />} />
                  <Route path="/orders" element={<MyOrders />} />
                  <Route path="/track" element={<Track />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/menu" element={<FoodDrinks />} />
                  <Route path="/visit" element={<Visit />} />
                  <Route path="/book" element={<Navigate to="/visit#book" replace />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </motion.main>
        </AnimatePresence>
      </div>
      <TabBar />
    </MotionConfig>
  );
};
