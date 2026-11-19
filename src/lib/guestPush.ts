// "Tell me when it is ready": a Web Push to the guest's phone when their order
// reaches ready (and, for a delivery, when it leaves). Opt-in per order on the
// tracking page. The push has no payload; the worker (/sw.js, generated in
// vite-plugin-tenant-html.ts) shows generic text. Same design as the kitchen's
// alerts (src/pages/admin/kitchenPush.ts), on the guest app's own worker.
//
// iPhone only allows web push for a site added to the Home Screen (iOS 16.4+),
// so in Safari the opt-in explains that instead of offering a button that fails.

import { config } from '../config';
import { data as db } from '../core/data';
import { storageKey } from '../core/tenant';
import { isStandalone, platformOf } from './installApp';

export type AlertState = 'unavailable' | 'needs-home-screen' | 'blocked' | 'off' | 'on';

const ON = storageKey('order-alerts');

/** The demo shows alerts on screen instead; it never asks the browser for permission. */
const simulated = () => !!db.pushSimulated;

const browserSupports = () =>
  window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

const decode = (base64url: string) =>
  Uint8Array.from(atob(base64url.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

// Which orders this device switched alerts on for. Device only, like My orders.
const readOn = (): string[] => {
  try { const value = JSON.parse(localStorage.getItem(ON) ?? '[]'); return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : []; } catch { return []; }
};
const writeOn = (references: string[]) => {
  try { localStorage.setItem(ON, JSON.stringify(references.slice(-20))); } catch { /* storage blocked: the switch just forgets */ }
};

export function alertState(reference: string): AlertState {
  if (!db.addGuestPush) return 'unavailable';
  if (simulated()) return readOn().includes(reference) ? 'on' : 'off';
  // Pay-first tenants only, like the kitchen alerts: only they have push.url and the migration.
  if (config.ordering.payment !== 'payfast') return 'unavailable';
  const ios = typeof navigator !== 'undefined' && platformOf(navigator.userAgent, navigator.maxTouchPoints) === 'ios';
  if (!browserSupports()) return ios && !isStandalone() ? 'needs-home-screen' : 'unavailable';
  if (Notification.permission === 'denied') return 'blocked';
  return Notification.permission === 'granted' && readOn().includes(reference) ? 'on' : 'off';
}

/** Call from a tap: the browser only shows its permission prompt for one. */
export async function enableAlert(reference: string, email: string): Promise<AlertState> {
  if (simulated()) {
    if (!(await db.addGuestPush!(reference, email, null))) throw new Error('ALERT_REFUSED');
    writeOn([...readOn().filter((item) => item !== reference), reference]);
    return 'on';
  }
  const permission = await Notification.requestPermission();
  if (permission === 'denied') return 'blocked';
  if (permission !== 'granted') return 'off';
  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  const subscription = (await registration.pushManager.getSubscription())
    ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decode(await db.pushPublicKey!()) });
  const { endpoint, keys } = subscription.toJSON();
  if (!endpoint || !keys?.p256dh || !keys.auth) throw new Error('PUSH_SUBSCRIPTION_INCOMPLETE');
  // False: the server could not match this order to that email, or it is already done.
  if (!(await db.addGuestPush!(reference, email, { endpoint, p256dh: keys.p256dh, auth: keys.auth }))) throw new Error('ALERT_REFUSED');
  writeOn([...readOn().filter((item) => item !== reference), reference]);
  return 'on';
}

/** Off for this order only. The browser subscription stays: other orders on this phone may still use it. */
export async function disableAlert(reference: string, email: string): Promise<AlertState> {
  if (!simulated()) {
    const registration = await navigator.serviceWorker.getRegistration('/');
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) await db.removeGuestPush!(reference, email, subscription.endpoint);
  } else {
    await db.removeGuestPush?.(reference, email, '');
  }
  writeOn(readOn().filter((item) => item !== reference));
  return 'off';
}
