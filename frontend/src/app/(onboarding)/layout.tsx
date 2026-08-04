import type { ReactNode } from 'react';

/**
 * A focused, full-screen flow: no sidebar shell, and no gate of its own.
 *
 * It used to hold the same client auth check as `(app)/layout.tsx` — a spinner
 * until the session restore settled, then `router.replace('/login')`. `proxy.ts`
 * does that before this renders. Its `TODO(onboarding-forms)` — bounce an
 * already-onboarded user back to `/dashboard` — belongs to `requireNotOnboarded()`
 * on the page, where the redirect cannot loop: it and `requireOnboarded()` are
 * negations over one memoized read of the goal.
 */
export default function OnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <main className="min-h-screen">{children}</main>;
}
