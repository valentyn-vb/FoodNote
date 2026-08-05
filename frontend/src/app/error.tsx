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
 * The boundary for the layouts, which the per-route ones cannot be: `error.tsx`
 * wraps its segment's page and any layout *below* it, never the layout beside it
 * (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md`).
 * So a failure in `(app)/layout.tsx` — which reads the signed-in user, the goal
 * and the appearance over the network — used to climb past three carefully drawn
 * pages to Next's built-in handler, which in a production build is an unstyled
 * white page.
 *
 * It renders inside the root layout and replaces everything under it, so there is
 * no shell here: no sidebar, no header, and nothing that would need the data whose
 * absence brought us here. The copy is deliberately generic — this catches
 * `(app)`, `(auth)`, `(onboarding)` and the landing page alike, and it cannot know
 * which one it stands in for.
 */
export default function AppError({ reset }: { reset: () => void }) {
  return (
    <Empty className="min-h-svh">
      <EmptyHeader>
        <EmptyMedia>
          <Mascot src="/mascot/recover.webp" className="w-18" priority />
        </EmptyMedia>
        <EmptyTitle>Something went wrong</EmptyTitle>
        <EmptyDescription>
          Nothing you logged is lost. Try again.
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
