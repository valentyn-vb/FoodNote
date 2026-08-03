import * as React from 'react';

/**
 * The app's desktop threshold — tailwind's `lg`, and the JS half of it. The
 * screens rearrange here rather than swapping trees (ADR 0011): the sidebar
 * becomes a panel, the dashboard becomes three bands, /profile becomes two
 * columns. shadcn's responsive-dialog example uses `768px`; matching it here
 * would put the 768–1023px band on the desktop dialog while every other surface
 * was still in its phone layout. The app's *other* threshold is 768, and it has
 * its own hook — `useIsMobile`, which is where the sidebar's sheet ends.
 */
export const DESKTOP_QUERY = '(min-width: 1024px)';

// useSyncExternalStore (not setState-in-effect) so hydration matches the
// server snapshot first, then syncs to the real client value — same
// rationale as use-mobile.ts, generalized to an arbitrary query.
export function useMediaQuery(query: string): boolean {
  const subscribe = React.useCallback(
    (callback: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', callback);
      return () => mql.removeEventListener('change', callback);
    },
    [query],
  );
  const getSnapshot = React.useCallback(
    () => window.matchMedia(query).matches,
    [query],
  );

  return React.useSyncExternalStore(subscribe, getSnapshot, () => false);
}
