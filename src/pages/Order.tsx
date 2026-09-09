import { readSession, writeSession } from '../lib/sessionDraft';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useShallow } from 'zustand/react/shallow';
import { Link } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, ArrowLeft, PartyPopper, Download, MessageCircle } from 'lucide-react';
import { config } from '../config';
import { formatMoney, menuPrice, toStoredAmount } from '../core/tenant';
import { Starburst } from '../components/Starburst';
import { fadeInUp, staggerContainer, riseChild } from '../lib/motion';
import {
  useCartStore,
  formatCartMoney,
  selectCartLines,
  selectCartCount,
  selectCartTotal,
  type OrderType,
  type CartLine,
} from '../lib/cartStore';
import { buildOrderWhatsAppUrl, generateOrderNumber } from '../lib/orderMessage';
import { contactError, requestedTimeError, restaurantDate, restaurantInstant, tradingHours, latestTime } from '../lib/tradingHours';
import { data as db } from '../core/data';
import { useStickyHeaderOffset } from '../lib/useStickyHeaderOffset';

type Step = 'browse' | 'checkout' | 'confirmed';

const getDefaultRequestedTime = () => '';

export const Order: React.FC = () => {
  const { menu, ordering } = config;

  const [previousReference, setPreviousReference] = useState(() => readSession('jimmys-order-reference'));
  const [step, setStep] = useState<Step>('browse');
  const [activeCategory, setActiveCategory] = useState(menu.categories[0].name);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [requestedTime, setRequestedTime] = useState(getDefaultRequestedTime);
  const sending = useRef(false);
  const [uncertain, setUncertain] = useState(false);
  const today = restaurantDate();
  const hours = tradingHours(today);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  useEffect(() => { setSubmitError(null); }, [customerName, customerPhone, customerEmail, requestedTime, deliveryAddress]);
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (submitError) errorRef.current?.focus(); }, [submitError]);
  const categoryRailRef = useRef<HTMLDivElement>(null);
  const [placedOrder, setPlacedOrder] = useState<{
    orderNo: string; requestedTime: string;
    total: number; lines: CartLine[]; orderType: OrderType; tableNumber: string; address: string;
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

  const orderCategories = useMemo(
    () => [...menu.categories, { name: 'Non-alcoholic drinks', note: 'Cold, zero-proof and ready to add', items: ordering.nonAlcoholicDrinks }],
    [menu.categories, ordering.nonAlcoholicDrinks],
  );

  // Order.tsx runs its own browse -> checkout -> confirmed flow without a
  // route change, so App.tsx's route-level ScrollToTop never fires here.
  // Without this, moving to the next step while scrolled down leaves the
  // new (shorter) step's top content stranded above the viewport.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  useEffect(() => {
    if (step !== 'browse') return;

    const updateActiveCategory = () => {
      let current = orderCategories[0]?.name ?? '';
      orderCategories.forEach((category) => {
        const section = document.getElementById(`order-${category.name}`);
        if (section && section.getBoundingClientRect().top <= 190) {
          current = category.name;
        }
      });
      setActiveCategory(current);
    };

    updateActiveCategory();
    window.addEventListener('scroll', updateActiveCategory, { passive: true });
    return () => window.removeEventListener('scroll', updateActiveCategory);
  }, [orderCategories, step]);

  useEffect(() => {
    const activeButton = categoryRailRef.current?.querySelector<HTMLElement>(
      `[data-category="${CSS.escape(activeCategory)}"]`,
    );
    activeButton?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeCategory]);

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
    if (count === 0 || !customerName.trim() || !customerPhone.trim() || !customerEmail.trim() || !requestedTime) return false;
    if (orderType === 'table' && !tableNumber.trim()) return false;
    if (orderType === 'delivery' && !deliveryAddress.trim()) return false;
    return true;
  }, [count, customerName, customerEmail, customerPhone, deliveryAddress, orderType, requestedTime, tableNumber]);

  const handlePlaceOrder = async () => {
    if (sending.current || uncertain) return;
    const validation = contactError(customerName, customerPhone, customerEmail) || requestedTimeError(today, requestedTime);
    if (validation) { setSubmitError(validation); return; }
    if (!canPlaceOrder) { setSubmitError('Add an item and complete the details for your order type.'); return; }
    const breakfast = menu.categories.find((category) => category.name === 'Breakfast');
    if (requestedTime >= '12:00' && lines.some((line) => breakfast?.items.some((item) => item.name === line.name))) {
      setSubmitError('Breakfast is served until 12. Choose an earlier time or remove breakfast items.'); return;
    }
    sending.current = true;

    setIsSubmitting(true);
    setSubmitError(null);

    const orderNo = generateOrderNumber();
    writeSession('jimmys-order-reference', orderNo);
    const requestedDate = restaurantInstant(today, requestedTime);

    try {
      const created = await db.createOrder({
        orderNo,
        customerName: customerName.trim(),
        email: customerEmail.trim(),
        phone: customerPhone.trim(),
        orderType,
        tableNumber: orderType === 'table' ? tableNumber : null,
        deliveryAddress: orderType === 'delivery' ? deliveryAddress : null,
        deliveryNotes: orderType === 'delivery' ? (deliveryNotes || null) : null,
        requestedTime: requestedDate.toISOString(),
        // The cart holds minor units; the orders table stores a decimal amount.
        total: toStoredAmount(total),
        marketingConsent: false,
        items: lines.map((line) => ({
          name: line.name,
          qty: line.qty,
          unit_price: toStoredAmount(line.price),
        })),
      });

      setPlacedOrder({ orderNo: created.order_no, requestedTime, total, lines: [...lines], orderType, tableNumber, address: deliveryAddress });
      clear();
      setStep('confirmed');
    } catch {
      setUncertain(true);
        setSubmitError(`We could not verify receipt of ${orderNo}. Contact Jimmy's with this reference before ordering again.`);
    } finally {
      sending.current = false;
      setIsSubmitting(false);
    }
  };

  const startNewOrder = () => {
    writeSession('jimmys-order-reference', null);
    setPreviousReference(null);
    setPlacedOrder(null);
    setCustomerName('');
    setCustomerPhone(''); setCustomerEmail(''); setDeliveryAddress(''); setDeliveryNotes('');
    setRequestedTime(getDefaultRequestedTime());
    setSubmitError(null);
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

  if (previousReference) return <div className="pt-32 pb-24 px-5 max-w-xl mx-auto min-h-screen">
    <h1 className="font-display text-3xl font-bold">Check your last request</h1>
    <p className="mt-4 break-words">Reference: {previousReference}</p>
    <p className="mt-3">This tab previously sent an order request. Contact Jimmy's to check its status before placing another order.</p>
    <a className="inline-block my-5 underline" href={`https://wa.me/${config.venue.whatsapp}?text=${encodeURIComponent(`Please check existing order ${previousReference}. This is not a new order.`)}`}>Check with Jimmy's on WhatsApp</a>
    <button className="block min-h-11 border border-ink/25 rounded-xl px-4" onClick={() => { if (window.confirm('Have you checked the previous request with Jimmy’s? Starting again may create a second order.')) { writeSession('jimmys-order-reference', null); setPreviousReference(null); } }}>I have checked. Start another order</button>
  </div>;

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
                  Order directly from Jimmy's for collection. Choose a requested time and wait for the restaurant to confirm it.
                </p>
              </motion.div>
            </div>

            {/* Category tabs */}
            <div className={`sticky ${stickyBelowHeader ? 'top-[64px]' : 'top-0'} z-30 bg-surface/95 backdrop-blur-md border-y border-ink/10 py-3 transition-[top] duration-300`}>
              <div ref={categoryRailRef} className="max-w-7xl mx-auto px-4 md:px-8 flex flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide" aria-label="Order categories">
                {orderCategories.map((cat) => (
                  <button
                    key={cat.name}
                    data-category={cat.name}
                    onClick={() => scrollToCategory(cat.name)}
                    className={`relative shrink-0 px-4 py-2 rounded-full font-display font-bold text-sm transition-colors duration-200 active:scale-[0.96] ${
                      activeCategory === cat.name ? 'text-surface' : 'bg-paper text-ink/60 hover:text-ink'
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
                {orderCategories.map((category) => (
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
                        const price = menuPrice(item.price);
                        const qty = lines.find((l) => l.name === item.name)?.qty ?? 0;
                        return (
                          <div key={item.name} className="flex flex-wrap items-center gap-3">
                            <div className="flex-1 min-w-[150px]">
                              <div className="flex items-baseline gap-3">
                                <h3 className="font-display font-bold text-ink leading-snug">{item.name}</h3>
                                <span className="font-display font-bold text-ink whitespace-nowrap">{formatMoney(menuPrice(item.price))}</span>
                              </div>
                              <p className="text-sm text-ink/55 leading-relaxed pr-4">{item.description}</p>
                            </div>

                            <div className="shrink-0">
                              {qty === 0 ? (
                                <motion.button
                                  whileTap={{ scale: 0.9 }}
                                  aria-label={`Add ${item.name}`}
                                  disabled={price <= 0}
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
                                    className="w-11 h-11 flex items-center justify-center rounded-full bg-surface text-primary shadow-sm"
                                  >
                                    <Minus size={14} />
                                  </motion.button>
                                  <span className="font-display font-bold text-ink w-4 text-center text-sm">{qty}</span>
                                  <motion.button
                                    whileTap={{ scale: 0.85 }}
                                    onClick={() => add(item.name, price)}
                                    aria-label={`Add one more ${item.name}`}
                                    className="w-11 h-11 flex items-center justify-center rounded-full bg-primary text-surface shadow-sm"
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
                  className="lg:hidden fixed bottom-6 left-4 right-4 z-40 bg-ink text-paper rounded-full py-4 px-6 flex items-center justify-between font-display font-bold shadow-xl shadow-ink/25"
                >
                  <span className="flex items-center gap-2">
                    <ShoppingBag size={18} />
                    {count} item{count === 1 ? '' : 's'}
                  </span>
                  <span>{formatCartMoney(total)} · Checkout</span>
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {step === 'checkout' && (
          <motion.form
            key="checkout"
            noValidate
            onSubmit={(event) => { event.preventDefault(); void handlePlaceOrder(); }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="max-w-2xl mx-auto px-4 md:px-8"
          >
            <button type="button"
              disabled={isSubmitting || uncertain}
              onClick={() => setStep('browse')}
              className="inline-flex items-center gap-1.5 text-ink/55 hover:text-ink font-medium text-sm mb-6"
            >
              <ArrowLeft size={16} /> Back to menu
            </button>

            <span className="block font-script text-2xl text-primary">almost there</span>
            <h1 className="font-display text-3xl md:text-5xl font-extrabold text-ink mt-1 mb-8">Checkout</h1>

            <fieldset disabled={isSubmitting || uncertain} className="bg-surface rounded-2xl p-6 md:p-8 shadow-[0_8px_30px_-14px_rgb(var(--color-ink)/0.2)] ring-1 ring-ink/[0.04] mb-6">
              <label className="block font-display font-bold text-ink text-sm mb-2" htmlFor="order-name">Your name</label>
              <input
                type="text"
                id="order-name" autoComplete="name" maxLength={100}
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Riaan"
                required
                className="w-full bg-paper/60 border border-ink/10 rounded-xl px-4 py-3 text-ink placeholder:text-ink/35 focus:outline-none focus:ring-2 focus:ring-primary/50 mb-4"
              />

              <label className="block font-display font-bold text-ink text-sm mb-2" htmlFor="order-phone">Phone number</label>
              <input
                type="tel"
                id="order-phone" autoComplete="tel" maxLength={30}
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="082 123 4567"
                required
                className="w-full bg-paper/60 border border-ink/10 rounded-xl px-4 py-3 text-ink placeholder:text-ink/35 focus:outline-none focus:ring-2 focus:ring-primary/50 mb-6"
              />

              <label className="block font-display font-bold text-ink text-sm mb-2" htmlFor="order-email">Email address</label>
              <input
                type="email"
                id="order-email" autoComplete="email" maxLength={254}
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="you@email.com"
                required
                className="w-full bg-paper/60 border border-ink/10 rounded-xl px-4 py-3 text-ink placeholder:text-ink/35 focus:outline-none focus:ring-2 focus:ring-primary/50 mb-6"
              />

              <label className="block font-display font-bold text-ink text-sm mb-2">How would you like it?</label>
              <OrderTypeToggle value={orderType} onChange={setOrderType} />
              <p className="mt-3 text-sm text-ink/75">{orderType === 'collection' ? ordering.collectionNote : orderType === 'delivery' ? ordering.deliveryNote : ordering.tableNote}</p>
              <p className="mt-3 text-sm text-ink/75">Requested for today, {today}, in South African time. {hours ? `Open ${hours.open} to ${hours.close === '24:00' ? 'midnight' : hours.close}.` : "Closed today. Contact Jimmy's for Coffee & Cars dates."}</p>

              <div className="mt-4">
                <label className="block font-display font-bold text-ink text-sm mb-2" htmlFor="order-time">What time would you like it ready?</label>
                <input
                  type="time"
                  min={hours?.open}
                  max={latestTime(hours?.close)}
                  required
                  id="order-time"
                value={requestedTime}
                  onChange={(e) => setRequestedTime(e.target.value)}
                  className="w-full bg-paper/60 border border-ink/10 rounded-xl px-4 py-3 text-ink placeholder:text-ink/35 focus:outline-none focus:ring-2 focus:ring-primary/50 mb-6"
                />
              </div>

              {orderType === 'table' && (
                <div className="mt-4">
                  <label className="block font-display font-bold text-ink text-sm mb-2" htmlFor="order-table">Table number</label>
                  <input
                    type="text"
                    id="order-table"
                value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    placeholder="e.g. 7"
                    className="w-full bg-paper/60 border border-ink/10 rounded-xl px-4 py-3 text-ink placeholder:text-ink/35 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              )}
              {orderType === 'delivery' && (
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block font-display font-bold text-ink text-sm mb-2" htmlFor="order-address">Delivery address</label>
                    <input id="order-address" type="text" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} required autoComplete="street-address" maxLength={250} placeholder="Street number and suburb" className="booking-input" />
                  </div>
                  <div>
                    <label className="block font-display font-bold text-ink text-sm mb-2">Delivery notes <span className="font-body font-normal text-ink/45">(optional)</span></label>
                    <input value={deliveryNotes} onChange={(e) => setDeliveryNotes(e.target.value)} placeholder="e.g. call at the gate" className="w-full bg-paper/60 border border-ink/10 rounded-xl px-4 py-3 text-ink placeholder:text-ink/35 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                </div>
              )}
            </fieldset>
            <div className="bg-surface rounded-2xl p-6 md:p-8 shadow-[0_8px_30px_-14px_rgb(var(--color-ink)/0.2)] ring-1 ring-ink/[0.04] mb-6">
              <h2 className="font-display text-lg font-extrabold text-primary mb-4">Your order</h2>
              {count === 0 && <p>Your cart is empty. Go back to the menu to add an item.</p>}
              <div className="space-y-3">
                {lines.map((line) => (
                  <div key={line.name} className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center shrink-0"><button type="button" disabled={isSubmitting || uncertain} aria-label={`Remove one ${line.name}`} onClick={() => remove(line.name)} className="min-w-11 min-h-11">−</button>{line.qty}<button type="button" disabled={isSubmitting || uncertain || line.qty >= 99} aria-label={`Add one more ${line.name}`} onClick={() => add(line.name, line.price)} className="min-w-11 min-h-11">+</button></span>
                    <h3 className="font-display font-bold text-ink leading-snug">{line.name}</h3>
                    <div className="flex-1 border-b-2 border-dotted border-ink/20 min-w-[24px] translate-y-[-4px]" />
                    <span className="font-display font-bold text-ink whitespace-nowrap">{formatCartMoney(line.qty * line.price)}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-baseline justify-between mt-6 pt-4 border-t border-ink/10">
                <span className="font-display font-bold text-ink text-lg">Total</span>
                <span className="font-display font-extrabold text-primary text-2xl">{formatCartMoney(total)}</span>
              </div>
            </div>

            <p className="mb-4 text-sm text-ink/75">We use your contact details to manage this order. Marketing is not opted in. Your requested time is subject to confirmation.</p>
            <button
              type="submit"
              disabled={isSubmitting || uncertain || count === 0}
              className="w-full inline-flex items-center justify-center gap-2.5 bg-primary text-surface py-4 rounded-full font-display font-bold text-base transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none shadow-lg shadow-primary/20"
            >
              {isSubmitting ? 'Placing order…' : 'Place order'}
            </button>
            {submitError && <a className="block mt-3 text-center underline" href={`https://wa.me/${config.venue.whatsapp}`}>Contact Jimmy's on WhatsApp</a>}
            {submitError && (
              <p ref={errorRef} tabIndex={-1} role="alert" className="text-center text-primary text-sm mt-3">{submitError}</p>
            )}
            {(!customerName.trim() || !customerPhone.trim() || !customerEmail.trim()) && (
              <p className="text-center text-ink/45 text-sm mt-3">Name, phone and email are required to place the order.</p>
            )}
          </motion.form>
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
              {placedOrder.orderType === 'table' ? ordering.tableNote : placedOrder.orderType === 'delivery' ? ordering.deliveryNote : ordering.collectionNote}
            </p>

            <Starburst label="requested" value={placedOrder.requestedTime} className="w-28 h-28 mx-auto mb-8" />

            <div className="bg-surface rounded-2xl p-6 md:p-8 shadow-[0_8px_30px_-14px_rgb(var(--color-ink)/0.2)] ring-1 ring-ink/[0.04]">
              <p className="font-display font-bold text-ink">Jimmy's has received your order.</p>
              <p className="text-ink/60 text-sm mt-2">Requested for {placedOrder.requestedTime}</p>
              <p className="text-ink/45 text-xs mt-1">Your request is saved. Please wait for Jimmy's to confirm acceptance and timing. This is not a payment receipt.</p>
            </div>

            <button
              onClick={async () => {
                setReceiptError(null);
                try {
                  const { generateOrderReceipt } = await import('../lib/generateOrderReceipt');
                  await generateOrderReceipt({ orderNo: placedOrder.orderNo, requestedTime: placedOrder.requestedTime, name: customerName, email: customerEmail, phone: customerPhone, orderType: placedOrder.orderType, tableNumber: placedOrder.tableNumber, deliveryAddress: placedOrder.address, lines: placedOrder.lines, total: placedOrder.total });
                } catch {
                  setReceiptError('Could not generate the receipt. Please try again.');
                }
              }}
              className="mt-5 inline-flex items-center gap-2 bg-surface border border-ink/10 px-5 py-3 rounded-full font-display font-bold text-ink hover:bg-paper"
            ><Download size={16} /> Download receipt</button>
            {receiptError && <p role="alert" className="text-primary/80 text-sm mt-3">{receiptError}</p>}

            <a
              href={buildOrderWhatsAppUrl({ orderNo: placedOrder.orderNo, requestedTime: placedOrder.requestedTime, deliveryAddress: placedOrder.address, lines: placedOrder.lines, orderType: placedOrder.orderType, tableNumber: placedOrder.tableNumber, total: placedOrder.total, name: customerName })}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 bg-surface border border-ink/10 px-5 py-3 rounded-full font-display font-bold text-ink hover:bg-paper"
            ><MessageCircle size={16} /> Ask about this order</a>

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
    {(['collection', 'delivery', 'table'] as OrderType[]).map((type) => (
      <button
        key={type}
        type="button"
        aria-pressed={value === type}
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
        {type === 'collection' ? 'Collection' : type === 'delivery' ? 'Delivery' : 'Table order'}
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
              <span className="font-display font-bold text-ink whitespace-nowrap">{formatCartMoney(line.qty * line.price)}</span>
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
          <span className="font-display font-extrabold text-primary text-xl">{formatCartMoney(total)}</span>
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
