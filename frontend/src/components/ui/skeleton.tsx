import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * `shape` exists so a call site can say what it is standing in for — a circle
 * for the gauge, a panel for a card-sized block — without writing a radius of
 * its own. The placeholder should match the thing it replaces.
 */
const skeletonVariants = cva('animate-pulse bg-muted', {
  variants: {
    shape: {
      default: 'rounded-md',
      panel: 'rounded-xl',
      pill: 'rounded-full',
      circle: 'rounded-full',
    },
  },
  defaultVariants: { shape: 'default' },
});

function Skeleton({
  className,
  shape,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof skeletonVariants>) {
  return (
    <div
      data-slot="skeleton"
      className={cn(skeletonVariants({ shape }), className)}
      {...props}
    />
  );
}

export { Skeleton };
