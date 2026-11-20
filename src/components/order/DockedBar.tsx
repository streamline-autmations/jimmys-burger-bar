import React from 'react';
import { motion } from 'framer-motion';
import { formatCartMoney } from '../../lib/cartStore';
import { TAB_BAR_HEIGHT } from '../AppShell';

/**
 * The order bar of the installed app: one slim full-width row docked straight
 * above the tab bar, "N items", the total and one action. Roughly 64px tall,
 * so it never takes the menu or the cart from view.
 *
 * `data-above-tabbar` is the demo strip's hook for lifting it; the flush gap
 * variable tells that rule this bar has no float margin above the tab bar.
 */
export const DOCKED_BAR_HEIGHT = 60;

export const DockedBar: React.FC<{ count: number; total: number; action: string; onAction: () => void; className?: string }> = ({ count, total, action, onAction, className = '' }) => (
  <motion.div
    data-above-tabbar=""
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 12 }}
    transition={{ duration: 0.22 }}
    className={`fixed inset-x-0 z-40 border-t-2 border-accent bg-ink text-paper shadow-[0_-10px_28px_-16px_rgb(var(--color-ink)/0.8)] ${className}`}
    style={{ bottom: `calc(${TAB_BAR_HEIGHT}px + env(safe-area-inset-bottom))`, ['--above-tabbar-gap' as string]: `${TAB_BAR_HEIGHT}px` }}
  >
    <div className="mx-auto flex max-w-2xl items-center gap-4 px-4 py-2 md:px-8" style={{ minHeight: DOCKED_BAR_HEIGHT }}>
      <div className="min-w-0 leading-none">
        <p className="text-xs font-bold leading-4 text-paper/80">{count} {count === 1 ? 'item' : 'items'}</p>
        <p className="mt-0.5 font-display text-xl font-extrabold leading-6 text-accent">{formatCartMoney(total)}</p>
      </div>
      <button
        type="button"
        onClick={onAction}
        className="ml-auto inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-7 font-display text-base font-bold text-ink transition-transform duration-150 active:scale-[0.96]"
      >
        {action}
      </button>
    </div>
  </motion.div>
);
