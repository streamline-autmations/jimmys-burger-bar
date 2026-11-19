import { readSession, writeSession } from '../lib/sessionDraft';
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useShallow } from 'zustand/react/shallow';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, ArrowLeft, PartyPopper, Download, MessageCircle, Search, WifiOff, Clock3 } from 'lucide-react';
import { config } from '../config';
import { formatMoney, menuPrice, toStoredAmount, storageKey, copy, payFirst, orderCategories, orderCtaLabel } from '../core/tenant';
import { Starburst } from '../components/Starburst';
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
import { collectionSlots, contactFieldErrors, latestTime, openDates, restaurantDate, restaurantInstant, slotFieldErrors, tradingHours } from '../lib/tradingHours';
import { data as db, SubmissionError, type NewOrder, type OrderingState, type RefusalReason, type SubmissionFailure } from '../core/data';
import { useStickyHeaderOffset } from '../lib/useStickyHeaderOffset';
import { FormField } from '../components/forms/FormField';
import { AddressSearch } from '../components/forms/AddressSearch';
import { matchSuburb } from '../lib/addressSearch';
import { ErrorSummary } from '../components/forms/ErrorSummary';
import { SubmissionNotice, UnconfirmedRequest } from '../components/forms/SubmissionNotice';
import { useFormErrors } from '../lib/useFormErrors';
import { useOnlineStatus } from '../lib/useOnlineStatus';
import { MenuThumb } from '../components/MenuThumb';
import { WhatsAppFallback } from '../components/WhatsAppFallback';
import { InstallApp } from '../components/InstallApp';
import { paymentStartMessage, readPending, submitHostedForm, writePending } from '../lib/payment';
import { useAppShell } from '../lib/appShell';
import { TAB_BAR_HEIGHT } from '../components/AppShell';
import { forgetEverything, orderAgain, readDetails, rememberOrder, useSavedOrders } from '../lib/orderHistory';

type Step = 'browse' | 'checkout' | 'confirmed';
type CheckoutField = 'cart' | 'name' | 'phone' | 'email' | 'date' | 'time' | 'table' | 'suburb' | 'address';

const FIELD_IDS: Record<CheckoutField, string> = {
  cart: 'order-cart',
  name: 'order-name',
  phone: 'order-phone',
  email: 'order-email',
  date: 'order-date',
  time: 'order-time',
  table: 'order-table',
  suburb: 'order-suburb',
  address: 'order-address',
};
const FIELD_ORDER: CheckoutField[] = ['cart', 'name', 'phone', 'email', 'date', 'time', 'table', 'suburb', 'address'];

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

const ORDER_CATEGORIES = orderCategories;
const LEAD_MINUTES = config.ordering.leadMinutes ?? 0;
// Pay-first delivery (staging preview only). Fees are examples; the server prices
// the real charge from the same config, so these only show it in advance.
const DELIVERY = payFirst ? config.ordering.deliveryPreview : undefined;
const NOT_LISTED = '__not_listed';
const deliveryBand = (suburb: string) => DELIVERY?.bands.find((band) => band.suburbs.includes(suburb));
const inDeliveryHours = (slot: string) => !!DELIVERY && slot >= DELIVERY.hours.from && slot < DELIVERY.hours.until;
const panel = 'bg-surface rounded-2xl p-6 md:p-8 shadow-[0_8px_30px_-14px_rgb(var(--color-ink)/0.2)] ring-1 ring-ink/[0.04]';
const noticeBox = 'rounded-2xl border-2 border-ink bg-accent/15 p-5 text-ink focus:outline-none';

/** Categories with an end time, e.g. breakfast until 12, keyed by item name. */
const itemCutoffs = new Map(
  ORDER_CATEGORIES.flatMap((category) =>
    category.availableUntil ? category.items.map((item) => [item.name, { until: category.availableUntil!, category: category.name }] as const) : [],
  ),
);

