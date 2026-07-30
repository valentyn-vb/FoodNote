import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * A determinate bar: how much of the day's budget is gone. The track and the
 * fill are both roles, so a call site passes a number and nothing else — the
 * five hand-built `h-2 bg-border` + `bg-primary` pairs it replaces each picked
 * their own height.
 */
const progressVariants = cva('shrink-0 overflow-hidden rounded-full bg-border', {
  variants: {
    size: {
      default: 'h-2',
      sm: 'h-1.5',
    },
  },
  defaultVariants: { size: 'default' },
});

function Progress({
  value,
  indeterminate,
  size,
  className,
  ...props
}: React.ComponentProps<'div'> &
  VariantProps<typeof progressVariants> & {
    /** 0–100. Clamped, because a day over budget still fills the bar once. */
    value?: number;
    /** A wait with no known duration — the bar sweeps instead of filling. */
    indeterminate?: boolean;
  }) {
  const pct = Math.max(0, Math.min(100, value ?? 0));

  return (
    <div
      data-slot="progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : Math.round(pct)}
      className={cn(progressVariants({ size }), className)}
      {...props}
    >
      {indeterminate ? (
        <div className="animate-indeterminate h-full w-full origin-left rounded-full bg-primary" />
      ) : (
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      )}
    </div>
  );
}

export { Progress };
