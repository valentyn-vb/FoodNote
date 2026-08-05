import type { ReactNode } from 'react';
import { MascotDisc } from '@/components/mascot-disc';

/**
 * A focused, full-screen flow: no sidebar shell, and no gate of its own.
 *
 * Drawn as `(auth)/layout.tsx` is, because a user reaches this screen straight
 * from `/register`. The slot is wider than auth's: it has to clear the 32rem at
 * which the plan options go two abreast, once the card's own padding is off.
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
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-10">
      <div className="flex flex-col items-center gap-3">
        <MascotDisc src="/mascot/guide.webp" alt="FoodNote mascot" priority />
        <p className="font-heading text-2xl font-semibold">FoodNote</p>
      </div>
      <div className="w-full max-w-xl">{children}</div>
    </main>
  );
}
