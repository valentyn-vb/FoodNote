import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * The round wash a mascot sits in while something happens — waiting, failing.
 * Two of these were built by hand with their own diameter and their own fill;
 * the tone is what differs, so the tone is the prop.
 */
const medallionVariants = cva(
  'flex shrink-0 items-center justify-center rounded-full',
  {
    variants: {
      tone: {
        brand: 'bg-accent',
        danger: 'bg-[color-mix(in_oklch,var(--destructive),var(--card)_90%)]',
      },
      size: {
        default: 'size-30',
        lg: 'size-33',
      },
    },
    defaultVariants: { tone: 'brand', size: 'default' },
  },
);

function Medallion({
  className,
  tone,
  size,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof medallionVariants>) {
  return (
    <div
      data-slot="medallion"
      className={cn(medallionVariants({ tone, size }), className)}
      {...props}
    />
  );
}

export { Medallion };
