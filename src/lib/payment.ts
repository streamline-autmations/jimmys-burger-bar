// Browser side of pay-first checkout: remembering the unpaid order across the
// trip to Payfast, and handing the guest over.

import { config } from '../config';
import { storageKey } from '../core/tenant';
import type { PaymentHandoff } from '../core/data';

export interface PendingPayment {
  reference: string;
  /** The email the order was placed with: begin_payment and tracking both match on it. */
  email: string;
  /** Set once the server has confirmed the money, so the cart is emptied exactly once. */
  paid?: boolean;
}

const KEY = storageKey('unpaid-order');

// localStorage, not the tab-scoped session store the cart uses: a banking app
// can hand the guest back in a different tab, and they still need their order.
export const readPending = (): PendingPayment | null => {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    return value && typeof value.reference === 'string' && typeof value.email === 'string' ? value : null;
  } catch { return null; }
};
export const writePending = (value: PendingPayment | null): void => {
  try {
    if (value) localStorage.setItem(KEY, JSON.stringify(value)); else localStorage.removeItem(KEY);
  } catch { /* Storage may be disabled. The tracking page then asks for the email. */ }
};

/** Posts the signed fields to the payment page, in the order the server signed them. */
export function submitHostedForm({ action, fields }: PaymentHandoff): void {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = action;
  form.hidden = true;
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.append(input);
  }
  document.body.append(form);
  form.submit();
}

/** Why payment could not start, in the guest's terms. Nothing has been charged in any of these. */
export const paymentStartMessage = (code: string): string =>
  code === 'ORDERING_PAUSED' ? `${config.venue.name} has paused online orders for now, so payment did not start.`
  : code === 'PAYMENT_UNAVAILABLE' ? 'Something in this order has sold out or changed price, so payment did not start. Change your order and try again.'
  : code === 'PAYMENT_CLOSED' ? `The collection time on this order has passed or falls outside ${config.venue.name}'s hours, so payment did not start. Choose a new time.`
  : code === 'PAYMENT_DELIVERY_CLOSED' ? 'Delivery is not running at the time on this order, so payment did not start. Choose another time or collect instead.'
  : code === 'PAYMENT_DELIVERY_OUT_OF_ZONE' ? 'We cannot deliver to the suburb on this order, so payment did not start. You can collect instead.'
  : code === 'PAYMENT_DELIVERY_MINIMUM' ? 'This order is below the delivery minimum, so payment did not start. Add something or collect instead.'
  : code === 'PAYMENT_NOT_PENDING' ? 'This order can no longer be paid for. It may have expired or already been paid. Check its status before ordering again.'
  : code === 'PAYMENT_NOT_FOUND' ? 'To pay, look this order up with the email address it was placed with.'
  : 'Payment could not start just now. Nothing has been charged. Try again in a moment.';
