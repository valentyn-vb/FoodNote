import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Stock `twMerge`, and it stays stock. It used to be `extendTailwindMerge` with
 * the seven semantic levels registered as font sizes, because `text-*` is two
 * class groups at once — size (`text-sm`) and colour (`text-muted-foreground`) —
 * which tailwind-merge tells apart from a built-in list of size keys. A
 * theme-defined `text-heading` was not on that list, so it was filed as a
 * colour, collided with the colour beside it, and the later one won: every
 * level silently rendered at the inherited size. That is a large part of why
 * call sites had reached for `text-[15px]` — an arbitrary value *is* recognised
 * as a size, so it was the only thing that stuck.
 *
 * With the scale gone (#111), every size in the app is one tailwind-merge
 * already knows. Adding a level back means teaching it here again — which is
 * the cost the stock row exists to avoid.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Plain onMouseEnter/onMouseLeave (unlike Motion's whileHover, which already
// ignores touch) can fire from a tap on some mobile browsers with no
// matching mouseleave, leaving a hover-triggered animation stuck mid-play.
// Gate imperative hover handlers with this before starting one.
export function supportsHover(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches
  );
}

export function formatGoalDate(date: string | null): string {
  if (!date) return 'Target already reached';
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