export const Order: React.FC = () => {
  const { menu, ordering } = config;
  const online = useOnlineStatus();

  const [previousReference, setPreviousReference] = useState(() => readSession(PENDING_KEY));
  // In the installed app the Cart tab is a URL (?view=cart), so the tab bar and
  // the phone's back button agree with the screen. The browser site keeps its
  // own in-page steps, unchanged.
  const appShell = useAppShell();
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  // Order again from the tracking page lands on checkout, as it does in the app.
  const [localStep, setLocalStep] = useState<Step>(() => ((location.state as { reordered?: boolean } | null)?.reordered ? 'checkout' : 'browse'));
  const step: Step = appShell && localStep !== 'confirmed' ? (params.get('view') === 'cart' ? 'checkout' : 'browse') : localStep;
  const setStep = (next: Step) => {
    setLocalStep(next);
    if (appShell && next !== 'confirmed' && next !== step) setParams(next === 'checkout' ? { view: 'cart' } : {});
  };
  // Order again: the dishes My orders could not put back, named once on arrival.
  const arrival = location.state as { skipped?: string[]; reordered?: boolean } | null;
  // Shown only on the cart screen it arrived with: going back to the menu drops the navigation state.
  const [skippedNow, setSkippedNow] = useState<string[] | null>(null);
  useEffect(() => { if (step !== 'checkout') setSkippedNow(null); }, [step]);
  // Take the reorder hand-off once, then drop it from history, so a reload or Back
  // does not reopen checkout with the old notice.
  useEffect(() => {
    if (!arrival?.reordered) return;
    setSkippedNow(arrival.skipped ?? []);
    setParams(params, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const skipped = arrival?.skipped ?? [];
  const reordered = !!arrival?.reordered || skippedNow !== null;
  const savedOrders = useSavedOrders();
  // The app remembers the last order's contact details on this phone; the browser site never does.
  const [remembered] = useState(() => (appShell ? readDetails() : null));
  const [prefilled, setPrefilled] = useState(!!remembered);
  const [activeCategory, setActiveCategory] = useState(menu.categories[0].name);
  const [customerName, setCustomerName] = useState(remembered?.name ?? '');
  const [customerPhone, setCustomerPhone] = useState(remembered?.phone ?? '');
  const [customerEmail, setCustomerEmail] = useState(remembered?.email ?? '');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [deliverySuburb, setDeliverySuburb] = useState('');
  const autoSuburb = useRef('');
  // Recomputed every render: at most a week or two of days, and it must notice
  // when today's last slot passes while the page sits open.
  // Pay-first offers quarter-hour slots, so a day with none left is not offered either.
  const availableDates = openDates(ordering.maxDaysAhead).filter((date) => !payFirst || collectionSlots(date, LEAD_MINUTES).length > 0);
  const datesKey = availableDates.join(',');
  const [requestedDate, setRequestedDate] = useState(() => availableDates[0] ?? '');
  const [requestedTime, setRequestedTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [failure, setFailure] = useState<{ kind: SubmissionFailure; offline: boolean; message: string; reason?: RefusalReason } | null>(null);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  // Pay-first only. What staff have switched off, the saved order whose payment
  // could not start, and an earlier order this device never finished paying for.
  const [shop, setShop] = useState<OrderingState>({ paused: false, unavailable: [] });
  const [unpaid, setUnpaid] = useState<{ reference: string; email: string; message: string } | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [waiting, setWaiting] = useState(() => (payFirst ? readPending() : null));
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
  const paidDelivery = !!DELIVERY && orderType === 'delivery';
  const band = paidDelivery ? deliveryBand(deliverySuburb) : undefined;
  const deliveryFee = band ? menuPrice(band.fee) : 0;
  const payTotal = total + deliveryFee;

  // If today closes while the page is open, move the selection to the next open day.
  useEffect(() => {
    const dates = datesKey ? datesKey.split(',') : [];
    if (!dates.includes(requestedDate)) setRequestedDate(dates[0] ?? '');
  }, [datesKey, requestedDate]);

  const selectedHours = tradingHours(requestedDate);
  const soldOut = new Set(shop.unavailable);
  const slots = payFirst ? collectionSlots(requestedDate, LEAD_MINUTES).filter((slot) => !paidDelivery || inDeliveryHours(slot)) : [];
  const slotsKey = slots.join(',');

  // Validation reads the clock, so it is re-run at submit with a fresh time.
  const validate = (at: Date): Partial<Record<CheckoutField, string>> => {
    const found: Partial<Record<CheckoutField, string>> = {
      ...contactFieldErrors(customerName, customerPhone, customerEmail),
      ...(availableDates.length === 0
        ? { date: `There are no open days to order for in the next ${ordering.maxDaysAhead + 1} days. Please contact ${config.venue.name}.` }
        : slotFieldErrors(requestedDate, requestedTime, at)),
    };
    if (count === 0) found.cart = 'Add at least one item to your order.';
    const gone = lines.find((line) => soldOut.has(line.name));
    if (gone) found.cart = `${gone.name} is sold out. Remove it to continue.`;
    if (orderType === 'table' && !tableNumber.trim()) found.table = 'Enter your table number.';
    if (orderType === 'delivery' && !deliveryAddress.trim() && deliverySuburb !== NOT_LISTED) found.address = 'Enter the delivery address.';
    if (paidDelivery && DELIVERY) {
      if (!deliverySuburb) found.suburb = 'Choose your suburb.';
      else if (deliverySuburb === NOT_LISTED) found.suburb = 'Choose a listed suburb, or collect instead.';
      if (!found.date && slots.length === 0) found.time = `Delivery runs ${DELIVERY.hours.from} to ${DELIVERY.hours.until}, and there are no delivery times left on this day. Choose another day or collect instead.`;
      if (DELIVERY.minimumOrder && total < menuPrice(DELIVERY.minimumOrder)) found.cart = `Delivery needs at least ${formatMoney(menuPrice(DELIVERY.minimumOrder))} of food. Add something or collect instead.`;
    }
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

  const locked = isSubmitting || redirecting || !!unpaid || failure?.kind === 'uncertain';

  // The next valid slot is chosen for the guest, and re-chosen if theirs passes.
  useEffect(() => {
    if (!payFirst || locked) return;
    const open = slotsKey ? slotsKey.split(',') : [];
    if (!open.includes(requestedTime)) setRequestedTime(open[0] ?? '');
  }, [slotsKey, requestedTime, locked]);

  const loadShop = () => { void db.orderingState?.().then((state) => { if (mounted.current) setShop(state); }).catch(() => { /* The server still refuses a paused or sold-out order. */ }); };
  useEffect(() => {
    if (!payFirst) return;
    loadShop();
    const onVisible = () => { if (document.visibilityState === 'visible') loadShop(); };
    // Back from the payment page out of the browser's page cache: start clean, so the unpaid order is offered again.
    const onShow = (event: PageTransitionEvent) => { if (event.persisted) window.location.reload(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', onShow);
    return () => { document.removeEventListener('visibilitychange', onVisible); window.removeEventListener('pageshow', onShow); };
  }, [step]);

  // A definite refusal is cleared as soon as the customer changes something;
  // an uncertain send is not, because it may still exist on the server.
  useEffect(() => {
    setFailure((current) => (current && current.kind !== 'uncertain' ? null : current));
  }, [customerName, customerPhone, customerEmail, requestedDate, requestedTime, deliveryAddress, deliverySuburb, orderType, tableNumber, count]);

  const orderCategories = ORDER_CATEGORIES;

  // Order.tsx runs its own browse -> checkout -> confirmed flow without a
  // route change, so App.tsx's route-level ScrollToTop never fires here.
  // Without this, moving to the next step while scrolled down leaves the
  // new (shorter) step's top content stranded above the viewport.
  useEffect(() => {
    // The app's tabs jump; the browser site keeps its own scrolling, unchanged.
    if (appShell) window.scrollTo({ top: 0, behavior: 'instant' });
    else window.scrollTo(0, 0);
  }, [step, appShell]);

  useEffect(() => {
    if (step !== 'browse') return;

    // The app has no navbar above the category rail, so its sections settle higher.
    const threshold = appShell ? 90 : 190;
    const updateActiveCategory = () => {
      let current = orderCategories[0]?.name ?? '';
      orderCategories.forEach((category) => {
        const section = document.getElementById(`order-${category.name}`);
        if (section && section.getBoundingClientRect().top <= threshold) {
          current = category.name;
        }
      });
      setActiveCategory(current);
    };

    updateActiveCategory();
    window.addEventListener('scroll', updateActiveCategory, { passive: true });
    return () => window.removeEventListener('scroll', updateActiveCategory);
  }, [orderCategories, step, appShell]);

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
      const offset = appShell ? 80 : 210;
      const top = element.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  const focusNotice = () => requestAnimationFrame(() => {
    noticeRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    noticeRef.current?.focus({ preventScroll: true });
  });

  const pay = async (reference: string, email: string) => {
    setUnpaid(null);
    setRedirecting(true);
    try {
      submitHostedForm(await db.beginPayment!(reference, email));
    } catch (error) {
      if (!mounted.current) return;
      const code = error instanceof Error ? error.message : '';
      if (code === 'ORDERING_PAUSED' || code === 'PAYMENT_UNAVAILABLE') loadShop();
      setRedirecting(false);
      setUnpaid({ reference, email, message: paymentStartMessage(code) });
      focusNotice();
    }
  };

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
      if (appShell && sentDetails.current) {
        rememberOrder(
          { reference: created.order_no, email: payload.email, placedAt: created.created_at, orderType: payload.orderType, total: sentDetails.current.total + (paidDelivery ? deliveryFee : 0), items: payload.items.map(({ name, qty }) => ({ name, qty })) },
          { name: payload.customerName, phone: payload.phone, email: payload.email },
        );
      }
      // Left the page mid-send: the order is saved, but the cart on screen may
      // already be a new one, so it is not cleared from here.
      if (!mounted.current || !sentDetails.current) return;
      setFailure(null);
      if (payFirst) {
        // The cart stays until the server confirms the money, so a failed or
        // abandoned payment loses nothing. The tracking page empties it.
        writePending({ reference: created.order_no, email: payload.email });
        setWaiting(null);
        await pay(created.order_no, payload.email);
        return;
      }
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
      if (failed.reason === 'paused' || failed.reason === 'menu') loadShop();
      setFailure({
        kind: stillUncertain ? 'uncertain' : failed.kind,
        offline: failed.offline,
        reason: stillUncertain ? undefined : failed.reason,
        message: failed.kind !== 'uncertain' && stillUncertain
          ? `Trying again did not go through either. Your first attempt may still have reached ${config.venue.name}, so check its status before ordering again.`
          : failed.kind === 'throttled' ? copy.order.throttled
          : failed.reason === 'menu' ? copy.order.menuChanged
          : failed.reason === 'served' ? copy.order.notServed
          : failed.reason === 'time' ? copy.order.timePassed
          : failed.reason === 'paused' ? `${config.venue.name} has paused online orders for now, so nothing was saved. Your cart is still here.`
          : failed.reason === 'hours' ? `${config.venue.name} is closed at the time you chose, so nothing was saved. Choose a time inside opening hours.`
          : failed.reason === 'zone' ? 'We cannot deliver to that suburb, so nothing was saved. Your cart is still here, and you can collect instead.'
          : failed.reason === 'deliveryHours' ? 'Delivery is not running at the time you chose, so nothing was saved. Choose another time or collect instead.'
          : failed.reason === 'minimum' ? 'This order is below the delivery minimum, so nothing was saved. Add something or collect instead.'
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
      ...(paidDelivery ? { deliverySuburb } : {}),
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
    // An unpaid order left behind simply expires; the cart is what the guest keeps.
    if (unpaid) writePending(null);
    setUnpaid(null);
  };

  const startNewOrder = () => {
    discardAttempt();
    setPreviousReference(null);
    setPlacedOrder(null);
    const details = appShell ? readDetails() : null;
    setPrefilled(!!details);
    setCustomerName(details?.name ?? '');
    setCustomerPhone(details?.phone ?? ''); setCustomerEmail(details?.email ?? ''); setDeliveryAddress(''); setDeliveryNotes(''); setDeliverySuburb('');
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

  const forgetDetails = () => {
    forgetEverything();
    setPrefilled(false);
    setCustomerName(''); setCustomerPhone(''); setCustomerEmail('');
    form.reset();
  };

  const contactFields = (
    <>
      {appShell && prefilled && (
        <p className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl bg-paper px-4 py-2.5 text-sm text-ink/75 ring-1 ring-ink/10">
          <span>Filled in from your last order on this phone.</span>
          <button type="button" onClick={forgetDetails} className="min-h-11 font-display font-bold text-primary underline underline-offset-2">Forget my details</button>
        </p>
      )}
      <FormField id={FIELD_IDS.name} label="Your name" required error={form.visible.name} hint={payFirst ? 'Shown on your order ticket, so staff know whose it is.' : undefined}>
        {(control) => <input {...control} type="text" autoComplete="name" maxLength={100} value={customerName} onChange={(e) => setCustomerName(e.target.value)} onBlur={() => form.blur('name')} className="form-input" />}
      </FormField>
      <FormField id={FIELD_IDS.phone} label="Phone number" required error={form.visible.phone} hint="In case the kitchen needs to reach you about this order.">
        {(control) => <input {...control} type="tel" inputMode="tel" autoComplete="tel" maxLength={30} value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} onBlur={() => form.blur('phone')} placeholder="082 123 4567" className="form-input" />}
      </FormField>
      <FormField id={FIELD_IDS.email} label="Email address" required error={form.visible.email} hint={payFirst ? 'You need this email and your order reference to check your order.' : 'Your order confirmation is sent here.'}>
        {(control) => <input {...control} type="email" inputMode="email" autoComplete="email" maxLength={254} value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} onBlur={() => form.blur('email')} placeholder="you@email.com" className="form-input" />}
      </FormField>
    </>
  );

  const dayField = (
    <FormField id={FIELD_IDS.date} label="Day" required error={form.visible.date}>
      {(control) => (
        <select {...control} value={requestedDate} onChange={(e) => { setRequestedDate(e.target.value); setRequestedTime(''); }} onBlur={() => form.blur('date')} className="form-input">
          {availableDates.length === 0 && <option value="">No open days</option>}
          {availableDates.map((date) => <option key={date} value={date}>{dayLabel(date)}</option>)}
        </select>
      )}
    </FormField>
  );

  // Pay-first: the next slot the kitchen can make is already chosen; a later one is one tap away.
  const earliestDate = availableDates[0];
  const earliestSlot = earliestDate ? collectionSlots(earliestDate, LEAD_MINUTES)[0] : undefined;
  const slotFields = (
    <>
      {paidDelivery && DELIVERY ? (
        <p className="flex items-center gap-2.5 rounded-xl bg-accent/20 px-4 py-3 text-sm text-ink ring-1 ring-accent/60">
          <Clock3 size={18} className="shrink-0" aria-hidden="true" />
          <span>Delivery runs <strong className="font-display text-base">{DELIVERY.hours.from} to {DELIVERY.hours.until}</strong>, example hours for this preview.</span>
        </p>
      ) : earliestSlot && (
        <p className="flex items-center gap-2.5 rounded-xl bg-accent/20 px-4 py-3 text-sm text-ink ring-1 ring-accent/60">
          <Clock3 size={18} className="shrink-0" aria-hidden="true" />
          <span>Next collection slot: <strong className="font-display text-base">{dayLabel(earliestDate)}, {earliestSlot}</strong></span>
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {dayField}
        <FormField id={FIELD_IDS.time} label={paidDelivery ? 'Deliver at' : 'Collect at'} required error={form.visible.time} hint={`${config.venue.timeLabel}. Pick a later time if that suits you better.`}>
          {(control) => (
            <select {...control} disabled={slots.length === 0} value={requestedTime} onChange={(e) => setRequestedTime(e.target.value)} onBlur={() => form.blur('time')} className="form-input">
              {slots.length === 0 && <option value="">No times left</option>}
              {slots.map((slot) => <option key={slot} value={slot}>{slot}{!paidDelivery && requestedDate === earliestDate && slot === earliestSlot ? ' (earliest)' : ''}</option>)}
            </select>
          )}
        </FormField>
      </div>
    </>
  );

  const cartError = count > 0 ? form.visible.cart : undefined;
  const orderSummary = (
    <section aria-labelledby="order-summary-heading" className={panel}>
      <h2 id="order-summary-heading" className="font-display text-lg font-extrabold text-primary mb-4">Your order</h2>
      {count === 0 && (
        <div id={FIELD_IDS.cart} tabIndex={-1} className="rounded-xl bg-paper/70 px-4 py-5 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
          <p className="font-semibold text-ink">Your cart is empty.</p>
          <button type="button" onClick={() => setStep('browse')} className="mt-2 min-h-11 font-display font-bold text-primary underline underline-offset-2">Choose something from the menu</button>
        </div>
      )}
      {cartError && <p role="alert" className="mb-3 rounded-xl bg-accent/15 px-4 py-3 text-sm font-semibold text-ink ring-1 ring-accent/50">{cartError}</p>}
      <ul id={count > 0 ? FIELD_IDS.cart : undefined} tabIndex={-1} className="space-y-2 focus:outline-none">
        {lines.map((line) => (
          <li key={line.name} className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center shrink-0 rounded-full bg-paper/80">
              <button type="button" disabled={locked} aria-label={`Remove one ${line.name}`} onClick={() => remove(line.name)} className="min-w-11 min-h-11 font-bold disabled:opacity-40">−</button>
              <span className="w-5 text-center font-display font-bold" aria-label={`${line.qty} of ${line.name}`}>{line.qty}</span>
              <button type="button" disabled={locked || line.qty >= 99 || soldOut.has(line.name)} aria-label={`Add one more ${line.name}`} onClick={() => add(line.name, line.price)} className="min-w-11 min-h-11 font-bold disabled:opacity-40">+</button>
            </span>
            <h3 className="font-display font-bold text-ink leading-snug">{line.name}{soldOut.has(line.name) && <span className="ml-2 rounded-full bg-paper px-2 py-0.5 text-xs text-ink/70 ring-1 ring-ink/20">Sold out</span>}</h3>
            <div className="flex-1 border-b-2 border-dotted border-ink/20 min-w-[24px] translate-y-[-4px]" aria-hidden="true" />
            <span className="font-display font-bold text-ink whitespace-nowrap">{formatCartMoney(line.qty * line.price)}</span>
          </li>
        ))}
      </ul>
      {paidDelivery && DELIVERY && (
        <div className="mt-4 flex flex-wrap items-baseline gap-2 border-t border-ink/10 pt-4">
          <span className="font-display font-bold text-ink">Delivery fee</span>
          <span className="rounded-full bg-accent/25 px-2.5 py-0.5 text-xs font-bold text-ink ring-1 ring-accent/60">{DELIVERY.feeNote}</span>
          <div className="flex-1 border-b-2 border-dotted border-ink/20 min-w-[24px] translate-y-[-4px]" aria-hidden="true" />
          <span className="font-display font-bold text-ink whitespace-nowrap">{band ? formatCartMoney(deliveryFee) : 'Choose your suburb'}</span>
        </div>
      )}
      <div className="flex items-baseline justify-between mt-6 pt-4 border-t border-ink/10">
        <span className="font-display font-bold text-ink text-lg">Total</span>
        <span className="font-display font-extrabold text-primary text-2xl">{formatCartMoney(payTotal)}</span>
      </div>
    </section>
  );

  const collectInstead = (
    <button type="button" onClick={() => { setOrderType('collection'); setFailure(null); }} className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 font-display text-sm font-bold text-surface">
      Collect instead, keep my cart
    </button>
  );

  return (
    <div className={`${appShell ? 'pt-3' : 'pt-28'} min-h-screen pb-28 lg:pb-16`}>
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
              <div className={`max-w-xl ${appShell ? 'mb-6' : 'mb-8'}`}>
                <span className="font-script text-2xl text-primary">skip the queue</span>
                <h1 className={`font-display font-extrabold text-ink mt-1 ${appShell ? 'text-4xl mb-2' : 'text-4xl md:text-6xl mb-4'}`}>{orderCtaLabel}</h1>
                <p className={`text-ink/60 ${appShell ? 'text-base' : 'text-lg'}`}>
                  {payFirst
                    ? `Choose your food, pay online, then collect at ${config.venue.address}.`
                    : `${copy.order.intro} Choose a requested time and wait for the restaurant to confirm it.`}
                </p>
              </div>
              {waiting && !waiting.paid && (
                <p className={`${noticeBox} mb-6 max-w-xl text-sm`}>
                  <span className="font-display text-base font-bold">Order {waiting.reference} is waiting for payment.</span>{' '}
                  <Link to={`/track?ref=${encodeURIComponent(waiting.reference)}`} className="font-bold underline underline-offset-2">Finish paying or check it</Link>
                </p>
              )}
              {shop.paused && <PausedNotice lines={lines} total={total} className="mb-6 max-w-xl" />}
              {!appShell && <InstallApp placement="order" className="mb-8 max-w-xl" />}
            </div>

            {/* Category tabs */}
            <div className={`sticky ${stickyBelowHeader && !appShell ? 'top-[64px]' : 'top-0'} z-30 bg-surface/95 backdrop-blur-md border-y border-ink/10 py-3 transition-[top] duration-300`}>
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
              <div className="lg:col-span-2 space-y-6">
                {orderCategories.map((category) => (
                  <section
                    key={category.name}
                    id={`order-${category.name}`}
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
                          <div key={item.name} className="group flex items-center gap-3">
                            <MenuThumb src={item.image} alt={item.name} />
                            {/* The Add control wraps under the words on a phone, never under the photo. */}
                            <div className="flex-1 min-w-0 flex flex-wrap items-center gap-3">
                              <div className="flex-1 min-w-[150px]">
                                <div className="flex items-baseline gap-3">
                                  <h3 className="font-display font-bold text-ink leading-snug">{item.name}</h3>
                                  <span className="font-display font-bold text-ink whitespace-nowrap">{formatMoney(menuPrice(item.price))}</span>
                                </div>
                                <p className="text-sm text-ink/55 leading-relaxed pr-4">{item.description}</p>
                              </div>

                              <div className="shrink-0">
                                {soldOut.has(item.name) && qty === 0 ? (
                                  <span className="inline-flex min-h-9 items-center rounded-full bg-paper px-3.5 font-display text-sm font-bold text-ink/60 ring-1 ring-ink/15">Sold out</span>
                                ) : qty === 0 ? (
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
                                      disabled={soldOut.has(item.name)}
                                      aria-label={`Add one more ${item.name}`}
                                      className="w-11 h-11 flex items-center justify-center rounded-full bg-primary text-surface shadow-sm disabled:opacity-40"
                                    >
                                      <Plus size={14} />
                                    </motion.button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>

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
                  {...(appShell ? { 'data-above-tabbar': '', style: { bottom: `calc(${TAB_BAR_HEIGHT + 12}px + env(safe-area-inset-bottom))` } } : {})}
                  className={`lg:hidden fixed ${appShell ? 'bg-primary ring-2 ring-accent' : 'bottom-6 bg-ink'} left-4 right-4 z-40 text-paper rounded-full py-4 px-6 flex items-center justify-between font-display font-bold shadow-xl shadow-ink/25`}
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

        {step === 'checkout' && appShell && count === 0 && (
          <motion.div
            key="empty-cart"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="max-w-xl mx-auto px-4 md:px-8"
          >
            <span className="block font-script text-2xl text-primary">your cart</span>
            <h1 className="font-display text-4xl font-extrabold text-ink mt-1 mb-6">Nothing in it yet</h1>
            {skipped.length > 0 && <SkippedNotice names={skipped} className="mb-6" />}
            <div className={`${panel} text-center`}>
              <ShoppingBag size={28} className="mx-auto text-primary" aria-hidden="true" />
              <p className="mt-3 text-ink/70">Add something from the menu and it shows up here.</p>
              <Link to="/order" className="mt-5 inline-flex min-h-12 items-center rounded-full bg-primary px-6 font-display font-bold text-surface">Browse the menu</Link>
            </div>
            {savedOrders[0] && (
              <div className={`${panel} mt-6`}>
                <p className="font-display text-lg font-extrabold text-primary">Your last order</p>
                <p className="mt-1 text-sm text-ink/70">{savedOrders[0].items.map((item) => `${item.qty}× ${item.name}`).join(', ')}</p>
                <button
                  type="button"
                  onClick={() => {
                    const left = orderAgain(savedOrders[0]);
                    setParams({ view: 'cart' }, { replace: true, state: { skipped: left, reordered: true } });
                    setSkippedNow(left);
                  }}
                  className="mt-4 inline-flex min-h-12 items-center rounded-full bg-accent px-6 font-display font-bold text-ink"
                >
                  Order again
                </button>
              </div>
            )}
          </motion.div>
        )}

        {step === 'checkout' && !(appShell && count === 0) && (
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
            {(skippedNow ?? skipped).length > 0 ? <SkippedNotice names={skippedNow ?? skipped} className="mb-6" />
              : reordered && <p role="status" className="mb-6 rounded-xl bg-accent/20 px-4 py-3 text-sm font-semibold text-ink ring-1 ring-accent/60">Added from your earlier order, at today's menu prices.</p>}

            {payFirst ? (
              <>
                <div className="my-6">{orderSummary}</div>
                {DELIVERY && fulfilmentModes.length > 1 && (
                  <fieldset disabled={locked} className={`${panel} mb-6 space-y-5`}>
                    <legend className="sr-only">Collection or delivery</legend>
                    <p id="order-type-label" className="font-display text-lg font-extrabold text-primary">How would you like it?</p>
                    <OrderTypeToggle value={orderType} onChange={setOrderType} labelledBy="order-type-label" />
                    {paidDelivery && (
                      <>
                        <FormField id={FIELD_IDS.suburb} label="Suburb" required error={form.visible.suburb} hint="We deliver to a short list of nearby suburbs.">
                          {(control) => (
                            <select {...control} value={deliverySuburb} onChange={(e) => setDeliverySuburb(e.target.value)} onBlur={() => form.blur('suburb')} className="form-input">
                              <option value="">Choose your suburb</option>
                              {DELIVERY.bands.map((zone) => (
                                <optgroup key={zone.label} label={`${zone.label}, ${formatMoney(menuPrice(zone.fee))} example fee`}>
                                  {zone.suburbs.map((name) => <option key={name} value={name}>{name}</option>)}
                                </optgroup>
                              ))}
                              <option value={NOT_LISTED}>My suburb is not listed</option>
                            </select>
                          )}
                        </FormField>
                        {deliverySuburb === NOT_LISTED ? (
                          <div role="status" className={noticeBox}>
                            <p className="font-display text-lg font-bold">We cannot deliver to your area</p>
                            <p className="mt-2 text-sm">Delivery only covers the suburbs listed. Your cart is kept, so you can collect from {config.venue.address} instead.</p>
                            <div className="mt-4">{collectInstead}</div>
                          </div>
                        ) : (
                          <>
                            <FormField id={FIELD_IDS.address} label="Street address" required error={form.visible.address} hint={DELIVERY.addressSearch ? 'Type your house number and street, then tap the match.' : undefined}>
                              {(control) => DELIVERY.addressSearch ? (
                                <AddressSearch
                                  control={control}
                                  near={DELIVERY.addressSearch}
                                  value={deliveryAddress}
                                  onChange={setDeliveryAddress}
                                  onBlur={() => form.blur('address')}
                                  onPick={(picked) => {
                                    setDeliveryAddress(picked.label);
                                    const suburb = matchSuburb(picked, DELIVERY.bands.flatMap((zone) => zone.suburbs));
                                    // Undo a suburb an earlier pick chose, so a new address never keeps the old fee.
                                    if (suburb) setDeliverySuburb(suburb);
                                    else if (autoSuburb.current === deliverySuburb) setDeliverySuburb('');
                                    autoSuburb.current = suburb ?? '';
                                  }}
                                  placeholder="House number and street"
                                />
                              ) : <input {...control} type="text" autoComplete="address-line1" maxLength={250} value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} onBlur={() => form.blur('address')} placeholder="House number and street" className="form-input" />}
                            </FormField>
                            <FormField label="Notes for the rider" required={false}>
                              {(control) => <input {...control} type="text" maxLength={250} value={deliveryNotes} onChange={(e) => setDeliveryNotes(e.target.value)} placeholder="e.g. call at the gate" className="form-input" />}
                            </FormField>
                          </>
                        )}
                      </>
                    )}
                  </fieldset>
                )}
                <fieldset disabled={locked} className={`${panel} mb-6 space-y-5`}>
                  <legend className="sr-only">{paidDelivery ? 'Delivery time' : 'Collection time'}</legend>
                  <h2 className="font-display text-lg font-extrabold text-primary" aria-hidden="true">{paidDelivery ? 'Delivery time' : 'Collection time'}</h2>
                  {slotFields}
                  {paidDelivery && slots.length === 0 && <div>{collectInstead}</div>}
                </fieldset>
                <fieldset disabled={locked} className={`${panel} mb-6 space-y-5`}>
                  <legend className="sr-only">Your details</legend>
                  <h2 className="font-display text-lg font-extrabold text-primary" aria-hidden="true">Your details</h2>
                  {contactFields}
                </fieldset>

                <section aria-labelledby="pay-summary-heading" className="mb-6 rounded-2xl bg-ink p-6 text-paper md:p-8">
                  <h2 id="pay-summary-heading" className="font-display text-lg font-extrabold text-accent">Before you pay</h2>
                  <dl className="mt-4 space-y-3 text-sm">
                    <div className="flex justify-between gap-6">
                      <dt className="shrink-0 text-paper/70">{paidDelivery ? 'Deliver to' : 'Collect from'}</dt>
                      <dd className="text-right font-display font-bold">{paidDelivery
                        ? (band ? [deliveryAddress.trim(), deliverySuburb].filter(Boolean).join(', ') : 'Choose your suburb')
                        : `${config.venue.name}, ${config.venue.address}`}</dd>
                    </div>
                    <div className="flex justify-between gap-6">
                      <dt className="shrink-0 text-paper/70">{paidDelivery ? 'Delivery time' : 'Collection time'}</dt>
                      <dd className="text-right font-display font-bold">{requestedTime ? `${dayLabel(requestedDate)}, ${requestedTime}` : 'Not chosen yet'}</dd>
                    </div>
                    {paidDelivery && DELIVERY && (
                      <>
                        <div className="flex justify-between gap-6 border-t border-paper/15 pt-3">
                          <dt className="shrink-0 text-paper/70">Food</dt>
                          <dd className="text-right font-display font-bold">{formatCartMoney(total)}</dd>
                        </div>
                        <div className="flex justify-between gap-6">
                          <dt className="text-paper/70">Delivery fee<span className="block text-xs text-accent">{DELIVERY.feeNote}</span></dt>
                          <dd className="text-right font-display font-bold">{band ? formatCartMoney(deliveryFee) : 'Not chosen yet'}</dd>
                        </div>
                      </>
                    )}
                    <div className="flex items-baseline justify-between gap-6 border-t border-paper/15 pt-3">
                      <dt className="font-display text-base font-bold">Total to pay</dt>
                      <dd className="font-display text-2xl font-extrabold text-accent">{formatCartMoney(payTotal)}</dd>
                    </div>
                  </dl>
                </section>
                <p className="mb-4 text-sm text-ink/75">We use your contact details to manage this order. Marketing is not opted in. You pay now on Payfast, and your {paidDelivery ? 'delivery' : 'collection'} time is confirmed when {config.venue.name} accepts the order.</p>
              </>
            ) : (
              <>
                <fieldset disabled={locked} className={`${panel} my-6 space-y-5`}>
                  <legend className="sr-only">Your details</legend>
                  {contactFields}

                  {fulfilmentModes.length > 1 && (
                    <div>
                      <p id="order-type-label" className="block font-display font-bold text-ink text-sm mb-2">How would you like it?</p>
                      <OrderTypeToggle value={orderType} onChange={setOrderType} labelledBy="order-type-label" />
                    </div>
                  )}
                  <p className="text-sm text-ink/75">{orderType === 'collection' ? ordering.collectionNote : orderType === 'delivery' ? ordering.deliveryNote : ordering.tableNote}</p>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {dayField}
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
                <div className="mb-6">{orderSummary}</div>
                <p className="mb-4 text-sm text-ink/75">We use your contact details to manage this order. Marketing is not opted in. Your requested time is subject to confirmation, and you pay when you collect.</p>
              </>
            )}

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
                  onReload={failure.reason === 'menu' ? () => window.location.reload() : undefined}
                />
                {paidDelivery && (failure.reason === 'zone' || failure.reason === 'deliveryHours' || failure.reason === 'minimum') && <div className="mt-3">{collectInstead}</div>}
              </div>
            )}

            {unpaid && (
              <div ref={noticeRef} tabIndex={-1} role="alert" className={`${noticeBox} mb-4`}>
                <p className="font-display text-lg font-bold">Order {unpaid.reference} is saved, but not paid</p>
                <p className="mt-2 text-sm">{unpaid.message} Your cart is still here.</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button type="button" onClick={() => void pay(unpaid.reference, unpaid.email)} className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 font-display text-sm font-bold text-surface">Try payment again</button>
                  <button type="button" onClick={discardAttempt} className="inline-flex min-h-11 items-center rounded-full border border-ink/25 bg-surface px-5 font-display text-sm font-bold text-ink">Change my order</button>
                </div>
                <WhatsAppFallback lines={lines} total={total} className="mt-4 border-t border-ink/15 pt-4" />
              </div>
            )}

            {shop.paused && !unpaid && <PausedNotice lines={lines} total={total} className="mb-4" />}

            {failure?.kind !== 'uncertain' && !unpaid && !shop.paused && (
              <>
                <button
                  type="submit"
                  disabled={isSubmitting || redirecting}
                  className="w-full min-h-14 inline-flex items-center justify-center gap-2.5 bg-primary text-surface rounded-full font-display font-bold text-base transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-primary/20"
                >
                  {redirecting ? 'Taking you to Payfast…'
                    : isSubmitting ? (payFirst ? 'Saving your order…' : 'Placing order…')
                    : payFirst ? `Pay ${formatCartMoney(payTotal)} with Payfast`
                    : `Place order · ${formatCartMoney(total)}`}
                </button>
                {payFirst && (
                  <p className="mt-3 text-center text-sm text-ink/70">You will leave this site to pay on Payfast. Your order reaches the kitchen only once Payfast confirms the payment.</p>
                )}
              </>
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

/** Order again could not put every dish back: say which, so nothing is silently dropped. */
const SkippedNotice: React.FC<{ names: string[]; className?: string }> = ({ names, className = '' }) => (
  <div role="status" className={`${noticeBox} ${className}`}>
    <p className="font-display text-base font-bold">{names.length === 1 ? '1 dish is no longer on the menu' : `${names.length} dishes are no longer on the menu`}</p>
    <p className="mt-1 text-sm">Left out of your cart: {names.join(', ')}. Everything else from that order is in your cart at today's menu prices.</p>
  </div>
);

/** Staff have paused online orders. The cart is kept; the only way forward is to wait or to ask directly. */
const PausedNotice: React.FC<{ lines: CartLine[]; total: number; className?: string }> = ({ lines, total, className = '' }) => (
  <div role="status" className={`${noticeBox} ${className}`}>
    <p className="font-display text-lg font-bold">Online ordering is paused</p>
    <p className="mt-2 text-sm">{config.venue.name} has paused online orders for now. Your cart is saved on this device, so you can try again a little later.</p>
    <WhatsAppFallback lines={lines} total={total} className="mt-4 border-t border-ink/15 pt-4" />
  </div>
);

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
        <div className="space-y-3 mb-4 max-h-[280px] overflow-y-auto pr-1 pb-1">
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
