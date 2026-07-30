import * as React from 'react';
import { Input as InputPrimitive } from '@base-ui/react/input';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * Size, surface and focus treatment live in the variant so a call site never
 * has to cancel a default — `field` *is* the app's form look, rather than the
 * base look with its height and focus ring undone.
 */
const inputVariants = cva(
  // Every variant keeps `text-base md:…`: 16px on mobile is a platform
  // constraint, not a choice — Safari zooms the page when a focused field's
  // text is smaller. It's also why the `body` level (15px) can't be used on a
  // field at all, and why <Text> doesn't apply to inputs.
  'w-full min-w-0 bg-card transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive',
  {
    variants: {
      variant: {
        default:
          'h-11 rounded-md border border-input px-2.5 py-1 text-base focus-visible:border-brand-ink focus-visible:ring-1 focus-visible:ring-brand-ink focus-visible:ring-inset focus-visible:shadow-focus-primary aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm',
        // The app's standard form field: hairline lift and a border-only focus
        // treatment instead of a ring.
        field:
          'h-11 rounded-md border border-border px-3.5 text-base shadow-hairline focus-visible:border-brand-ink focus-visible:ring-1 focus-visible:ring-brand-ink focus-visible:ring-inset focus-visible:shadow-focus-primary md:text-sm',
        // A compact cell inside a denser row — a parsed meal item.
        cell: 'h-9 rounded-sm border border-border px-2 text-center text-base tabular-nums focus-visible:border-brand-ink focus-visible:ring-1 focus-visible:ring-brand-ink focus-visible:ring-inset focus-visible:shadow-focus-primary md:text-caption',
        // Reads as text until focused — an item's name.
        bare: 'bg-transparent text-base font-medium focus-visible:underline md:text-label',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function Input({
  className,
  type,
  variant,
  onWheel,
  ...props
}: React.ComponentProps<'input'> & VariantProps<typeof inputVariants>) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      // A focused number input responds to the wheel, so scrolling a long form
      // with the cursor over one silently rewrites it. Blurring is the
      // narrowest fix, and it belongs here so no call site has to remember it.
      onWheel={(event) => {
        if (type === 'number') event.currentTarget.blur();
        onWheel?.(event);
      }}
      className={cn(inputVariants({ variant, className }))}
      {...props}
    />
  );
}

export { Input, inputVariants };
