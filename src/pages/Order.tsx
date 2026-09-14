import { readSession, writeSession } from '../lib/sessionDraft';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useShallow } from 'zustand/react/shallow';
import { Link } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, ArrowLeft, PartyPopper, Download, MessageCircle, Search, WifiOff } from 'lucide-react';
import { config } from '../config';
import { formatMoney, menuPrice, toStoredAmount, storageKey, copy } from '../core/tenant';
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
import { contactFieldErrors, latestTime, openDates, restaurantDate, restaurantInstant, slotFieldErrors, tradingHours } from '../lib/tradingHours';
import { data as db, SubmissionError, type NewOrder, type SubmissionFailure } from '../core/data';
import { useStickyHeaderOffset } from '../lib/useStickyHeaderOffset';
import { FormField } from '../components/forms/FormField';
import { ErrorSummary } from '../components/forms/ErrorSummary';
import { SubmissionNotice, UnconfirmedRequest } from '../components/forms/SubmissionNotice';
import { useFormErrors } from '../lib/useFormErrors';
import { useOnlineStatus } from '../lib/useOnlineStatus';

type Step = 'browse' | 'checkout' | 'confirmed';
type CheckoutField = 'cart' | 'name' | 'phone' | 'email' | 'date' | 'time' | 'table' | 'address';

const FIELD_IDS: Record<CheckoutField, string> = {
  cart: 'order-cart',
  name: 'order-name',
  phone: 'order-phone',
  email: 'order-email',
  date: 'order-date',
  time: 'order-time',
  table: 'order-table',
  address: 'order-address',
};
const FIELD_ORDER: CheckoutField[] = ['cart', 'name', 'phone', 'email', 'date', 'time', 'table', 'address'];

const PENDING_KEY = storageKey('order-reference');

const fulfilmentModes = config.ordering.fulfilment as readonly OrderType[];
const fulfilmentLabel: Record<OrderType, string> = { collection: 'Collection', delivery: 'Delivery', table: 'Table order' };

const dayLabelFormatter = new Intl.DateTimeFormat(config.locale, {
  timeZone: config.timezone, weekday: 'short', day: 'numeric', month: 'short',
});

/** "Today", "Tomorrow" or "Fri 18 Sep", on the restaurant's calendar. */
const dayLabel = (date: string): string => {
  const today = restaurantDate();
  if (date === today) return 'Today';
  if (date === restaurantDate(new Date(restaurantInstant(today, '12:00').getTime() + 86400000))) return 'Tomorrow';
  return dayLabelFormatter.format(restaurantInstant(date, '12:00'));
};

/** Categories with an end time, e.g. breakfast until 12, keyed by item name. */
const itemCutoffs = new Map(
  config.menu.categories.flatMap((category) =>
    category.availableUntil ? category.items.map((item) => [item.name, { until: category.availableUntil!, category: category.name }] as const) : [],
  ),
);

