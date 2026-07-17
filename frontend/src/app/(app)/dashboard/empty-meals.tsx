import Image from 'next/image';

// ACCOMPANY mascot moment (design doc: sleeping mascot when nothing is
// logged yet). Unreachable with the seeded mock meal — becomes live once
// real data arrives.
export function EmptyMeals() {
  return (
    <div className="flex flex-col items-center gap-2 py-6">
      <Image src="/mascot/accompany.webp" alt="" width={56} height={56} />
      <div className="font-sans text-caption text-text-muted">
        Nothing logged yet — your first meal starts the day.
      </div>
    </div>
  );
}
