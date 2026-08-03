import { Loader2Icon } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * A busy indicator. `tone="muted"` is the standalone case — a page or panel
 * waiting on its first load; the default inherits the surrounding colour, which
 * is what you want inside a button.
 *
 * The spin is exempt from the app-wide reduced-motion collapse (see the note in
 * globals.css): a busy indicator that stops moving reads as a frozen app, not
 * as a calm one.
 */
const spinnerVariants = cva('animate-spin', {
  variants: {
    size: {
      default: 'size-4',
      lg: 'size-6',
    },
    tone: {
      default: '',
      muted: 'text-muted-foreground',
    },
  },
  defaultVariants: {
    size: 'default',
    tone: 'default',
  },
});

function Spinner({
  className,
  size,
  tone,
  ...props
}: React.ComponentProps<typeof Loader2Icon> &
  VariantProps<typeof spinnerVariants>) {
  return (
    <Loader2Icon
      data-slot="spinner"
      aria-hidden="true"
      className={cn(spinnerVariants({ size, tone }), className)}
      {...props}
    />
  );
}

export { Spinner, spinnerVariants };
