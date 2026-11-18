import { useEffect, useState } from 'react';
import { config } from '../config';

// "Put us on your home screen". Android Chrome hands us an install prompt
// (beforeinstallprompt) once, often before React mounts, so it is caught here at
// import time. iPhone has no prompt: the guest is shown Safari's two taps.

export type Platform = 'ios' | 'android' | 'other';
export type Placement = 'order' | 'after-order' | 'return-visit';

/** iPadOS reports itself as a Mac; the touch points give it away. */
export const platformOf = (userAgent: string, maxTouchPoints: number): Platform =>
  /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1) ? 'ios'
  : /Android/.test(userAgent) ? 'android'
  : 'other';

export interface OfferState { visits: number; dismissedAt?: number; installed?: boolean }

const QUIET_DAYS = 14;

/**
 * Encouraging, not nagging: one "Not now" quiets every placement for two weeks,
 * an install quiets them for good, and the floating card waits for a second visit.
 */
export function shouldOffer(state: OfferState, placement: Placement, platform: Platform, now: number): boolean {
  if (platform === 'other' || state.installed) return false;
  if (state.dismissedAt && now - state.dismissedAt < QUIET_DAYS * 86_400_000) return false;
  return placement !== 'return-visit' || state.visits >= 2;
}

const KEY = `${config.slug}-app-offer`;

// Storage can throw (private mode, blocked site data); the offer then simply resets each visit.
export function readOffer(): OfferState {
  try { return { visits: 0, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }; } catch { return { visits: 0 }; }
}
function writeOffer(patch: Partial<OfferState>): void {
  try { localStorage.setItem(KEY, JSON.stringify({ ...readOffer(), ...patch })); } catch { /* see readOffer */ }
}

/** Counts browser sessions, not page views, so a single visit never counts as a return. */
export function countVisit(): void {
  try {
    if (sessionStorage.getItem(KEY)) return;
    sessionStorage.setItem(KEY, '1');
    writeOffer({ visits: readOffer().visits + 1 });
  } catch { /* see readOffer */ }
}

export const dismissOffer = (): void => writeOffer({ dismissedAt: Date.now() });

export const isStandalone = (): boolean =>
  typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true);

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

// The staff console installs its own app (Kitchen); its prompts and installs are not the guest app's.
const onStaffConsole = () => window.location.pathname.startsWith('/admin');

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    if (onStaffConsole()) return;
    event.preventDefault(); // our sticker asks instead of Chrome's mini bar
    deferred = event as InstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    if (onStaffConsole()) return;
    deferred = null;
    writeOffer({ installed: true });
    notify();
  });
}

/** Shows Chrome's install dialog. Only works from a tap, and only once per prompt. */
export async function promptInstall(): Promise<boolean> {
  const event = deferred;
  if (!event) return false;
  deferred = null;
  notify();
  await event.prompt();
  const { outcome } = await event.userChoice;
  if (outcome === 'accepted') writeOffer({ installed: true });
  return outcome === 'accepted';
}

/** Whether Chrome is currently offering a one-tap install. */
export function useCanPrompt(): boolean {
  const [can, setCan] = useState(() => deferred !== null);
  useEffect(() => {
    const update = () => setCan(deferred !== null);
    listeners.add(update);
    update();
    return () => { listeners.delete(update); };
  }, []);
  return can;
}
