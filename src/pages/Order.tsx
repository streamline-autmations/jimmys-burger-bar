import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useShallow } from 'zustand/react/shallow';
import { Link } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, Check, ArrowLeft, PartyPopper } from 'lucide-react';
import { config } from '../config';
import { Starburst } from '../components/Starburst';
import { fadeInUp, staggerContainer, riseChild } from '../lib/motion';
import {
  useCartStore,
  parsePrice,
  formatZar,
  selectCartLines,
  selectCartCount,
  selectCartTotal,
  type OrderType,
} from '../lib/cartStore';
import { buildOrderWhatsAppUrl, generateOrderNumber } from '../lib/orderMessage';
import { useStickyHeaderOffset } from '../lib/useStickyHeaderOffset';

type Step = 'browse' | 'checkout' | 'confirmed';

// Tracking is compressed into a short, watchable real-time window rather than
// literally waiting out `avgWaitMins` — the displayed countdown still starts
// at the real average and counts down to 0:00, it just does so over 60
// seconds instead of the full 18 minutes.
const DEMO_DURATION_SECONDS = 60;

const STAGES = ['Received', 'Preparing', 'Ready'] as const;

function useOrderTracking(active: boolean) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      setElapsed((prev) => Math.min(prev + 1, DEMO_DURATION_SECONDS));
    }, 1000);
    return () => clearInterval(id);
  }, [active]);

  const fraction = Math.min(elapsed / DEMO_DURATION_SECONDS, 1);
  const stageIndex = fraction < 0.33 ? 0 : fraction < 0.75 ? 1 : 2;
  const totalDisplaySeconds = config.ordering.avgWaitMins * 60;
  const remaining = Math.max(Math.round(totalDisplaySeconds * (1 - fraction)), 0);
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const countdown = `${mins}:${secs.toString().padStart(2, '0')}`;

  return { stageIndex, countdown, done: fraction >= 1 };
}

