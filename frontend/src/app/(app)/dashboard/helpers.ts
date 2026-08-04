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

/**
 * A figure in running text, grouped the way NumberFlow groups it. Static copy
 * next to an animated figure has to agree with it on separators, or "2,156
 * kcal left" ends up over "2156 kcal/day" on the card beside it.
 */
export function formatFigure(value: number): string {
  return NUMBER_FORMAT.format(value);
}

/**
 * The remaining budget as it is shown: a magnitude, the phrase that carries the
 * sign, and the spoken name. `remainingKcal` is signed, and going over turns one
 * number into three separate copy decisions — which had already drifted across
 * the two blocks that show it ("kcal left" against "kcal remaining"), and left
 * the signed value in one spoken name, so a screen reader announced
 * "−200 kcal left" where the screen read "200 kcal over".
 */
export function remainingStat(
  remainingKcal: number,
  label = 'Remaining',
): { magnitude: number; unit: string; spoken: string } {
  const magnitude = Math.abs(remainingKcal);
  const unit = remainingKcal < 0 ? 'kcal over' : 'kcal left';
  return { magnitude, unit, spoken: spokenStat(label, magnitude, ` ${unit}`) };
}

// REFLECT mascot: fullness mirrors intake (see design doc mascot table).
// Hungry under 50% of goal, halo while on budget, nervous sweat when over.
export function fullnessMascot(eatenKcal: number, goalKcal: number) {
  if (eatenKcal > goalKcal) return '/mascot/reassure.webp';
  if (eatenKcal < goalKcal * 0.5) return '/mascot/hungry.webp';
  return '/mascot/halo.webp';
}
