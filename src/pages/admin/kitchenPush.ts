// Lock-screen alerts for the kitchen screen (Web Push). Opt-in per device: only
// the phone someone switches it on for gets alerts. Wherever it cannot work
// (no browser support, the demo, a tenant that does not take payments) or the
// permission is blocked, the screen keeps its sound alert and says nothing.

import { config } from '../../config';
import { data as db } from '../../core/data';

export type PushState = 'unavailable' | 'off' | 'on';

const SCOPE = '/admin/';

const supported = () =>
  config.ordering.payment === 'payfast' && !!db.savePushSubscription && window.isSecureContext &&
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

const decode = (base64url: string) =>
  Uint8Array.from(atob(base64url.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

async function save(subscription: PushSubscription) {
  const { endpoint, keys } = subscription.toJSON();
  if (!endpoint || !keys?.p256dh || !keys.auth) throw new Error('PUSH_SUBSCRIPTION_INCOMPLETE');
  await db.savePushSubscription!({ endpoint, p256dh: keys.p256dh, auth: keys.auth });
}

/** What to show before pushState() answers, so a slow or failing check never hides the opt-in. */
export const initialPushState = (): PushState =>
  supported() && Notification.permission !== 'denied' ? 'off' : 'unavailable';

/** The current state, re-saving an existing subscription so a row the server dropped comes back. */
export async function pushState(): Promise<PushState> {
  if (!supported() || Notification.permission === 'denied') return 'unavailable';
  if (Notification.permission !== 'granted') return 'off';
  try {
    const registration = await navigator.serviceWorker.getRegistration(SCOPE);
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return 'off';
    await save(subscription);
    return 'on';
  } catch {
    // Found on Android 10 / Chrome 157: this check failed and hid the button. Say off; one tap re-runs the full opt-in.
    return 'off';
  }
}

/** " (Code: AbortError)" for a browser error, so staff can read the cause out over the phone. Empty otherwise. */
export const errorCode = (failure: unknown) => {
  const name = (failure as { name?: unknown } | null)?.name;
  return typeof name === 'string' && name !== 'Error' ? ` (Code: ${name})` : '';
};

/** Call from a tap: the browser only shows its permission prompt for one. */
export async function enablePush(): Promise<PushState> {
  if (!supported()) return 'unavailable';
  const permission = await Notification.requestPermission();
  if (permission === 'denied') return 'unavailable';
  if (permission !== 'granted') return 'off';
  await navigator.serviceWorker.register('/staff-sw.js', { scope: SCOPE });
  // subscribe() needs an active worker; ready waits for the one covering this page.
  const registration = await navigator.serviceWorker.ready;
  const subscription = (await registration.pushManager.getSubscription())
    ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decode(await db.pushPublicKey!()) });
  await save(subscription);
  return 'on';
}

export async function disablePush(): Promise<PushState> {
  const registration = await navigator.serviceWorker.getRegistration(SCOPE);
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription) {
    await db.deletePushSubscription!(subscription.endpoint);
    await subscription.unsubscribe();
  }
  return 'off';
}
