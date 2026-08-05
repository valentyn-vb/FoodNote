'use client';

import { Mascot } from '@/components/mascot';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

/**
 * The pair to `loading.tsx`, and here for the same reason: the wizard still
 * fetches its own state, so nothing on this route can fail on the server *yet* —
 * `requireNotOnboarded()` and the plan write move onto the page with the
 * onboarding route's own migration, and a route that reads on the server without
 * this file loses its failure to the boundary above.
 *
 * A full-screen frame, like the flow it stands in: this route has no shell to sit
 * inside.
 */
export default function OnboardingError({ reset }: { reset: () => void }) {
  return (
    <Empty className="min-h-screen">
      <EmptyHeader>
        <EmptyMedia>
          <Mascot src="/mascot/recover.webp" className="w-18" priority />
        </EmptyMedia>
        <EmptyTitle>Couldn&apos;t set up your plan</EmptyTitle>
        <EmptyDescription>
          Nothing has been saved yet. Try again.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" onClick={reset}>
          Try again
        </Button>
      </EmptyContent>
    </Empty>
  );
}
