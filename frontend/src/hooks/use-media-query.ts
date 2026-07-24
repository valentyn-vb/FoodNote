import * as React from 'react';

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
