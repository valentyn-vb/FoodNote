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
  'w-full min-w-0 bg-transparent transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive dark:bg-input/30 dark:aria-invalid:border-destructive/50',
  {
    variants: {
      variant: {
        default:
          'h-9 rounded-md border border-input px-2.5 py-1 text-base focus-visible:border-primary focus-visible:shadow-focus-primary aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:aria-invalid:ring-destructive/40',
        // The app's standard form field: taller touch target, hairline lift,
        // and a border-only focus treatment instead of a ring.
        field:
          'h-11.5 rounded-md border border-border bg-surface px-3.5 font-sans text-[14.5px] text-text shadow-hairline focus-visible:border-primary focus-visible:shadow-focus-primary',
        // A compact cell inside a denser row — a parsed meal item.
        cell: 'h-8.5 rounded-sm border border-border px-2 text-center font-sans text-[12.5px] text-text tabular-nums focus-visible:border-primary focus-visible:shadow-focus-primary',
        // Reads as text until focused — an item's name.
        bare: 'font-sans text-label font-medium text-text focus-visible:underline',
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
