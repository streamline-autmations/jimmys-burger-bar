// ---------------------------------------------------------------------------
// Lets hero motion hold until the first-load intro has actually lifted.
//
// The hero's burger assembly is a ~3.9s choreography that starts as soon as its
// layer images decode - which happens behind the intro. Without this gate the
// curtain peels back onto a burger that is halfway through building itself:
// the visitor sees a patty with no bun on it, reads that as an unfinished page
// rather than as motion, and misses the animation's opening beats entirely.
//
// Defaults to open, so anything that mounts without an intro (SPA navigation
// back to the home page, the admin tool, reduced-motion visitors) behaves
// exactly as before.
// ---------------------------------------------------------------------------

import { useEffect, useState } from 'react';

let open = true;
const waiters = new Set<() => void>();

export const closeIntroGate = (): void => {
  open = false;
};

export const openIntroGate = (): void => {
  open = true;
  waiters.forEach((notify) => notify());
  waiters.clear();
};

export const isIntroGateOpen = (): boolean => open;

/** Calls back once the intro is done, or immediately if none is playing. */
export const whenIntroDone = (callback: () => void): (() => void) => {
  if (open) {
    callback();
    return () => {};
  }
  waiters.add(callback);
  return () => {
    waiters.delete(callback);
  };
};

/** React view of the gate: false while the first-load intro still covers the page. */
export function useIntroDone(): boolean {
  const [done, setDone] = useState(isIntroGateOpen);
  useEffect(() => whenIntroDone(() => setDone(true)), []);
  return done;
}
