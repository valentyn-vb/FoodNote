import Image from 'next/image';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { cn } from '@/lib/utils';

// ACCOMPANY mascot moment (design doc: sleeping mascot when nothing is logged
// yet), on upstream's Empty primitives.
//
// One component for both places a day can be empty — the dashboard's meal card
// and /meals — so the sentence cannot drift between them. The frame is the
// caller's: upstream's `border-dashed` draws nothing without a `border` beside
// it, which suits the dashboard (already inside a card, where a second boundary
// just inside the first is one line too many) and leaves /meals free to ask for
// one, having no card of its own.
export function EmptyMeals({ className }: { className?: string }) {
  return (
    <Empty className={cn('p-8', className)}>
      <EmptyHeader>
        <EmptyMedia>
          <Image src="/mascot/accompany.webp" alt="" width={56} height={56} />
        </EmptyMedia>
        <EmptyTitle>Nothing logged yet</EmptyTitle>
        <EmptyDescription>Your first meal starts the day.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
