import { useSyncExternalStore } from 'react';
import { isStandalone } from './installApp';

// The installed app (home screen icon, or the Android app file) gets an app
// shell: menu first, bottom tabs, no marketing home page. The browser site is
// untouched. Decided once per load: display mode does not change mid-session.
//
// `preview` exists for the sales demo's "Show as installed app" control only
// (src/demo/DemoShell.tsx). Nothing in a production build calls it, and it
// reads no storage or query string, so a visitor cannot switch it on.

const installed = isStandalone();
let preview = false;
const listeners = new Set<() => void>();

export function setAppShellPreview(on: boolean): void {
  preview = on;
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const snapshot = () => installed || preview;

export const appShellActive = snapshot;
export const useAppShell = (): boolean => useSyncExternalStore(subscribe, snapshot, () => false);
