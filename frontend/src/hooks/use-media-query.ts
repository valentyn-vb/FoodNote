import * as React from 'react';

/**
 * The app's desktop breakpoint — tailwind's `lg`. Every mobile/desktop split in
 * the app is at this width: the sidebar and header are `lg:`-gated, and each
 * route's mobile layout is its `lg:hidden` block. shadcn's responsive-dialog
 * example uses `768px`; matching it here would put the 768–1023px band on the
 * desktop dialog while every other surface was still in its mobile layout.
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
