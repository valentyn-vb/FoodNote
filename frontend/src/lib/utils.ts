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

/**
 * A Pace for display: at most two decimals, trailing zeros dropped.
 *
 * A manual plan's rate is derived from calories and stored at four decimals so the
 * budget the user typed round-trips exactly (ADR-0009) — but "0.6855 kg / week" is
 * false precision on screen. Rounding here and not at the source keeps the
 * calories, which are what the user actually chose, exact. Presets are unaffected:
 * 0.25 / 0.5 / 0.75 / 1 render as they always did.
 */
export function formatPace(pace: number): string {
  return String(Math.round(pace * 100) / 100);
}

export function formatGoalDate(date: string | null): string {
  if (!date) return 'Target already reached';
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
