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
import { profile } from '@/lib/api-client';
import {
  APPEARANCE_ATTRIBUTE,
  APPEARANCE_COOKIE,
  APPEARANCE_COOKIE_MAX_AGE_S,
  appearanceOrDefault,
} from '@/lib/appearance';

/**
 * The one thing in the app that knows about the appearance. Both controls — the
 * section on /profile and the sidebar's submenu — are consumers, so they cannot
 * disagree; and network, cookie and DOM attribute are written in one place, which
 * is what makes moving the cookie write into a Server Action later (#86) a
 * one-function edit.
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

function readCookie(): string | undefined {
  return document.cookie
    .split('; ')
    .find((pair) => pair.startsWith(`${APPEARANCE_COOKIE}=`))
    ?.split('=')[1];
}

function writeCookie(value: Appearance) {
  // The BFF's writing half does not exist yet, so this is the browser's job for
  // now — the same shape `ui/sidebar.tsx` uses for its own open state. No
  // httpOnly, no secret.
  document.cookie = `${APPEARANCE_COOKIE}=${value}; path=/; max-age=${APPEARANCE_COOKIE_MAX_AGE_S}; samesite=lax`;
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
  // Seeded from the cookie the server just rendered from, so the first client
  // value matches the painted one. `useState` initialisers run during render on
  // the client only — this component is never server-rendered.
  const [appearance, setLocal] = useState<Appearance>(() =>
    appearanceOrDefault(readCookie()),
  );

  // The attribute and the cookie are the state, projected: every transition
  // below moves `appearance` and nothing else, so neither copy can be the one a
  // future branch forgets. Both writes are idempotent — on mount they restate
  // what the server already stamped and refresh the cookie's year.
  useEffect(() => {
    document.documentElement.setAttribute(APPEARANCE_ATTRIBUTE, appearance);
    writeCookie(appearance);
  }, [appearance]);

  // The profile is the truth. On a first visit from a new device the cookie is
  // absent and the page painted `system`, so this is where a stored preference
  // arrives — one frame late, by design.
  useEffect(() => {
    let cancelled = false;
    profile
      .current()
      .then((p) => {
        if (!cancelled) setLocal(p.appearance);
      })
      // A profile that does not exist yet (404 during onboarding) is not an
      // error worth a toast: `system` is the right answer for that user.
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // Once, on mount: this reconciles the cache with the truth, and re-running it
    // on every local change would fight the optimistic write below.
  }, []);

  const setAppearance = useCallback(
    (next: Appearance) => {
      const previous = appearance;
      // Optimistic, because the feedback *is* the page repainting — a spinner on
      // a colour switch tells the user less than the colour does.
      setLocal(next);

      profile.patch({ appearance: next }).catch(() => {
        setLocal(previous);
        toast.error("Couldn't save your appearance.");
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
