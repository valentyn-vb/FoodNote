import { cn } from '@/lib/utils';

/** Upstream `base-vega`, verbatim. A placeholder's radius is a call-site fact. */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  );
}

export { Skeleton };
