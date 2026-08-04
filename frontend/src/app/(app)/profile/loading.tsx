import { Skeleton } from '@/components/ui/skeleton';

/**
 * The shape of `/profile`: the identity row, then the three stacked sections.
 * Same `max-w-xl` as the page, so nothing shifts sideways when the data lands —
 * this is the one route that owns a max-width, and a skeleton that ignored it
 * would be the widest thing on the screen for a frame.
 *
 * The section heights are the cards' own, not a guess: the plan and the details
 * each carry a header plus label/value rows, and the appearance section is one
 * row of choices.
 */
export default function ProfileLoading() {
  return (
    <div className="flex w-full max-w-xl flex-col gap-6">
      <div className="flex flex-col items-center gap-2.5 px-2 lg:flex-row lg:gap-4">
        <Skeleton className="size-18 shrink-0 rounded-full" />
        <div className="flex flex-col items-center gap-2 lg:items-start">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-52" />
        </div>
        <Skeleton className="h-9 w-28 lg:ml-auto" />
      </div>

      <div className="flex flex-col gap-4">
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
        <Skeleton className="h-36 w-full rounded-xl" />
      </div>
    </div>
  );
}
