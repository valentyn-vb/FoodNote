'use client';

import { RetryEmpty } from '@/components/retry-empty';

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
    <RetryEmpty
      className="min-h-screen"
      mascotClassName="w-18"
      title="Couldn't set up your plan"
      description="Nothing has been saved yet. Try again."
      onRetry={() => retry()}
    />
  );
}
