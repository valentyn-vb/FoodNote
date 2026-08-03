// Matches what NumberFlow renders, so a spoken value and the visible digits
// cannot disagree. The locale is pinned rather than left to the browser: these
// components server-render, and a server whose locale differs from the visitor's
// would otherwise produce a hydration mismatch on every figure.
const NUMBER_FORMAT = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
});

/**
 * The accessible name of one figure. NumberFlow splits a number into per-digit
 * animated spans and exposes no accessible name, so a screen reader reads a
 * bare figure as a label followed by scattered digits. Every figure therefore
 * carries one `sr-only` string beside it with its visual copy `aria-hidden` —
 * which is also what makes the value assertable in a test without betting on an
 * animation library's internal markup.
 */
export function spokenStat(
  label: string,
  value: string | number,
  suffix = '',
): string {
  const shown = typeof value === 'string' ? value : NUMBER_FORMAT.format(value);
  return `${label}: ${shown}${suffix}`;
}

// REFLECT mascot: fullness mirrors intake (see design doc mascot table).
// Hungry under 50% of goal, halo while on budget, nervous sweat when over.
export function fullnessMascot(eatenKcal: number, goalKcal: number) {
  if (eatenKcal > goalKcal) return '/mascot/reassure.webp';
  if (eatenKcal < goalKcal * 0.5) return '/mascot/hungry.webp';
  return '/mascot/halo.webp';
}
