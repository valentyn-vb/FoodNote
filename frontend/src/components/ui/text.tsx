import { cloneElement } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * The only way text gets its type outside `ui/`. A level sets size,
 * line-height, weight and family at once — `variant` is not a size, which is
 * why there is no `size` prop to combine with it.
 *
 * `tone` is separate on purpose: the prototype behind ticket 04 found `label`
 * used both plain and muted on the same screen, so colour can't ride along
 * inside the level.
 *
 * Sizes, line-heights and weights come from `@theme`; only the display family
 * is added here, because a font family isn't part of a --text-* token.
 */
const textVariants = cva('', {
  variants: {
    variant: {
      overline: 'text-overline uppercase',
      caption: 'text-caption',
      body: 'text-body',
      label: 'text-label',
      title: 'text-title',
      heading: 'font-heading text-heading',
      display: 'font-heading text-display',
    },
    tone: {
      default: 'text-foreground',
      muted: 'text-muted-foreground',
      onFill: 'text-primary-foreground',
      danger: 'text-destructive-text',
      // The brand hue dark enough to read as text — an emphasized figure, a
      // link, the active item. Anything lighter measured under 3:1.
      brand: 'text-brand-ink',
      // "On plan" and "over target": the wash's own text weights, which clear
      // 4.5:1 where the fill colours reach only ~3:1.
      success: 'text-success-text',
    },
    // Proportional digits jitter as a counter animates; every NumberFlow value
    // and every figure in a stat column wants this.
    numeric: {
      true: 'tabular-nums',
      false: '',
    },
  },
  defaultVariants: {
    variant: 'body',
    tone: 'default',
    numeric: false,
  },
});

/**
 * `render` takes the element to render as, rather than a tag name, so the call
 * site keeps its own props and ref on it: `render={<h1 id="…" />}`. Reach for
 * it whenever the level and the heading rank disagree — they usually do.
 */
function Text({
  className,
  variant,
  tone,
  numeric,
  render,
  children,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof textVariants> & {
    render?: React.ReactElement<{ className?: string }>;
  }) {
  const classes = cn(textVariants({ variant, tone, numeric }), className);

  if (render) {
    return cloneElement(render, { ...props, className: classes }, children);
  }

  return (
    <span data-slot="text" className={classes} {...props}>
      {children}
    </span>
  );
}

export { Text, textVariants };
