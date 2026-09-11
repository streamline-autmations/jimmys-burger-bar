import { useEffect, useState } from 'react';

// The width at which the site switches to its desktop motion layer: the intro's
// logo handoff, the hero's gated choreography, the pinned gallery and the
// draggable rails. Matches Tailwind's `lg`, which is also where the hero goes
// two-column, so layout and choreography change at the same breakpoint.
//
// Everything below this keeps the mobile experience exactly as it was built.
export const DESKTOP_QUERY = '(min-width: 1024px)';

// Read synchronously on the first render (this is a client-only app), so the
// first frame already takes the right branch and nothing re-animates on mount.
export function useIsDesktop(): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(DESKTOP_QUERY).matches);

  useEffect(() => {
    const query = window.matchMedia(DESKTOP_QUERY);
    const onChange = () => setMatches(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return matches;
}
