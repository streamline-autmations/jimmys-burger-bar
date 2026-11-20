import React from 'react';
import { ArrowLeft, Minus, Plus } from 'lucide-react';
import { MenuThumb } from '../MenuThumb';
import { formatCartMoney, type CartLine } from '../../lib/cartStore';
import { TAB_BAR_HEIGHT } from '../AppShell';

/**
 * The cart as its own screen: what is in it, with photos, then one way forward.
 * Checkout (when, where, who, pay) is the next screen. Presentational only; the
 * cart and the step live in Order.tsx.
 */
export const CartScreen: React.FC<{
  lines: CartLine[];
  count: number;
  total: number;
  /** Dish photo by dish name. A dish without one keeps an empty tile. */
  photos: Map<string, string | undefined>;
  soldOut: Set<string>;
  /** An order is being sent or waits on a retry: the cart it was built from is not edited here. */
  locked: boolean;
  /** The installed app has a tab bar the summary must clear. */
  appShell: boolean;
  /** Notices that arrive with the cart, e.g. what Order again could not put back. */
  notice?: React.ReactNode;
  onAdd: (line: CartLine) => void;
  onRemoveOne: (name: string) => void;
  onRemoveLine: (name: string) => void;
  onCheckout: () => void;
  onBack: () => void;
}> = ({ lines, count, total, photos, soldOut, locked, appShell, notice, onAdd, onRemoveOne, onRemoveLine, onCheckout, onBack }) => {
  return (
    <div className="mx-auto max-w-2xl px-4 md:px-8">
      <button type="button" onClick={onBack} className="mb-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-ink/65 hover:text-ink">
        <ArrowLeft size={16} aria-hidden="true" /> Back to menu
      </button>
      <h1 className="font-display text-4xl font-extrabold text-ink md:text-5xl">Your cart</h1>
      {notice && <div className="mt-6">{notice}</div>}

      <ul className="mt-6 divide-y divide-ink/10 rounded-2xl bg-surface px-4 shadow-[0_8px_30px_-14px_rgb(var(--color-ink)/0.2)] ring-1 ring-ink/[0.04] md:px-6">
        {lines.map((line) => {
          const gone = soldOut.has(line.name);
          return (
            <li key={line.name} className="flex gap-3 py-4">
              <MenuThumb src={photos.get(line.name)} alt="" reserve />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-display font-bold leading-snug text-ink">{line.name}</h2>
                  <span className="whitespace-nowrap font-display font-bold text-ink">{formatCartMoney(line.qty * line.price)}</span>
                </div>
                {line.qty > 1 && <p className="text-sm font-medium text-ink/65">{formatCartMoney(line.price)} each</p>}
                {gone && <p className="mt-1 text-sm font-semibold text-ink">Sold out. Remove it to continue.</p>}
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 p-1">
                    <button type="button" aria-label={`Remove one ${line.name}`} disabled={locked} onClick={() => onRemoveOne(line.name)} className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-primary shadow-sm active:scale-90 disabled:opacity-40">
                      <Minus size={14} aria-hidden="true" />
                    </button>
                    <span className="w-6 text-center font-display text-sm font-bold text-ink" aria-label={`${line.qty} of ${line.name}`}>{line.qty}</span>
                    <button type="button" aria-label={`Add one more ${line.name}`} disabled={locked || gone || line.qty >= 99} onClick={() => onAdd(line)} className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-surface shadow-sm active:scale-90 disabled:opacity-40">
                      <Plus size={14} aria-hidden="true" />
                    </button>
                  </span>
                  {/* A "Customise" link for this dish goes here in a later task; the row already has room beside the stepper. */}
                  <button type="button" disabled={locked} onClick={() => onRemoveLine(line.name)} className="ml-auto min-h-11 font-display text-sm font-bold text-ink/70 underline underline-offset-2 hover:text-ink disabled:opacity-40">
                    Remove<span className="sr-only"> {line.name}</span>
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div
        // data-above-tabbar lets the demo strip lift this above itself, as it does the menu's checkout bar.
        {...(appShell ? { 'data-above-tabbar': '' } : {})}
        className="sticky z-30 mt-6 rounded-2xl bg-ink p-4 text-paper shadow-xl shadow-ink/25 md:p-5"
        style={{ bottom: appShell ? `calc(${TAB_BAR_HEIGHT + 12}px + env(safe-area-inset-bottom))` : '12px' }}
      >
        <div className="flex items-baseline justify-between gap-4">
          <span className="font-display font-bold">{count} {count === 1 ? 'item' : 'items'}</span>
          <span className="text-paper/80">Total <strong className="font-display text-2xl font-extrabold text-accent">{formatCartMoney(total)}</strong></span>
        </div>
        <button
          type="button"
          onClick={onCheckout}
          className="mt-3 inline-flex min-h-14 w-full items-center justify-center rounded-full bg-accent font-display text-base font-bold text-ink transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
        >
          Checkout
        </button>
      </div>
    </div>
  );
};
