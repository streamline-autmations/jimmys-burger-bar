// The demo build's overlay: a permanent "demo data" strip, presenter controls
// and a guard that switches off every outbound link.
//
// Swapped in for src/components/BuildOverlay.tsx by vite-plugin-demo.ts, so it
// exists only when VITE_DEMO=1. The `data-rd-demo` attribute it sets is also
// the marker scripts/check-build.mjs looks for: it must be present in a demo
// build and absent from every restaurant's production build.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  CalendarDays, ChefHat, ChevronUp, Home, LayoutDashboard, RotateCcw, Search,
  ShoppingBag, Sparkles, Users, X,
} from 'lucide-react';
import { config } from './config';
import { restaurantDate } from '../core/tenant';
import { latestTime, openDates, tradingHours } from '../lib/tradingHours';
import { resetRecords } from './store';

const STRIP_HEIGHT = 40;

/** The presenter's stand-in customer. Unmistakably fictional, like every seeded guest. */
const PRESENTER_GUEST = {
  name: 'Thabo Example',
  phone: '+27 00 000 0099',
  email: 'thabo.example@example.com',
};

const JUMPS = [
  { label: 'Customer site', to: '/', icon: Home },
  { label: 'Order online', to: '/order', icon: ShoppingBag },
  { label: 'Book a table', to: '/visit#book', icon: CalendarDays },
  { label: 'Track an order', to: '/track?ref=JB-DEMO-0003', icon: Search },
  { label: 'Today', to: '/admin', icon: LayoutDashboard },
  { label: 'Kitchen queue', to: '/admin/orders', icon: ChefHat },
  { label: 'Bookings', to: '/admin/bookings', icon: CalendarDays },
  { label: 'Guests', to: '/admin/customers', icon: Users },
] as const;

// ---------------------------------------------------------------------------
// Filling a React-controlled form from outside React: set the value through the
// native setter (React tracks the last value it rendered and ignores a plain
// assignment), then fire the event React listens to.
// ---------------------------------------------------------------------------

