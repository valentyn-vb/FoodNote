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
 * The pair to `loading.tsx`: what can fail here is `requireNotOnboarded()`'s read
 * of the goal, and without this file that failure would be lost to the boundary
 * above. The plan write does not reach it — `createPlan` returns its failure as a
 * value, which the wizard draws under the confirm button.
 *
 * Hence the copy: a failed read has saved nothing, and there is nothing to undo.
 *
 * A full-screen frame, like the flow it stands in: this route has no shell to sit
 * inside.
 */
export default function OnboardingError({ retry }: { retry: () => void }) {
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
        <Button variant="outline" onClick={() => retry()}>
          Try again
        </Button>
      </EmptyContent>
    </Empty>
  );
}
