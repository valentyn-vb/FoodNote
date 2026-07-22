import { EmptyState } from '@/components/empty-state';

// ACCOMPANY mascot moment (design doc: sleeping mascot when nothing is
// logged yet). Unreachable with the seeded mock meal — becomes live once
// real data arrives.
export function EmptyMeals() {
  return (
    <EmptyState
      mascotSrc="/mascot/accompany.webp"
      caption="Nothing logged yet — your first meal starts the day."
    />
  );
}
