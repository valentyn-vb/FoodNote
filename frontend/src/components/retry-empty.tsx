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
 * The screen every `error.tsx` draws: the RECOVER mascot — the one place the app
 * admits a fault — over what failed, and the button that asks for it again.
 *
 * One component because seven boundaries drew it, and had already drifted in the
 * mascot's width and in whether the frame was there. What differs between them is
 * copy and frame, so that is what they pass: the `Empty` className, because a
 * boundary standing on the page background needs an edge and one replacing a whole
 * card must not have one (upstream's `border-dashed` draws nothing without a
 * `border` beside it), and the mascot's width, which follows the frame's size.
 *
 * `onRetry` rather than the boundary's `retry` itself, because the distinction is
 * the caller's to make: `retry()` refreshes the router before clearing the error,
 * which is what re-runs a server read, where `reset()` alone re-renders the same
 * failed payload (`node_modules/next/dist/client/components/error-boundary.js`).
 */
export function RetryEmpty({
  title,
  description,
  className,
  mascotClassName = 'w-14',
  onRetry,
}: {
  title: string;
  description: string;
  className?: string;
  mascotClassName?: string;
  onRetry: () => void;
}) {
  return (
    <Empty className={className}>
      <EmptyHeader>
        <EmptyMedia>
          <Mascot
            src="/mascot/recover.webp"
            className={mascotClassName}
            priority
          />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      </EmptyContent>
    </Empty>
  );
}
