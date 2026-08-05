import { Mascot, type MascotSrc } from '@/components/mascot';
import { cn } from '@/lib/utils';

/**
 * The mascot shown large, as a medallion.
 *
 * `default.webp` and `guide.webp` are opaque squares — 0% transparent pixels, both
 * measured — and the drawing runs off the **bottom** edge of the frame: 92% of that
 * row is ink, while the other three edges are the artwork's own cream throughout.
 * So the square cannot be shown bare on any surface that is not exactly that
 * cream (on a dark page it was a lit rectangle), and it cannot be round-cropped
 * either: 13.6% of the ink lies outside an inscribed circle, and the topmost ink
 * is 5% of the height down.
 *
 * Instead the disc is painted in the cream itself — `--mascot-canvas` resolves to
 * `rgb(252,250,246)`, pixel-identical to the files, so there is no seam — and the
 * square is inscribed in it (112 inside 160, since a square only fits a circle of
 * its own diagonal): the square's edges land on colour identical to their own and
 * disappear, leaving air around a drawing that is never cut.
 *
 * Which is why the disc is not a workaround for a careless export. A transparent
 * re-export would not remove the need for it: strip the cream and the bottom bleed
 * becomes a hard horizontal cut with nothing behind it. Dropping the disc means
 * redrawing the art, not re-saving it.
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
 *
 * The inscribed size is a **width**, not a box. It was `size-21`, which for the
 * two square drawings is the same thing — and for `recover.webp`, which the meal
 * drawer frames here, was a 15% vertical stretch: 310×269 forced into 84×84.
 * `Mascot` keeps every drawing at its own ratio, so the one number below is the
 * only one the disc gets to decide.
 */
const SIZES = {
  lg: { disc: 'size-40', image: 'w-28' },
  md: { disc: 'size-30', image: 'w-21' },
} as const;

export function MascotDisc({
  src,
  alt = '',
  size = 'lg',
  priority,
  className,
}: {
  src: MascotSrc;
  /** Empty by default: beside a wordmark or a status line the mascot is decoration. */
  alt?: string;
  size?: keyof typeof SIZES;
  priority?: boolean;
  className?: string;
}) {
  const { disc, image } = SIZES[size];

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-mascot-canvas opacity-(--mascot-veil)',
        disc,
        className,
      )}
    >
      <Mascot src={src} alt={alt} priority={priority} className={image} />
    </div>
  );
}