const setField = (id: string, value: string): boolean => {
  const element = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null;
  if (!element || element.disabled) return false;
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value')?.set;
  setter?.call(element, value);
  element.dispatchEvent(new Event(element instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
  // React's onBlur listens for focusout.
  element.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
  return true;
};

const nextFrame = () => new Promise((resolve) => setTimeout(resolve, 60));

const clockNow = new Intl.DateTimeFormat('en-GB', {
  timeZone: config.timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

/** A bookable time on `date`: `preferred` if it fits, otherwise the earliest slot at least 30 minutes out. */
function slotFor(date: string, preferred: string): string {
  const hours = tradingHours(date);
  const last = latestTime(hours?.close);
  if (!hours || !last) return '';

  let earliest = hours.open;
  if (date === restaurantDate()) {
    const soon = new Date(Date.now() + 30 * 60000);
    const [h, m] = clockNow.format(soon).split(':').map(Number);
    const rounded = Math.ceil((h * 60 + m) / 15) * 15;
    const candidate = `${String(Math.floor(rounded / 60) % 24).padStart(2, '0')}:${String(rounded % 60).padStart(2, '0')}`;
    if (candidate > earliest) earliest = candidate;
  }
  if (preferred >= earliest && preferred <= last) return preferred;
  return earliest <= last ? earliest : '';
}

async function fillVisibleForm(): Promise<string> {
  if (document.getElementById('order-name')) {
    setField('order-name', PRESENTER_GUEST.name);
    setField('order-phone', PRESENTER_GUEST.phone);
    setField('order-email', PRESENTER_GUEST.email);
    const day = document.getElementById('order-date') as HTMLSelectElement | null;
    const date = day?.options[0]?.value ?? '';
    if (date) setField('order-date', date);
    await nextFrame();
    const time = slotFor(date, '18:00');
    if (time) setField('order-time', time);
    return 'Guest details filled. Check the time, then place the order.';
  }

  if (document.getElementById('booking-name')) {
    setField('booking-name', PRESENTER_GUEST.name);
    setField('booking-phone', PRESENTER_GUEST.phone);
    setField('booking-email', PRESENTER_GUEST.email);
    const date = openDates(config.booking.maxDaysAhead)[0] ?? '';
    if (date) setField('booking-date', date);
    // The time input stays disabled until React has seen the date.
    await nextFrame();
    const time = slotFor(date, '19:00');
    if (time) setField('booking-time', time);
    return 'Guest details filled. Send the booking request when ready.';
  }

  if (document.getElementById('track-reference')) {
    setField('track-reference', 'JB-DEMO-0003');
    setField('track-contact', 'lerato.sample@example.com');
    return 'Filled with a seeded order. Press Check status.';
  }

  return 'Open the order, booking or tracking page first.';
}

export const DemoShell: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const noticeTimer = useRef<number>();
  const panelRef = useRef<HTMLDivElement>(null);

  const say = useCallback((message: string) => {
    setNotice(message);
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(''), 3200);
  }, []);

  // Marks the document as a demo, for styling and for the build check.
  useEffect(() => {
    document.documentElement.setAttribute('data-rd-demo', '');
    return () => document.documentElement.removeAttribute('data-rd-demo');
  }, []);

  // Outbound links are inert. A demo must never phone, message or email a real
  // restaurant, and must never send a prospect off to Jimmy's own socials.
  //
  // Intercepting clicks is not enough: the context menu's "open in new tab" and
  // dragging a link to the tab bar never fire one. So external links lose their
  // real destination in the DOM itself, and clicking one explains why.
  useEffect(() => {
    const isExternal = (anchor: HTMLAnchorElement, href: string) =>
      /^(tel|mailto|sms):/i.test(href) || new URL(anchor.href, window.location.href).origin !== window.location.origin;

    const neutralise = (root: ParentNode) => {
      root.querySelectorAll?.<HTMLAnchorElement>('a[href]').forEach((anchor) => {
        const href = anchor.getAttribute('href') ?? '';
        if (href === '#demo-link' || !isExternal(anchor, href)) return;
        anchor.setAttribute('data-rd-demo-href', href);
        anchor.setAttribute('href', '#demo-link');
        anchor.removeAttribute('target');
      });
    };

    neutralise(document);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes') neutralise(mutation.target.parentNode ?? document);
        mutation.addedNodes.forEach((node) => { if (node instanceof Element) neutralise(node.parentNode ?? node); });
      }
    });
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['href'] });

    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute('href') ?? '';
      if (!anchor.hasAttribute('data-rd-demo-href') && !isExternal(anchor, href)) return;
      event.preventDefault();
      event.stopPropagation();
      say('Outbound links are switched off in the demo. Nothing is sent.');
    };
    // auxclick covers a middle-click, which opens a new tab without a click event.
    document.addEventListener('click', onClick, true);
    document.addEventListener('auxclick', onClick, true);
    return () => {
      observer.disconnect();
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('auxclick', onClick, true);
    };
  }, [say]);

  // Close on navigation, and on Escape.
  useEffect(() => { setOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    panelRef.current?.querySelector<HTMLElement>('button, a')?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const jump = (to: string) => {
    const [path, hash] = to.split('#');
    navigate(hash ? { pathname: path, hash: `#${hash}` } : path);
  };

  const reset = () => {
    resetRecords();
    try {
      for (const key of Object.keys(sessionStorage)) {
        if (key.startsWith(`${config.slug}-`) || key.startsWith('rd-demo-')) sessionStorage.removeItem(key);
      }
    } catch { /* storage blocked */ }
    // A full reload clears the in-memory cart and any half-finished form.
    window.location.assign('/');
  };

  const onAdmin = location.pathname.startsWith('/admin');

  return (
    <>
      <style>{`
        html[data-rd-demo] body { padding-bottom: ${STRIP_HEIGHT}px; }
        html[data-rd-demo] nav.fixed.bottom-0 { bottom: ${STRIP_HEIGHT}px; }
        html[data-rd-demo] .fixed.bottom-6 { bottom: calc(1.5rem + ${STRIP_HEIGHT}px); }
        /* Embedded maps carry their own outbound links, out of reach of the click guard. */
        html[data-rd-demo] iframe { pointer-events: none; }
      `}</style>

      <div
        role="region"
        aria-label="Demo mode"
        className="fixed inset-x-0 bottom-0 z-[300] flex items-center gap-3 bg-ink pl-4 pr-1.5 text-paper shadow-[0_-6px_24px_-12px_rgb(0_0_0/0.45)]"
        style={{ height: STRIP_HEIGHT }}
      >
        <span className="flex h-5 items-center rounded-full bg-accent px-2 font-display text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink">
          Demo
        </span>
        <p className="min-w-0 flex-1 truncate text-xs font-semibold text-paper/85">
          <span className="sm:hidden">Fictional records. Nothing is sent.</span>
          <span className="hidden sm:inline">Restaurant Direct demo. Every guest, order and booking is fictional, and nothing is sent to {config.venue.name}.</span>
        </p>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="rd-demo-panel"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-paper/10 px-3 font-display text-xs font-bold text-paper transition-colors hover:bg-paper/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Controls
          <ChevronUp size={14} aria-hidden="true" className={`transition-transform ${open ? '' : 'rotate-180'}`} />
        </button>
      </div>

      {open && (
        <div
          id="rd-demo-panel"
          ref={panelRef}
          role="dialog"
          aria-label="Demo controls"
          className="fixed right-2 z-[301] w-[min(calc(100vw-1rem),22rem)] overflow-hidden rounded-2xl bg-surface text-ink shadow-[0_24px_60px_-20px_rgb(var(--color-ink)/0.55)] ring-1 ring-ink/10"
          style={{ bottom: STRIP_HEIGHT + 8 }}
        >
          <div className="flex items-center justify-between border-b border-ink/10 px-4 py-3">
            <p className="font-display text-base font-bold text-primary">Presenter controls</p>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close demo controls" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
              <X size={16} aria-hidden="true" />
            </button>
          </div>

          <div className="px-4 pb-4 pt-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink/50">Jump to</p>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {JUMPS.map(({ label, to, icon: Icon }) => {
                const active = to.split(/[?#]/)[0] === location.pathname;
                return (
                  <button
                    key={to}
                    type="button"
                    onClick={() => jump(to)}
                    aria-current={active ? 'page' : undefined}
                    className={`flex min-h-11 items-center gap-2 rounded-xl px-3 text-left text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                      active ? 'bg-primary text-surface' : 'bg-paper text-ink hover:bg-accent/20'
                    }`}
                  >
                    <Icon size={15} aria-hidden="true" className="shrink-0" />
                    {label}
                  </button>
                );
              })}
            </div>

            <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.16em] text-ink/50">Shortcuts</p>
            <div className="mt-2 grid gap-1.5">
              {!onAdmin && (
                <button
                  type="button"
                  onClick={() => void fillVisibleForm().then(say)}
                  className="flex min-h-11 items-center gap-2 rounded-xl bg-accent px-3 text-sm font-bold text-ink transition-colors hover:bg-accent/85 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  <Sparkles size={15} aria-hidden="true" />
                  Fill guest details on this page
                </button>
              )}
              <button
                type="button"
                onClick={reset}
                className="flex min-h-11 items-center gap-2 rounded-xl border border-ink/15 px-3 text-sm font-semibold text-ink transition-colors hover:bg-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <RotateCcw size={15} aria-hidden="true" />
                Reset demo records
              </button>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-ink/65">
              Tip: keep the kitchen queue open in a second window. Orders placed on the customer site appear there straight away.
            </p>
          </div>
        </div>
      )}

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 z-[302] flex justify-center px-4" style={{ bottom: STRIP_HEIGHT + 12 }}>
        {notice && (
          <p className="rounded-full bg-ink px-4 py-2 text-center text-sm font-semibold text-paper shadow-lg">{notice}</p>
        )}
      </div>
    </>
  );
};

export { DemoShell as BuildOverlay };
