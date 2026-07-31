import * as React from 'react';
import { Input as InputPrimitive } from '@base-ui/react/input';

import { cn } from '@/lib/utils';

/**
 * Upstream `base-vega`, with one divergence: `h-11` (44px) against upstream's
 * `h-9`. A thumb-target argument, not a style one — recorded in ADR 0010.
 *
 * `text-base md:text-sm` is upstream's and stays exactly as shipped, for a
 * reason worth knowing: 16px on mobile is a platform constraint, not a choice.
 * Safari zooms the page when a focused field's text is smaller.
 */
function Input({
  className,
  type,
  onWheel,
  ...props
}: React.ComponentProps<'input'>) {
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
      className={cn(
        'h-11 w-full min-w-0 rounded-md border border-input bg-transparent px-2.5 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
