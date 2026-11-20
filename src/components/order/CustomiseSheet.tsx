import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { Extra } from '../../core/config/types';
import { formatCartMoney } from '../../lib/cartStore';
import { extrasTotal, pickExtras, type CartExtra } from '../../core/menu/extras';
import { toMinor } from '../../core/domain/money';
import { EASE } from '../../lib/motion';

/**
 * Tick extras for one dish. A bottom sheet on a phone, a centred card from md up.
 * The price shown is a convenience: the server prices every extra itself and
 * refuses an order whose extras or total it does not recognise.
 *
 * Presentational. Order.tsx owns the cart and decides what "confirm" means
 * (add a new line, or change an existing one).
 */
export const CustomiseSheet: React.FC<{
  dish: { name: string; /** Minor units. */ price: number };
  offered: Extra[];
  /** Names already chosen, when editing a cart line. */
  initial: readonly string[];
  /** How many of this line the guest has, so the total is the line's total. */
  qty: number;
  mode: 'add' | 'edit';
  onConfirm: (extras: CartExtra[]) => void;
  onClose: () => void;
}> = ({ dish, offered, initial, qty, mode, onConfirm, onClose }) => {
  const [picked, setPicked] = useState<readonly string[]>(() => pickExtras(offered, initial).map((extra) => extra.name));
  const extras = pickExtras(offered, picked);
  const lineTotal = qty * (dish.price + extrasTotal(extras));

  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = `customise-${dish.name.replace(/\W+/g, '-')}`;

  // Focus goes in on open and back to whatever opened the sheet on close.
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelRef.current?.querySelector<HTMLElement>('input')?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') { event.stopPropagation(); onClose(); return; }
    if (event.key !== 'Tab') return;
    // Keep Tab inside the sheet.
    const focusable = [...(panelRef.current?.querySelectorAll<HTMLElement>('button, input') ?? [])].filter((el) => !el.hasAttribute('disabled'));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };

  const toggle = (name: string) => setPicked((current) => (current.includes(name) ? current.filter((n) => n !== name) : [...current, name]));

  return createPortal(
    // data-lenis-prevent: smooth scroll must not take the wheel from the extras list.
    // --admin-bottom-inset is set only by the demo build, so its fixed "Demo" strip never covers the confirm button.
    <div data-lenis-prevent className="fixed inset-0 z-[90] flex items-end justify-center md:items-center" style={{ paddingBottom: 'var(--admin-bottom-inset, 0px)' }} onKeyDown={onKeyDown}>
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 bg-ink/55"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: EASE }}
        onClick={onClose}
      />
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-surface shadow-2xl md:max-h-[80dvh] md:w-[30rem] md:rounded-3xl"
        initial={{ y: 48, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 48, opacity: 0 }}
        transition={{ duration: 0.28, ease: EASE }}
      >
        <div className="flex items-start justify-between gap-4 px-5 pb-3 pt-5 md:px-6">
          <div className="min-w-0">
            <h2 id={titleId} className="font-display text-2xl font-extrabold leading-tight text-ink">{dish.name}</h2>
            <p className="mt-0.5 text-sm font-medium text-ink/70">{formatCartMoney(dish.price)} · Choose your extras</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink/70 hover:bg-ink/5 hover:text-ink">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <fieldset className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-ink/10 px-5 py-2 md:px-6">
          <legend className="sr-only">Extras for {dish.name}</legend>
          <ul className="divide-y divide-ink/10">
            {offered.map((extra) => (
              <li key={extra.name}>
                <label className="flex min-h-12 cursor-pointer items-center gap-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={picked.includes(extra.name)}
                    onChange={() => toggle(extra.name)}
                    className="h-5 w-5 shrink-0 cursor-pointer accent-primary"
                  />
                  <span className="min-w-0 flex-1 font-display font-bold leading-snug text-ink">{extra.name}</span>
                  <span className="whitespace-nowrap font-display font-bold text-ink/80">+{formatCartMoney(toMinor(extra.price))}</span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>

        <div className="border-t border-ink/10 bg-surface px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 md:px-6 md:pb-5">
          <p className="flex items-baseline justify-between gap-4 text-ink" aria-live="polite">
            <span className="font-display font-bold">
              {qty > 1 ? `${qty} × ${formatCartMoney(dish.price + extrasTotal(extras))}` : extras.length === 0 ? 'No extras' : `${extras.length} ${extras.length === 1 ? 'extra' : 'extras'}`}
            </span>
            <span className="font-display text-2xl font-extrabold text-primary">{formatCartMoney(lineTotal)}</span>
          </p>
          <button
            type="button"
            onClick={() => onConfirm(extras)}
            className="mt-3 inline-flex min-h-14 w-full items-center justify-center rounded-full bg-accent font-display text-base font-bold text-ink transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            {mode === 'add' ? 'Add to order' : 'Save changes'}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
};
