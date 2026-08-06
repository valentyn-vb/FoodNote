import { Skeleton } from '@/components/ui/skeleton';

/**
 * The wizard's own shape: the mascot and step title centred, one panel of fields
 * beneath, and the step's single CTA at the bottom.
 *
 * The wait it covers is `requireNotOnboarded()`'s read of the goal, which the page
 * does before anything paints.
 */
export default function OnboardingLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-10">
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="size-28 rounded-full" />
        <Skeleton className="h-7 w-48" />
      </div>
      <div className="flex w-full max-w-sm flex-col gap-3">
        <Skeleton className="h-11.5 w-full" />
        <Skeleton className="h-11.5 w-full" />
        <Skeleton className="h-11.5 w-full" />
        <Skeleton className="h-12.5 w-full" />
      </div>
    </div>
  );
}
