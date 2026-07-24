import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

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