export const Order: React.FC = () => {
  const { menu, ordering } = config;

  const [step, setStep] = useState<Step>('browse');
  const [activeCategory, setActiveCategory] = useState(menu.categories[0].name);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [placedOrder, setPlacedOrder] = useState<{
    orderNo: string;
    total: number;
  } | null>(null);
  const stickyBelowHeader = useStickyHeaderOffset();

  const lines = useCartStore(useShallow(selectCartLines));
  const count = useCartStore(selectCartCount);
  const total = useCartStore(selectCartTotal);
  const orderType = useCartStore((s) => s.orderType);
  const tableNumber = useCartStore((s) => s.tableNumber);
  const add = useCartStore((s) => s.add);
  const remove = useCartStore((s) => s.remove);
  const setOrderType = useCartStore((s) => s.setOrderType);
  const setTableNumber = useCartStore((s) => s.setTableNumber);
  const clear = useCartStore((s) => s.clear);

  const tracking = useOrderTracking(step === 'confirmed');

  // Order.tsx runs its own browse -> checkout -> confirmed flow without a
  // route change, so App.tsx's route-level ScrollToTop never fires here.
  // Without this, moving to the next step while scrolled down leaves the
  // new (shorter) step's top content stranded above the viewport.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  const scrollToCategory = (name: string) => {
    setActiveCategory(name);
    const element = document.getElementById(`order-${name}`);
    if (element) {
      const offset = 210;
      const top = element.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  const canPlaceOrder = useMemo(() => {
    if (count === 0 || !customerName.trim()) return false;
    if (orderType === 'table' && !tableNumber.trim()) return false;
    return true;
  }, [count, customerName, orderType, tableNumber]);

  const handlePlaceOrder = () => {
    if (!canPlaceOrder) return;
    const orderNo = generateOrderNumber();
    const url = buildOrderWhatsAppUrl({
      orderNo,
      lines,
      orderType,
      tableNumber,
      total,
      name: customerName,
    });
    window.open(url, '_blank', 'noopener,noreferrer');
    setPlacedOrder({ orderNo, total });
    clear();
    setStep('confirmed');
  };

  const startNewOrder = () => {
    setPlacedOrder(null);
    setCustomerName('');
    setCustomerPhone('');
    setStep('browse');
  };

  if (!config.features.ordering) {
    return (
      <div className="pt-28 pb-24 min-h-[70dvh] flex flex-col items-center justify-center text-center px-4">
        <span className="font-script text-2xl text-primary">coming soon</span>
        <h1 className="font-display text-4xl md:text-6xl font-extrabold text-ink mt-1 mb-4">Online ordering</h1>
        <p className="text-ink/60 text-lg max-w-md mb-8">
          Not switched on yet. For now, book a table or send us a WhatsApp.
        </p>
        <Link
          to="/menu"
          className="inline-flex items-center gap-2 bg-primary text-surface px-8 py-4 rounded-full font-display font-bold transition-transform duration-200 hover:scale-[1.04] active:scale-[0.97] shadow-lg shadow-primary/20"
        >
          See the menu
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-28 min-h-screen pb-28 lg:pb-16">
      <AnimatePresence mode="wait">
        {step === 'browse' && (
          <motion.div
            key="browse"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="max-w-7xl mx-auto px-4 md:px-8">
              <motion.div {...fadeInUp} className="max-w-xl mb-8">
                <span className="font-script text-2xl text-primary">skip the queue</span>
                <h1 className="font-display text-4xl md:text-6xl font-extrabold text-ink mt-1 mb-4">Order online</h1>
                <p className="text-ink/60 text-lg">
                  Build your order below and send it straight to Jimmy's on WhatsApp. No app, no commission, no wait on hold.
                </p>
              </motion.div>
            </div>

            {/* Category tabs */}
            <div className={`sticky ${stickyBelowHeader ? 'top-[64px]' : 'top-0'} z-30 bg-paper/95 backdrop-blur-md border-y border-ink/10 py-3 px-4 overflow-x-auto scrollbar-hide transition-[top] duration-300`}>
              <div className="max-w-7xl mx-auto flex items-center gap-2 md:justify-center min-w-max">
                {menu.categories.map((cat) => (
                  <button
                    key={cat.name}
                    onClick={() => scrollToCategory(cat.name)}
                    className={`relative px-5 py-2 rounded-full font-display font-bold text-sm transition-colors duration-200 active:scale-[0.96] ${
                      activeCategory === cat.name ? 'text-surface' : 'bg-surface text-ink/60 hover:text-ink'
                    }`}
                  >
                    {activeCategory === cat.name && (
                      <motion.span
                        layoutId="order-tab-pill"
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                        className="absolute inset-0 bg-primary rounded-full -z-10"
                      />
                    )}
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              {/* Menu list */}
              <motion.div
                variants={staggerContainer}
                initial="initial"
                whileInView="whileInView"
                viewport={{ once: true, amount: 0.02 }}
                className="lg:col-span-2 space-y-6"
              >
                {menu.categories.map((category) => (
                  <motion.section
                    key={category.name}
                    id={`order-${category.name}`}
                    variants={riseChild}
                    className="bg-surface rounded-2xl p-6 md:p-8 scroll-mt-52 shadow-[0_8px_30px_-14px_rgb(var(--color-ink)/0.2)] ring-1 ring-ink/[0.04]"
                  >
                    <h2 className="font-display text-2xl font-extrabold text-primary mb-1">{category.name}</h2>
                    {category.note && (
                      <p className="font-script text-secondary text-lg mb-5">{category.note}</p>
                    )}

                    <div className="space-y-4 mt-4">
                      {category.items.map((item) => {
                        const price = parsePrice(item.price);
                        const qty = lines.find((l) => l.name === item.name)?.qty ?? 0;
                        return (
                          <div key={item.name} className="flex items-center gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-3">
                                <h3 className="font-display font-bold text-ink leading-snug truncate">{item.name}</h3>
                                <span className="font-display font-bold text-ink whitespace-nowrap">{item.price}</span>
                              </div>
                              <p className="text-sm text-ink/55 leading-relaxed pr-4">{item.description}</p>
                            </div>

                            <div className="shrink-0">
                              {qty === 0 ? (
                                <motion.button
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => add(item.name, price)}
                                  className="flex items-center gap-1.5 bg-ink/5 hover:bg-primary hover:text-surface text-ink px-3.5 py-2 rounded-full font-display font-bold text-sm transition-colors"
                                >
                                  <Plus size={14} /> Add
                                </motion.button>
                              ) : (
                                <div className="flex items-center gap-2.5 bg-primary/10 rounded-full px-1.5 py-1.5">
                                  <motion.button
                                    whileTap={{ scale: 0.85 }}
                                    onClick={() => remove(item.name)}
                                    aria-label={`Remove one ${item.name}`}
                                    className="w-7 h-7 flex items-center justify-center rounded-full bg-surface text-primary shadow-sm"
                                  >
                                    <Minus size={14} />
                                  </motion.button>
                                  <span className="font-display font-bold text-ink w-4 text-center text-sm">{qty}</span>
                                  <motion.button
                                    whileTap={{ scale: 0.85 }}
                                    onClick={() => add(item.name, price)}
                                    aria-label={`Add one more ${item.name}`}
                                    className="w-7 h-7 flex items-center justify-center rounded-full bg-primary text-surface shadow-sm"
                                  >
                                    <Plus size={14} />
                                  </motion.button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.section>
                ))}
              </motion.div>

              {/* Cart aside — desktop only, sticky */}
              <div className="hidden lg:block lg:col-span-1 sticky top-[140px]">
                <CartPanel
                  lines={lines}
                  total={total}
                  orderType={orderType}
                  tableNumber={tableNumber}
                  onOrderTypeChange={setOrderType}
                  onTableNumberChange={setTableNumber}
                  onCheckout={() => setStep('checkout')}
                />
              </div>
            </div>

            {/* Mobile checkout pill */}
            <AnimatePresence>
              {count > 0 && (
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.25 }}
                  onClick={() => setStep('checkout')}
                  className="lg:hidden fixed bottom-6 left-4 right-20 z-40 bg-ink text-paper rounded-full py-4 px-6 flex items-center justify-between font-display font-bold shadow-xl shadow-ink/25"
                >
                  <span className="flex items-center gap-2">
                    <ShoppingBag size={18} />
                    {count} item{count === 1 ? '' : 's'}
                  </span>
                  <span>{formatZar(total)} · Checkout</span>
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {step === 'checkout' && (
          <motion.div
            key="checkout"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="max-w-2xl mx-auto px-4 md:px-8"
          >
            <button
              onClick={() => setStep('browse')}
              className="inline-flex items-center gap-1.5 text-ink/55 hover:text-ink font-medium text-sm mb-6"
            >
              <ArrowLeft size={16} /> Back to menu
            </button>

            <span className="font-script text-2xl text-primary">almost there</span>
            <h1 className="font-display text-3xl md:text-5xl font-extrabold text-ink mt-1 mb-8">Checkout</h1>

            <div className="bg-surface rounded-2xl p-6 md:p-8 shadow-[0_8px_30px_-14px_rgb(var(--color-ink)/0.2)] ring-1 ring-ink/[0.04] mb-6">
              <label className="block font-display font-bold text-ink text-sm mb-2">Your name</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Riaan"
                className="w-full bg-paper/60 border border-ink/10 rounded-xl px-4 py-3 text-ink placeholder:text-ink/35 focus:outline-none focus:ring-2 focus:ring-primary/50 mb-4"
              />

              <label className="block font-display font-bold text-ink text-sm mb-2">Phone (optional)</label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="082 123 4567"
                className="w-full bg-paper/60 border border-ink/10 rounded-xl px-4 py-3 text-ink placeholder:text-ink/35 focus:outline-none focus:ring-2 focus:ring-primary/50 mb-6"
              />

              <label className="block font-display font-bold text-ink text-sm mb-2">How would you like it?</label>
              <OrderTypeToggle value={orderType} onChange={setOrderType} />

              {orderType === 'table' && (
                <div className="mt-4">
                  <label className="block font-display font-bold text-ink text-sm mb-2">Table number</label>
                  <input
                    type="text"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    placeholder="e.g. 7"
                    className="w-full bg-paper/60 border border-ink/10 rounded-xl px-4 py-3 text-ink placeholder:text-ink/35 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              )}
            </div>

            <div className="bg-surface rounded-2xl p-6 md:p-8 shadow-[0_8px_30px_-14px_rgb(var(--color-ink)/0.2)] ring-1 ring-ink/[0.04] mb-6">
              <h2 className="font-display text-lg font-extrabold text-primary mb-4">Your order</h2>
              <div className="space-y-3">
                {lines.map((line) => (
                  <div key={line.name} className="flex items-baseline gap-3">
                    <span className="font-display font-bold text-ink text-sm shrink-0">{line.qty}x</span>
                    <h3 className="font-display font-bold text-ink leading-snug">{line.name}</h3>
                    <div className="flex-1 border-b-2 border-dotted border-ink/20 min-w-[24px] translate-y-[-4px]" />
                    <span className="font-display font-bold text-ink whitespace-nowrap">{formatZar(line.qty * line.price)}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-baseline justify-between mt-6 pt-4 border-t border-ink/10">
                <span className="font-display font-bold text-ink text-lg">Total</span>
                <span className="font-display font-extrabold text-primary text-2xl">{formatZar(total)}</span>
              </div>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={!canPlaceOrder}
              className="w-full inline-flex items-center justify-center gap-2.5 bg-primary text-surface py-4 rounded-full font-display font-bold text-base transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none shadow-lg shadow-primary/20"
            >
              Place Order &amp; Send on WhatsApp
            </button>
            {!customerName.trim() && (
              <p className="text-center text-ink/45 text-sm mt-3">Add your name to place the order.</p>
            )}
          </motion.div>
        )}

        {step === 'confirmed' && placedOrder && (
          <motion.div
            key="confirmed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="max-w-xl mx-auto px-4 md:px-8 text-center"
          >
            <PartyPopper className="mx-auto text-primary mb-3" size={32} />
            <span className="font-script text-2xl text-primary">order placed</span>
            <h1 className="font-display text-3xl md:text-5xl font-extrabold text-ink mt-1 mb-2">
              #{placedOrder.orderNo}
            </h1>
            <p className="text-ink/60 text-lg mb-8">
              {orderType === 'table' ? ordering.tableNote : ordering.collectionNote} We sent the details to Jimmy's on WhatsApp.
            </p>

            <Starburst label="approx" value={`${config.ordering.avgWaitMins} min`} className="w-28 h-28 mx-auto mb-8" />

            <div className="bg-surface rounded-2xl p-6 md:p-8 shadow-[0_8px_30px_-14px_rgb(var(--color-ink)/0.2)] ring-1 ring-ink/[0.04]">
              <div className="flex items-center justify-between mb-6">
                {STAGES.map((stage, i) => (
                  <React.Fragment key={stage}>
                    <div className="flex flex-col items-center gap-2 flex-1">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-display font-bold text-sm transition-colors duration-500 ${
                          i <= tracking.stageIndex ? 'bg-primary text-surface' : 'bg-ink/10 text-ink/40'
                        }`}
                      >
                        {i < tracking.stageIndex ? <Check size={16} /> : i + 1}
                      </div>
                      <span className={`text-xs font-medium ${i <= tracking.stageIndex ? 'text-ink' : 'text-ink/40'}`}>
                        {stage}
                      </span>
                    </div>
                    {i < STAGES.length - 1 && (
                      <div className={`h-0.5 flex-1 -mt-6 transition-colors duration-500 ${i < tracking.stageIndex ? 'bg-primary' : 'bg-ink/10'}`} />
                    )}
                  </React.Fragment>
                ))}
              </div>

              <p className="font-display font-bold text-ink">
                {tracking.done ? "Ready, come grab it!" : `Ready in about ${tracking.countdown}`}
              </p>
              <p className="text-ink/45 text-xs mt-1">Live demo, kitchen isn't actually cooking this one.</p>
            </div>

            <button
              onClick={startNewOrder}
              className="mt-8 inline-flex items-center gap-2 text-primary font-display font-bold hover:underline"
            >
              Start a new order
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const OrderTypeToggle: React.FC<{ value: OrderType; onChange: (v: OrderType) => void }> = ({ value, onChange }) => (
  // z-0 (not just `relative`) matters here: it gives this wrapper its own
  // stacking context so the pill's -z-10 resolves against *this* box's
  // background rather than escaping to the page root and rendering behind
  // unrelated content further down the page.
  <div className="relative z-0 bg-paper/60 rounded-full p-1 flex">
    {(['collection', 'table'] as OrderType[]).map((type) => (
      <button
        key={type}
        onClick={() => onChange(type)}
        className={`relative flex-1 py-2.5 rounded-full font-display font-bold text-sm transition-colors ${
          value === type ? 'text-surface' : 'text-ink/55 hover:text-ink'
        }`}
      >
        {value === type && (
          <motion.span
            layoutId="order-type-pill"
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="absolute inset-0 bg-primary rounded-full -z-10"
          />
        )}
        {type === 'collection' ? 'Collection' : 'Table Order'}
      </button>
    ))}
  </div>
);

const CartPanel: React.FC<{
  lines: ReturnType<typeof selectCartLines>;
  total: number;
  orderType: OrderType;
  tableNumber: string;
  onOrderTypeChange: (v: OrderType) => void;
  onTableNumberChange: (v: string) => void;
  onCheckout: () => void;
}> = ({ lines, total, orderType, tableNumber, onOrderTypeChange, onTableNumberChange, onCheckout }) => (
  <div className="bg-surface rounded-2xl p-6 shadow-[0_8px_30px_-14px_rgb(var(--color-ink)/0.2)] ring-1 ring-ink/[0.04]">
    <h2 className="font-display text-xl font-extrabold text-primary mb-4 flex items-center gap-2">
      <ShoppingBag size={18} /> Your order
    </h2>

    {lines.length === 0 ? (
      <p className="text-ink/45 text-sm py-6 text-center">Add something from the menu to get started.</p>
    ) : (
      <>
        <div className="space-y-3 mb-5 max-h-[280px] overflow-y-auto pr-1">
          {lines.map((line) => (
            <div key={line.name} className="flex items-baseline gap-2 text-sm">
              <span className="font-display font-bold text-ink shrink-0">{line.qty}x</span>
              <span className="text-ink/80 truncate">{line.name}</span>
              <div className="flex-1 border-b border-dotted border-ink/15 min-w-[8px] translate-y-[-3px]" />
              <span className="font-display font-bold text-ink whitespace-nowrap">{formatZar(line.qty * line.price)}</span>
            </div>
          ))}
        </div>

        <div className="mb-5">
          <OrderTypeToggle value={orderType} onChange={onOrderTypeChange} />
          {orderType === 'table' && (
            <input
              type="text"
              value={tableNumber}
              onChange={(e) => onTableNumberChange(e.target.value)}
              placeholder="Table number"
              className="w-full mt-3 bg-paper/60 border border-ink/10 rounded-xl px-4 py-2.5 text-sm text-ink placeholder:text-ink/35 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          )}
        </div>

        <div className="flex items-baseline justify-between mb-5 pt-4 border-t border-ink/10">
          <span className="font-display font-bold text-ink">Total</span>
          <span className="font-display font-extrabold text-primary text-xl">{formatZar(total)}</span>
        </div>

        <button
          onClick={onCheckout}
          className="w-full bg-primary text-surface py-3.5 rounded-full font-display font-bold transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/20"
        >
          Checkout
        </button>
      </>
    )}
  </div>
);
