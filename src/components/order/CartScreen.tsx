import React from 'react';
import { ArrowLeft, Minus, Plus, Store, Bike, UtensilsCrossed } from 'lucide-react';
import { config } from '../../config';
import { MenuThumb } from '../MenuThumb';
import { formatCartMoney, type CartLine, type OrderType } from '../../lib/cartStore';
import { unitPrice } from '../../core/menu/extras';
import { DockedBar, DOCKED_BAR_HEIGHT } from './DockedBar';

const FULFILMENT: Record<OrderType, { label: string; Icon: React.ElementType }> = {
  collection: { label: 'Collection', Icon: Store },
  delivery: { label: 'Delivery', Icon: Bike },
  table: { label: 'Eat in', Icon: UtensilsCrossed },
};

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
  /** Dishes that offer extras today: only these get a Customise button. */
  customisable: Set<string>;
  /** An order is being sent or waits on a retry: the cart it was built from is not edited here. */
  locked: boolean;
  /** The installed app has a tab bar the summary must clear. */
  appShell: boolean;
  /** What the order is set to right now. Both are chosen on the checkout screen, so Change goes there. */
  orderType: OrderType;
  asap: boolean;
  /** Notices that arrive with the cart, e.g. what Order again could not put back. */
  notice?: React.ReactNode;
  onAdd: (line: CartLine) => void;
  /** The line's KEY, not the dish name: the same dish with different extras is a separate line. */
  onRemoveOne: (key: string) => void;
  onRemoveLine: (key: string) => void;
  onCustomise: (line: CartLine) => void;
  onCheckout: () => void;
  onBack: () => void;
}> = ({ lines, count, total, photos, soldOut, customisable, locked, appShell, orderType, asap, notice, onAdd, onRemoveOne, onRemoveLine, onCustomise, onCheckout, onBack }) => {
  const { label, Icon } = FULFILMENT[orderType];
  const circle = 'flex h-11 w-11 items-center justify-center rounded-full border-2 border-ink text-ink transition-transform duration-150 active:scale-90 disabled:border-ink/25 disabled:text-ink/30 disabled:active:scale-100';
  const link = 'min-h-11 font-display text-sm font-bold text-ink underline underline-offset-[3px] decoration-2 decoration-ink/40 hover:decoration-ink disabled:opacity-40';

  return (
    <div className="mx-auto max-w-2xl px-4 md:px-8" style={appShell ? { paddingBottom: DOCKED_BAR_HEIGHT + 24 } : undefined}>
      <button type="button" onClick={onBack} className="mb-1 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-ink/70 hover:text-ink">
        <ArrowLeft size={16} aria-hidden="true" /> Back to menu
      </button>

      <div className="mb-5 flex items-center gap-3 rounded-2xl bg-surface py-2 pl-3.5 pr-2 ring-1 ring-ink/10">
        <Icon size={20} strokeWidth={2.2} aria-hidden="true" className="shrink-0 text-primary" />
        <p className="min-w-0 flex-1 leading-tight">
          <span className="block font-display text-sm font-extrabold uppercase tracking-wide text-ink">{label}</span>
          <span className="block truncate text-sm font-medium text-ink/75">
            <strong className="font-bold text-ink">{asap ? 'ASAP' : 'Choose a time'}</strong>{orderType === 'collection' && ` · ${config.venue.address}`}
          </span>
        </p>
        <button type="button" onClick={onCheckout} disabled={locked} className="min-h-11 shrink-0 rounded-full border-2 border-ink px-4 font-display text-sm font-bold text-ink active:scale-95 disabled:opacity-40">
          Change<span className="sr-only"> how and when you get your order</span>
        </button>
      </div>

      <span aria-hidden="true" className="mb-2 block h-1.5 w-10 -rotate-3 rounded-full bg-accent" />
      <h1 className="font-display text-[2.5rem] font-extrabold uppercase leading-none tracking-tight text-ink md:text-5xl">Your cart</h1>
      <p className="mt-2 font-display text-sm font-extrabold uppercase tracking-wide text-ink/70">{count} {count === 1 ? 'item' : 'items'}</p>
      {notice && <div className="mt-5">{notice}</div>}

      <ul className="mt-4 space-y-3">
        {lines.map((line) => {
          const gone = soldOut.has(line.name);
          return (
            <li key={line.key} className="group rounded-2xl bg-ink/[0.05] p-3 ring-1 ring-ink/[0.05]">
              <div className="flex gap-3">
                <MenuThumb src={photos.get(line.name)} alt="" reserve />
                <div className="min-w-0 flex-1">
                  <h2 className="font-display font-bold leading-snug text-ink">{line.name}</h2>
                  {line.extras.length > 0 && (
                    <ul aria-label={`Extras on ${line.name}`} className="mt-0.5 text-sm font-medium text-ink/75">
                      {line.extras.map((extra) => <li key={extra.name}>+ {extra.name} <span className="text-ink/70">{formatCartMoney(extra.price)}</span></li>)}
                    </ul>
                  )}
                  {gone && <p className="mt-1 text-sm font-semibold text-ink">Sold out. Remove it to continue.</p>}
                  <div className="mt-1 flex flex-wrap items-center gap-x-5">
                    {customisable.has(line.name) && (
                      <button type="button" disabled={locked || gone} onClick={() => onCustomise(line)} className={link}>
                        Customise<span className="sr-only"> {line.name}</span>
                      </button>
                    )}
                    <button type="button" disabled={locked} onClick={() => onRemoveLine(line.key)} className={link}>
                      Remove<span className="sr-only"> {line.name}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between gap-3 border-t border-ink/15 pt-3">
                <div className="flex items-center gap-3">
                  <button type="button" aria-label={`Remove one ${line.name}`} disabled={locked} onClick={() => onRemoveOne(line.key)} className={circle}>
                    <Minus size={18} strokeWidth={2.6} aria-hidden="true" />
                  </button>
                  <span className="w-6 text-center font-display text-lg font-extrabold text-ink" aria-label={`${line.qty} of ${line.name}`}>{line.qty}</span>
                  <button type="button" aria-label={`Add one more ${line.name}`} disabled={locked || gone || line.qty >= 99} onClick={() => onAdd(line)} className={circle}>
                    <Plus size={18} strokeWidth={2.6} aria-hidden="true" />
                  </button>
                </div>
                <div className="text-right leading-tight">
                  <p className="font-display text-lg font-extrabold text-ink">{formatCartMoney(line.qty * unitPrice(line))}</p>
                  {line.qty > 1 && <p className="text-xs font-medium text-ink/70">{formatCartMoney(unitPrice(line))} each</p>}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {appShell ? (
        <DockedBar count={count} total={total} action="Checkout" onAction={onCheckout} />
      ) : (
        <div
          className="sticky z-30 mt-6 rounded-2xl bg-ink p-4 text-paper shadow-xl shadow-ink/25 md:p-5"
          style={{ bottom: '12px' }}
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
      )}
    </div>
  );
};
