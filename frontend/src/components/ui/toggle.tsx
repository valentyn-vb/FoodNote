'use client';

import { Toggle as TogglePrimitive } from '@base-ui/react/toggle';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const toggleVariants = cva(
  // The pressed look lives in the variants, not the base, so `option` can
  // state its own without fighting a neutral one it inherited.
  "group/toggle inline-flex items-center justify-center gap-1 rounded-md text-sm font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow] outline-none focus-visible:border-primary focus-visible:shadow-focus-primary disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          'bg-transparent hover:bg-muted hover:text-foreground data-pressed:bg-muted',
        outline:
          'border border-input bg-transparent shadow-xs hover:bg-muted hover:text-foreground data-pressed:bg-muted',
        // One choice among a few, each reading as its own option rather than as
        // a pressed button — gender, meal type, a pace. Selection is on
        // `data-pressed`, which is the attribute Base UI actually emits; the
        // border keeps its width and only changes colour, so choosing an option
        // doesn't nudge it half a pixel in every direction.
        option:
          'border border-border bg-card text-muted-foreground hover:border-primary/40 data-pressed:border-primary data-pressed:bg-brand-soft data-pressed:font-semibold data-pressed:text-foreground',
      },
      size: {
        default:
          'h-9 min-w-9 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        sm: 'h-8 min-w-8 px-2.5 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5',
        lg: 'h-10 min-w-10 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Toggle({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: TogglePrimitive.Props & VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Toggle, toggleVariants };
