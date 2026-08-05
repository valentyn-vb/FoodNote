import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * The mascot drawings, and the size each one was actually drawn at.
 *
 * There are two shapes, and conflating them is the bug this table exists to
 * prevent: the six expressions are 310×269, while the two that go in a disc are
 * square. Every call site used to declare a square — `width={56} height={56}` for
 * a drawing that paints 56×49 — so the browser reserved a box the image never
 * filled and the line beneath it moved when the image landed. `MascotDisc` did
 * worse: it set both sides, which silences the warning and stretches the drawing
 * 15% instead.
 *
 * Keyed by path because the path is already the identity — `fullnessMascot()`
 * picks one at runtime from the day's intake. `MascotSrc` is the union of these
 * keys, so a mascot added to `public/` without a size here does not compile.
 */
const EXPRESSION = { width: 310, height: 269 } as const;

export const MASCOT_SIZE = {
  '/mascot/accompany.webp': EXPRESSION,
  '/mascot/celebrate.webp': EXPRESSION,
  '/mascot/halo.webp': EXPRESSION,
  '/mascot/hungry.webp': EXPRESSION,
  '/mascot/reassure.webp': EXPRESSION,
  '/mascot/recover.webp': EXPRESSION,
  // The two the disc frames, square by design — their ink runs to all four edges
  // (see `MascotDisc`, which is why they are framed rather than cropped).
  '/mascot/default.webp': { width: 1254, height: 1254 },
  '/mascot/guide.webp': { width: 512, height: 512 },
} as const satisfies Record<string, { width: number; height: number }>;

export type MascotSrc = keyof typeof MASCOT_SIZE;

export function Mascot({
  src,
  alt = '',
  className,
  priority,
}: {
  src: MascotSrc;
  /** Empty by default: the expression restates the copy it sits beside. */
  alt?: string;
  /** The drawn width, as a `w-*` utility — the height comes from the ratio. */
  className?: string;
  priority?: boolean;
}) {
  const { width, height } = MASCOT_SIZE[src];

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      // Declared rather than inherited from Tailwind's preflight: the warning
      // this avoids is raised precisely when one dimension is left for CSS to
      // decide and the other is not. A caller therefore sets the width only.
      className={cn('h-auto', className)}
    />
  );
}
