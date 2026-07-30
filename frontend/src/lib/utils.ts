import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * tailwind-merge has to be told about the type scale, or it silently eats it.
 *
 * `text-*` is two class groups at once — font size (`text-sm`) and text colour
 * (`text-muted-foreground`) — and tailwind-merge tells them apart from its
 * built-in list of size keys. A theme-defined level like `text-heading` isn't on
 * that list, so it gets filed as a colour, collides with the actual colour class
 * beside it, and the later one wins: `cn('text-heading', 'text-foreground')`
 * returned just `text-foreground`, and every level rendered at the inherited
 * size. It bit the Paper scale before this rewrite too, which is a large part of
 * why call sites reached for `text-[15px]` — an arbitrary value *is* recognised
 * as a size, so it was the only thing that stuck.
 *
 * Registering the six levels as font sizes fixes size and colour composing, and
 * keeps `cn('text-title', 'text-heading')` collapsing to one size, which is the
 * whole point of merging.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            'overline',
            'caption',
            'body',
            'label',
            'title',
            'heading',
            'display',
          ],
        },
      ],
    },
  },
});

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
