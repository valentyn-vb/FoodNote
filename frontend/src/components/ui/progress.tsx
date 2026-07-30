import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * A determinate bar: how much of the day's budget is gone. The track and the
 * fill are both roles, so a call site passes a number and nothing else — the
 * five hand-built `h-2 bg-track` + `bg-primary` pairs it replaces each picked
 * their own height.
 */
const progressVariants = cva('shrink-0 overflow-hidden rounded-full bg-track', {
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
  size,
  className,
  ...props
}: React.ComponentProps<'div'> &
  VariantProps<typeof progressVariants> & {
    /** 0–100. Clamped, because a day over budget still fills the bar once. */
    value: number;
  }) {
  const pct = Math.max(0, Math.min(100, value));

  return (
    <div
      data-slot="progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className={cn(progressVariants({ size }), className)}
      {...props}
    >
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export { Progress };
