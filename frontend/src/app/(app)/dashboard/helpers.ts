// REFLECT mascot: fullness mirrors intake (see design doc mascot table).
// Hungry under 50% of goal, halo while on budget, nervous sweat when over.
export function fullnessMascot(eatenKcal: number, goalKcal: number) {
  if (eatenKcal > goalKcal) return '/mascot/reassure.webp';
  if (eatenKcal < goalKcal * 0.5) return '/mascot/hungry.webp';
  return '/mascot/halo.webp';
}
