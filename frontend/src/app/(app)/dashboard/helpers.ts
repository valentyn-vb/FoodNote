export const CARD_CLASS =
  'rounded-lg border border-border bg-surface shadow-[0_1px_3px_#0000000a] ring-0 py-0';
export const STAT_TILE_CLASS =
  'grow basis-0 gap-1.5 rounded-md border border-border bg-surface px-4.5 py-4 shadow-[0_1px_2px_#00000008] ring-0';

// REFLECT mascot: fullness mirrors intake (see design doc mascot table).
// Hungry under 50% of goal, halo while on budget, nervous sweat when over.
export function fullnessMascot(eatenKcal: number, goalKcal: number) {
  if (eatenKcal > goalKcal) return '/mascot/reassure.webp';
  if (eatenKcal < goalKcal * 0.5) return '/mascot/hungry.webp';
  return '/mascot/halo.webp';
}
