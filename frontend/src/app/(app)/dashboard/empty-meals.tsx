import Image from 'next/image';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

// ACCOMPANY mascot moment (design doc: sleeping mascot when nothing is logged
// yet), on upstream's Empty primitives.
//
// Upstream's `border-dashed` draws nothing without a `border` beside it, and
// that is left alone on purpose: this sits inside a card that already has an
// edge, and a second boundary just inside the first is one line too many.
export function EmptyMeals() {
  return (
    <Empty className="p-8">
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