export const Order: React.FC = () => {
  const { menu, ordering } = config;
  const online = useOnlineStatus();

  const [previousReference, setPreviousReference] = useState(() => readSession(PENDING_KEY));
  const [step, setStep] = useState<Step>('browse');
  const [activeCategory, setActiveCategory] = useState(menu.categories[0].name);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  // Recomputed every render: at most a week or two of days, and it must notice
  // when today's last slot passes while the page sits open.
  const availableDates = openDates(ordering.maxDaysAhead);
  const datesKey = availableDates.join(',');
  const [requestedDate, setRequestedDate] = useState(() => availableDates[0] ?? '');
  const [requestedTime, setRequestedTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [failure, setFailure] = useState<{ kind: SubmissionFailure; offline: boolean; message: string } | null>(null);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const categoryRailRef = useRef<HTMLDivElement>(null);
  const noticeRef = useRef<HTMLDivElement>(null);
  const confirmedHeadingRef = useRef<HTMLHeadingElement>(null);
  const [placedOrder, setPlacedOrder] = useState<{
    orderNo: string; requestedDate: string; requestedTime: string;
    total: number; lines: CartLine[]; orderType: OrderType; tableNumber: string; address: string;
    name: string; email: string; phone: string;
  } | null>(null);
  const stickyBelowHeader = useStickyHeaderOffset();

  // One reference per attempt. It survives a failed send, so a retry after a
  // timeout re-sends the same order and the server returns the one it already
  // has rather than creating a second.
  const attemptRef = useRef<string>(generateOrderNumber());
  const sentPayload = useRef<NewOrder | null>(null);
  // What the customer saw when that payload first went out. The confirmation,
  // receipt and WhatsApp message are built from this, never from live state,
  // which can move on (the day selection advances at closing time) during a retry.
  type SentDetails = Omit<NonNullable<typeof placedOrder>, 'orderNo'>;
  const sentDetails = useRef<SentDetails | null>(null);
  // Once an attempt has been uncertain it stays uncertain until it succeeds:
  // a later refusal only proves the RETRY saved nothing, not the first send.
  const attemptWasUncertain = useRef(false);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);
  const sending = useRef(false);

  const lines = useCartStore(useShallow(selectCartLines));
  const count = useCartStore(selectCartCount);
  const total = useCartStore(selectCartTotal);
  const storedOrderType = useCartStore((s) => s.orderType);
  const tableNumber = useCartStore((s) => s.tableNumber);
  const add = useCartStore((s) => s.add);
  const remove = useCartStore((s) => s.remove);
  const setOrderType = useCartStore((s) => s.setOrderType);
  const setTableNumber = useCartStore((s) => s.setTableNumber);
  const clear = useCartStore((s) => s.clear);

  // A cart restored from an earlier session may hold a mode this venue has since switched off.
  const orderType: OrderType = fulfilmentModes.includes(storedOrderType) ? storedOrderType : fulfilmentModes[0];

  // If today closes while the page is open, move the selection to the next open day.
  useEffect(() => {
    const dates = datesKey ? datesKey.split(',') : [];
    if (!dates.includes(requestedDate)) setRequestedDate(dates[0] ?? '');
  }, [datesKey, requestedDate]);

  const selectedHours = tradingHours(requestedDate);

  // Validation reads the clock, so it is re-run at submit with a fresh time.
  const validate = (at: Date): Partial<Record<CheckoutField, string>> => {
    const found: Partial<Record<CheckoutField, string>> = {
      ...contactFieldErrors(customerName, customerPhone, customerEmail),
      ...(availableDates.length === 0
        ? { date: `There are no open days to order for in the next ${ordering.maxDaysAhead + 1} days. Please contact ${config.venue.name}.` }
        : slotFieldErrors(requestedDate, requestedTime, at)),
    };
    if (count === 0) found.cart = 'Add at least one item to your order.';
    if (orderType === 'table' && !tableNumber.trim()) found.table = 'Enter your table number.';
    if (orderType === 'delivery' && !deliveryAddress.trim()) found.address = 'Enter the delivery address.';
    if (!found.time && requestedTime) {
      const late = lines.find((line) => {
        const cutoff = itemCutoffs.get(line.name);
        return cutoff && requestedTime >= cutoff.until;
      });
      if (late) {
        const cutoff = itemCutoffs.get(late.name)!;
        found.time = `${cutoff.category} is served until ${cutoff.until}. Choose an earlier time or remove ${cutoff.category.toLowerCase()} items.`;
      }
    }
    return found;
  };
  const [clock, setClock] = useState(() => Date.now());
  const errors = validate(new Date(clock));
  const form = useFormErrors<CheckoutField>(errors);
  const summaryItems = FIELD_ORDER
    .filter((field) => form.visible[field])
    .map((field) => ({ fieldId: FIELD_IDS[field], message: form.visible[field]! }));

  const locked = isSubmitting || failure?.kind === 'uncertain';

  // A definite refusal is cleared as soon as the customer changes something;
  // an uncertain send is not, because it may still exist on the server.
  useEffect(() => {
    setFailure((current) => (current && current.kind !== 'uncertain' ? null : current));
  }, [customerName, customerPhone, customerEmail, requestedDate, requestedTime, deliveryAddress, tableNumber, count]);

  const orderCategories = useMemo(
    () => [...menu.categories, { name: copy.order.softDrinksLabel, note: copy.order.softDrinksNote, items: ordering.nonAlcoholicDrinks }],
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

  const focusNotice = () => requestAnimationFrame(() => {
    noticeRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    noticeRef.current?.focus({ preventScroll: true });
  });

  const send = async (payload: NewOrder) => {
    if (sending.current) return;
    if (!navigator.onLine) {
      setFailure({
        kind: failure?.kind === 'uncertain' ? 'uncertain' : 'rejected',
        offline: true,
        message: 'Nothing was sent because this device has no connection. Reconnect, then try again.',
      });
      focusNotice();
      return;
    }

    sending.current = true;
    setIsSubmitting(true);
    if (sentPayload.current?.orderNo !== payload.orderNo) {
      sentDetails.current = {
        requestedDate, requestedTime, total, lines: [...lines], orderType, tableNumber,
        address: deliveryAddress, name: payload.customerName, email: payload.email, phone: payload.phone,
      };
    }
    sentPayload.current = payload;
    writeSession(PENDING_KEY, payload.orderNo);
    // Only clear the checkpoint if it is still ours. A send that finishes after
    // the customer left and started another must not erase the newer one.
    const clearCheckpoint = () => { if (readSession(PENDING_KEY) === payload.orderNo) writeSession(PENDING_KEY, null); };

    try {
      const created = await db.createOrder(payload);
      clearCheckpoint();
      attemptWasUncertain.current = false;
      // Left the page mid-send: the order is saved, but the cart on screen may
      // already be a new one, so it is not cleared from here.
      if (!mounted.current || !sentDetails.current) return;
      setFailure(null);
      setPlacedOrder({ orderNo: created.order_no, ...sentDetails.current });
      clear();
      setStep('confirmed');
    } catch (error) {
      const failed = error instanceof SubmissionError ? error : new SubmissionError('uncertain');
      const stillUncertain = failed.kind === 'uncertain' || attemptWasUncertain.current;
      if (stillUncertain) {
        attemptWasUncertain.current = true;
      } else {
        // A first attempt refused outright saved nothing, so the next gets a fresh reference.
        clearCheckpoint();
        attemptRef.current = generateOrderNumber();
        sentPayload.current = null;
        sentDetails.current = null;
      }
      if (!mounted.current) return;
      setFailure({
        kind: stillUncertain ? 'uncertain' : failed.kind,
        offline: failed.offline,
        message: failed.kind !== 'uncertain' && stillUncertain
          ? `Trying again did not go through either. Your first attempt may still have reached ${config.venue.name}, so check its status before ordering again.`
          : failed.kind === 'throttled' ? copy.order.throttled
          : failed.kind === 'rejected' ? copy.order.rejected
          : failed.offline ? 'The connection dropped while sending, so we could not confirm your order arrived.'
          : 'The connection timed out before we heard back, so we cannot tell whether your order arrived.',
      });
      focusNotice();
    } finally {
      sending.current = false;
      if (mounted.current) setIsSubmitting(false);
    }
  };

  const handlePlaceOrder = () => {
    if (locked) return;
    const now = Date.now();
    setClock(now);
    if (!form.attempt(validate(new Date(now)))) return;
    void send({
      orderNo: attemptRef.current,
      customerName: customerName.trim(),
      email: customerEmail.trim(),
      phone: customerPhone.trim(),
      orderType,
      tableNumber: orderType === 'table' ? tableNumber.trim() : null,
      deliveryAddress: orderType === 'delivery' ? deliveryAddress.trim() : null,
      deliveryNotes: orderType === 'delivery' ? (deliveryNotes.trim() || null) : null,
      requestedTime: restaurantInstant(requestedDate, requestedTime).toISOString(),
      // The cart holds minor units; the orders table stores a decimal amount.
      total: toStoredAmount(total),
      marketingConsent: false,
      items: lines.map((line) => ({
        name: line.name,
        qty: line.qty,
        unit_price: toStoredAmount(line.price),
      })),
    });
  };

  const retry = () => { if (sentPayload.current) void send(sentPayload.current); };

  const discardAttempt = () => {
    writeSession(PENDING_KEY, null);
    attemptRef.current = generateOrderNumber();
    sentPayload.current = null;
    sentDetails.current = null;
    attemptWasUncertain.current = false;
    setFailure(null);
  };

  const startNewOrder = () => {
    discardAttempt();
    setPreviousReference(null);
    setPlacedOrder(null);
    setCustomerName('');
    setCustomerPhone(''); setCustomerEmail(''); setDeliveryAddress(''); setDeliveryNotes('');
    setRequestedTime('');
    form.reset();
    setStep('browse');
  };

  if (!config.features.ordering) {
    return (
      <div className="pt-28 pb-24 min-h-[70dvh] flex flex-col items-center justify-center text-center px-4">
        <span className="font-script text-2xl text-primary">coming soon</span>
        <h1 className="font-display text-4xl md:text-6xl font-extrabold text-ink mt-1 mb-4">Online ordering</h1>
        <p className="text-ink/60 text-lg max-w-md mb-8">
          {copy.order.disabled}
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

  if (previousReference) {
    return <UnconfirmedRequest noun="order" reference={previousReference} onStartAgain={startNewOrder} className="min-h-screen pb-24 pt-32" />;
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
                  {copy.order.intro} Choose a requested time and wait for the restaurant to confirm it.
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
            aria-busy={isSubmitting}
            onSubmit={(event) => { event.preventDefault(); handlePlaceOrder(); }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="max-w-2xl mx-auto px-4 md:px-8"
          >
            <button type="button"
              disabled={locked}
              onClick={() => setStep('browse')}
              className="inline-flex min-h-11 items-center gap-1.5 text-ink/65 hover:text-ink font-medium text-sm mb-4 disabled:opacity-50"
            >
              <ArrowLeft size={16} aria-hidden="true" /> Back to menu
            </button>

            <span className="block font-script text-2xl text-primary">almost there</span>
            <h1 className="font-display text-3xl md:text-5xl font-extrabold text-ink mt-1 mb-8">{copy.order.checkoutHeading}</h1>

            <ErrorSummary ref={form.summaryRef} items={form.submitted ? summaryItems : []} />

            <fieldset disabled={locked} className="bg-surface rounded-2xl p-6 md:p-8 shadow-[0_8px_30px_-14px_rgb(var(--color-ink)/0.2)] ring-1 ring-ink/[0.04] my-6 space-y-5">
              <legend className="sr-only">Your details</legend>
              <FormField id={FIELD_IDS.name} label="Your name" required error={form.visible.name}>
                {(control) => <input {...control} type="text" autoComplete="name" maxLength={100} value={customerName} onChange={(e) => setCustomerName(e.target.value)} onBlur={() => form.blur('name')} className="form-input" />}
              </FormField>
              <FormField id={FIELD_IDS.phone} label="Phone number" required error={form.visible.phone} hint="In case the kitchen needs to reach you about this order.">
                {(control) => <input {...control} type="tel" inputMode="tel" autoComplete="tel" maxLength={30} value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} onBlur={() => form.blur('phone')} placeholder="082 123 4567" className="form-input" />}
              </FormField>
              <FormField id={FIELD_IDS.email} label="Email address" required error={form.visible.email} hint="Your order confirmation is sent here.">
                {(control) => <input {...control} type="email" inputMode="email" autoComplete="email" maxLength={254} value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} onBlur={() => form.blur('email')} placeholder="you@email.com" className="form-input" />}
              </FormField>

              {fulfilmentModes.length > 1 && (
                <div>
                  <p id="order-type-label" className="block font-display font-bold text-ink text-sm mb-2">How would you like it?</p>
                  <OrderTypeToggle value={orderType} onChange={setOrderType} labelledBy="order-type-label" />
                </div>
              )}
              <p className="text-sm text-ink/75">{orderType === 'collection' ? ordering.collectionNote : orderType === 'delivery' ? ordering.deliveryNote : ordering.tableNote}</p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField id={FIELD_IDS.date} label="Day" required error={form.visible.date}>
                  {(control) => (
                    <select {...control} value={requestedDate} onChange={(e) => { setRequestedDate(e.target.value); setRequestedTime(''); }} onBlur={() => form.blur('date')} className="form-input">
                      {availableDates.length === 0 && <option value="">No open days</option>}
                      {availableDates.map((date) => <option key={date} value={date}>{dayLabel(date)}</option>)}
                    </select>
                  )}
                </FormField>
                <FormField
                  id={FIELD_IDS.time}
                  label="Ready by"
                  required
                  error={form.visible.time}
                  hint={selectedHours ? `Open ${selectedHours.open} to ${selectedHours.close === '24:00' ? 'midnight' : selectedHours.close}, ${config.venue.timeLabel}` : undefined}
                >
                  {(control) => <input {...control} type="time" disabled={!selectedHours} min={selectedHours?.open} max={latestTime(selectedHours?.close)} value={requestedTime} onChange={(e) => setRequestedTime(e.target.value)} onBlur={() => form.blur('time')} className="form-input" />}
                </FormField>
              </div>

              {orderType === 'table' && (
                <FormField id={FIELD_IDS.table} label="Table number" required error={form.visible.table}>
                  {(control) => <input {...control} type="text" inputMode="numeric" maxLength={10} value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} onBlur={() => form.blur('table')} placeholder="e.g. 7" className="form-input" />}
                </FormField>
              )}
              {orderType === 'delivery' && (
                <>
                  <FormField id={FIELD_IDS.address} label="Delivery address" required error={form.visible.address}>
                    {(control) => <input {...control} type="text" autoComplete="street-address" maxLength={250} value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} onBlur={() => form.blur('address')} placeholder="Street number and suburb" className="form-input" />}
                  </FormField>
                  <FormField label="Delivery notes" required={false}>
                    {(control) => <input {...control} type="text" maxLength={250} value={deliveryNotes} onChange={(e) => setDeliveryNotes(e.target.value)} placeholder="e.g. call at the gate" className="form-input" />}
                  </FormField>
                </>
              )}
            </fieldset>

            <section aria-labelledby="order-summary-heading" className="bg-surface rounded-2xl p-6 md:p-8 shadow-[0_8px_30px_-14px_rgb(var(--color-ink)/0.2)] ring-1 ring-ink/[0.04] mb-6">
              <h2 id="order-summary-heading" className="font-display text-lg font-extrabold text-primary mb-4">Your order</h2>
              {count === 0 && (
                <div id={FIELD_IDS.cart} tabIndex={-1} className="rounded-xl bg-paper/70 px-4 py-5 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
                  <p className="font-semibold text-ink">Your cart is empty.</p>
                  <button type="button" onClick={() => setStep('browse')} className="mt-2 min-h-11 font-display font-bold text-primary underline underline-offset-2">Choose something from the menu</button>
                </div>
              )}
              <ul className="space-y-2">
                {lines.map((line) => (
                  <li key={line.name} className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center shrink-0 rounded-full bg-paper/80">
                      <button type="button" disabled={locked} aria-label={`Remove one ${line.name}`} onClick={() => remove(line.name)} className="min-w-11 min-h-11 font-bold disabled:opacity-40">−</button>
                      <span className="w-5 text-center font-display font-bold" aria-label={`${line.qty} of ${line.name}`}>{line.qty}</span>
                      <button type="button" disabled={locked || line.qty >= 99} aria-label={`Add one more ${line.name}`} onClick={() => add(line.name, line.price)} className="min-w-11 min-h-11 font-bold disabled:opacity-40">+</button>
                    </span>
                    <h3 className="font-display font-bold text-ink leading-snug">{line.name}</h3>
                    <div className="flex-1 border-b-2 border-dotted border-ink/20 min-w-[24px] translate-y-[-4px]" aria-hidden="true" />
                    <span className="font-display font-bold text-ink whitespace-nowrap">{formatCartMoney(line.qty * line.price)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex items-baseline justify-between mt-6 pt-4 border-t border-ink/10">
                <span className="font-display font-bold text-ink text-lg">Total</span>
                <span className="font-display font-extrabold text-primary text-2xl">{formatCartMoney(total)}</span>
              </div>
            </section>

            <p className="mb-4 text-sm text-ink/75">We use your contact details to manage this order. Marketing is not opted in. Your requested time is subject to confirmation, and you pay when you collect.</p>

            {!online && !failure && (
              <p role="status" className="mb-4 flex items-center gap-2 rounded-xl bg-accent/15 px-4 py-3 text-sm font-semibold text-ink ring-1 ring-accent/50">
                <WifiOff size={16} aria-hidden="true" /> You are offline. Reconnect before placing your order.
              </p>
            )}

            {failure && (
              <div className="mb-4">
                <SubmissionNotice
                  ref={noticeRef}
                  kind={failure.kind}
                  offline={failure.offline}
                  message={failure.message}
                  reference={sentPayload.current?.orderNo ?? attemptRef.current}
                  noun="order"
                  retrying={isSubmitting}
                  onRetry={retry}
                  onDiscard={discardAttempt}
                />
              </div>
            )}

            {failure?.kind !== 'uncertain' && (
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-14 inline-flex items-center justify-center gap-2.5 bg-primary text-surface rounded-full font-display font-bold text-base transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-primary/20"
              >
                {isSubmitting ? 'Placing order…' : `Place order · ${formatCartMoney(total)}`}
              </button>
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
            onAnimationComplete={() => confirmedHeadingRef.current?.focus({ preventScroll: true })}
            className="max-w-xl mx-auto px-4 md:px-8 text-center"
          >
            <PartyPopper className="mx-auto text-primary mb-3" size={32} aria-hidden="true" />
            <span className="font-script text-2xl text-primary">order placed</span>
            <h1 ref={confirmedHeadingRef} tabIndex={-1} className="font-display text-3xl md:text-5xl font-extrabold text-ink mt-1 mb-2 break-all focus:outline-none">
              #{placedOrder.orderNo}
            </h1>
            <p className="text-ink/60 text-lg mb-8">
              {placedOrder.orderType === 'table' ? ordering.tableNote : placedOrder.orderType === 'delivery' ? ordering.deliveryNote : ordering.collectionNote}
            </p>

            <Starburst label={dayLabel(placedOrder.requestedDate).toLowerCase()} value={placedOrder.requestedTime} className="w-28 h-28 mx-auto mb-8" />

            <div className="bg-surface rounded-2xl p-6 md:p-8 shadow-[0_8px_30px_-14px_rgb(var(--color-ink)/0.2)] ring-1 ring-ink/[0.04]">
              <p className="font-display font-bold text-ink">{copy.order.confirmedHeading}</p>
              <p className="text-ink/60 text-sm mt-2">Requested for {dayLabel(placedOrder.requestedDate)}, {placedOrder.requestedTime}</p>
              <p className="text-ink/60 text-xs mt-1">Your request is saved. Please wait for {config.venue.name} to confirm acceptance and timing. This is not a payment receipt.</p>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                to={`/track?ref=${encodeURIComponent(placedOrder.orderNo)}`}
                className="inline-flex min-h-12 items-center gap-2 bg-primary text-surface px-5 rounded-full font-display font-bold"
              ><Search size={16} aria-hidden="true" /> Track this order</Link>
              <button
                onClick={async () => {
                  setReceiptError(null);
                  try {
                    const { generateOrderReceipt } = await import('../lib/generateOrderReceipt');
                    await generateOrderReceipt({ orderNo: placedOrder.orderNo, requestedTime: `${dayLabel(placedOrder.requestedDate)} ${placedOrder.requestedTime}`, name: placedOrder.name, email: placedOrder.email, phone: placedOrder.phone, orderType: placedOrder.orderType, tableNumber: placedOrder.tableNumber, deliveryAddress: placedOrder.address, lines: placedOrder.lines, total: placedOrder.total });
                  } catch {
                    setReceiptError('Could not generate the receipt. Please try again.');
                  }
                }}
                className="inline-flex min-h-12 items-center gap-2 bg-surface border border-ink/10 px-5 rounded-full font-display font-bold text-ink hover:bg-paper"
              ><Download size={16} aria-hidden="true" /> Download receipt</button>
              <a
                href={buildOrderWhatsAppUrl({ orderNo: placedOrder.orderNo, requestedTime: `${dayLabel(placedOrder.requestedDate)} ${placedOrder.requestedTime}`, deliveryAddress: placedOrder.address, lines: placedOrder.lines, orderType: placedOrder.orderType, tableNumber: placedOrder.tableNumber, total: placedOrder.total, name: placedOrder.name })}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center gap-2 bg-surface border border-ink/10 px-5 rounded-full font-display font-bold text-ink hover:bg-paper"
              ><MessageCircle size={16} aria-hidden="true" /> Ask about this order</a>
            </div>
            {receiptError && <p role="alert" className="text-ink text-sm mt-3">{receiptError}</p>}

            <button
              onClick={startNewOrder}
              className="mt-8 inline-flex min-h-11 items-center gap-2 text-primary font-display font-bold hover:underline"
            >
              Start a new order
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const OrderTypeToggle: React.FC<{ value: OrderType; onChange: (v: OrderType) => void; labelledBy?: string }> = ({ value, onChange, labelledBy }) => (
  // z-0 (not just `relative`) matters here: it gives this wrapper its own
  // stacking context so the pill's -z-10 resolves against *this* box's
  // background rather than escaping to the page root and rendering behind
  // unrelated content further down the page.
  <div role="group" aria-labelledby={labelledBy} aria-label={labelledBy ? undefined : 'Order type'} className="relative z-0 bg-paper/60 rounded-full p-1 flex">
    {fulfilmentModes.map((type) => (
      <button
        key={type}
        type="button"
        aria-pressed={value === type}
        onClick={() => onChange(type)}
        className={`relative flex-1 min-h-11 rounded-full font-display font-bold text-sm transition-colors ${
          value === type ? 'text-surface' : 'text-ink/65 hover:text-ink'
        }`}
      >
        {value === type && (
          <motion.span
            layoutId="order-type-pill"
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="absolute inset-0 bg-primary rounded-full -z-10"
          />
        )}
        {fulfilmentLabel[type]}
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
          {fulfilmentModes.length > 1 && <OrderTypeToggle value={orderType} onChange={onOrderTypeChange} />}
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
