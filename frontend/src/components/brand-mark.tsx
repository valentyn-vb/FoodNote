import { MascotDisc } from '@/components/mascot-disc';

/**
 * The mascot over the wordmark, at the top of the two screens that have no
 * shell: `(auth)` and `(onboarding)`. Both drew it, identically, and the frame
 * around it is all they actually differ in — so the frame stays theirs and this
 * is only the mark.
 */
export function BrandMark() {
  return (
    <div className="flex flex-col items-center gap-3">
      {/* In a disc of the artwork's own cream: `guide.webp` is opaque, so on a
          dark page it was a lit square. See MascotDisc. */}
      <MascotDisc src="/mascot/guide.webp" alt="FoodNote mascot" priority />
      {/* The wordmark: a page title, so it keeps the brand face. */}
      <p className="font-heading text-2xl font-semibold">FoodNote</p>
    </div>
  );
}
