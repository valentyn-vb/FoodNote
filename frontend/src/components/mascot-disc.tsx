import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * The mascot shown large, as a medallion.
 *
 * `default.webp` and `guide.webp` are opaque squares whose ink runs to all four
 * edges — the ears sit 8% from the top, outside an inscribed circle — so a round
 * crop always eats something, and left square they put a lit rectangle on a dark
 * page. Instead the disc is painted in the artwork's own cream and the square is
 * inscribed in it (112 inside 160, since a square only fits a circle of its own
 * diagonal): the square's edges land on colour identical to their own and
 * disappear, leaving air around a drawing that is never cut.
 *
 * `--mascot-veil` dims disc and drawing together, so the two stay the same
 * colour and the square stays hidden — which is why the dark appearance changes
 * an opacity here rather than a second fill.
 *
 * The two sizes hold that 0.7 ratio between them, which is the whole point of
 * the component: a caller that picked its own pair would put the square's
 * corners back outside the disc, and the round crop that hides them is the one
 * that eats the ears. A caller may re-tint the disc through `className` — the
 * recover step washes it with `--destructive` — and the veil then dims the wash
 * and the drawing together, as before.
 */
const SIZES = {
  lg: { disc: 'size-40', image: 'size-28', px: 112 },
  md: { disc: 'size-30', image: 'size-21', px: 84 },
} as const;

export function MascotDisc({
  src,
  alt = '',
  size = 'lg',
  priority,
  className,
}: {
  src: string;
  /** Empty by default: beside a wordmark or a status line the mascot is decoration. */
  alt?: string;
  size?: keyof typeof SIZES;
  priority?: boolean;
  className?: string;
}) {
  const { disc, image, px } = SIZES[size];

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-mascot-canvas opacity-(--mascot-veil)',
        disc,
        className,
      )}
    >
      <Image
        src={src}
        alt={alt}
        width={px}
        height={px}
        priority={priority}
        className={image}
      />
    </div>
  );
}
