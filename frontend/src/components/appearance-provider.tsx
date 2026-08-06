'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';
import type { Appearance } from '@foodnote/shared';
import { saveAppearance } from '@/lib/actions/profile';
import {
  APPEARANCE_ATTRIBUTE,
  APPEARANCE_COOKIE,
  APPEARANCE_COOKIE_MAX_AGE_S,
} from '@/lib/appearance';

/**
 * The one thing in the app that knows about the appearance. Both controls — the
 * section on /profile and the sidebar's submenu — are consumers, so they cannot
 * disagree; and the cookie and the DOM attribute are written in one place.
 *
 * The profile write moved to a Server Action; the *cookie* write did not, and that
 * is the point of it staying here. The cookie is a cache of the profile, so it has
 * to be filled on the visit where the server supplied a value the browser had none
 * for — an effect that runs on mount fills it for free, where a Server Action
 * would cost a round trip on every load of a device that has never chosen.
 *
 * It is deliberately NOT the source of the first frame: the root layout already
 * stamped the attribute from the cookie, and this only continues what the server
 * started. Applying it here instead would bring back the flash the cookie exists
 * to prevent — the shell's first paint is a spinner, long after the page has been
 * painted in whatever the tokens said.
 */

type AppearanceContextValue = {
  appearance: Appearance;
  setAppearance: (next: Appearance) => void;
};

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

export function useAppearance(): AppearanceContextValue {
  const ctx = useContext(AppearanceContext);
  if (!ctx)
    throw new Error('useAppearance must be used within AppearanceProvider');
  return ctx;
}

function writeCookie(value: Appearance) {
  // The same shape `ui/sidebar.tsx` uses for its own open state. No httpOnly, no
  // secret: this is a cache of a preference, and the browser is the one filling it.
  document.cookie = `${APPEARANCE_COOKIE}=${value}; path=/; max-age=${APPEARANCE_COOKIE_MAX_AGE_S}; samesite=lax`;
}

export function AppearanceProvider({
  initial,
  children,
}: {
  /** Resolved on the server: the cookie, or the stored profile when there is none. */
  initial: Appearance;
  children: ReactNode;
}) {
  // Seeded from the server, which read the same cookie to stamp <html>, so the
  // first client value cannot disagree with the painted one.
  //
  // It used to read `document.cookie` in this initialiser, on the stated
  // assumption that the component is never server-rendered — true only while
  // `(app)/layout.tsx` held a client auth gate that returned a spinner during
  // SSR. With the gate gone this renders on the server, where `document` does not
  // exist: the read threw on every request and the subtree silently lost its
  // server render. A prop cannot have that problem.
  const [appearance, setLocal] = useState<Appearance>(initial);

  // The attribute and the cookie are the state, projected: every transition
  // below moves `appearance` and nothing else, so neither copy can be the one a
  // future branch forgets. Both writes are idempotent — on mount they restate
  // what the server already stamped and refresh the cookie's year.
  useEffect(() => {
    document.documentElement.setAttribute(APPEARANCE_ATTRIBUTE, appearance);
    writeCookie(appearance);
  }, [appearance]);

  const setAppearance = useCallback(
    (next: Appearance) => {
      const previous = appearance;
      // Optimistic, because the feedback *is* the page repainting — a spinner on
      // a colour switch tells the user less than the colour does.
      setLocal(next);

      void saveAppearance(next).then((result) => {
        if (result.ok) return;
        setLocal(previous);
        toast.error(result.message);
      });
    },
    [appearance],
  );

  const value = useMemo<AppearanceContextValue>(
    () => ({ appearance, setAppearance }),
    [appearance, setAppearance],
  );

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  );
}
