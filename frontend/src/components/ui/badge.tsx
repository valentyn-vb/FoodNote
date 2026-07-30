import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  // rounded-full, not a large radius: a pill's radius is its own height, and
  // the previous rounded-4xl was a token away from turning square.
  'group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-caption font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&>svg]:pointer-events-none [&>svg]:size-3!',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground [a]:hover:bg-primary/80',
        secondary:
          'bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80',
        destructive:
          'bg-[color-mix(in_oklch,var(--destructive),var(--card)_90%)] text-destructive-text focus-visible:ring-destructive/20 [a]:hover:bg-[color-mix(in_oklch,var(--destructive),var(--card)_70%)]',
        // The two states the product actually labels: on plan, and worth a
        // second look. Text is the wash's own dark weight, not the brand hue —
        // the brand greens and oranges don't clear 4.5:1 as text.
        success:
          'bg-[color-mix(in_oklch,var(--success),var(--card)_90%)] text-success-text [a]:hover:bg-[color-mix(in_oklch,var(--success),var(--card)_70%)]',
        warning:
          'bg-[color-mix(in_oklch,var(--warning),var(--card)_90%)] text-warning-text [a]:hover:bg-[color-mix(in_oklch,var(--warning),var(--card)_70%)]',
        outline:
          'border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground',
        ghost: 'hover:bg-muted hover:text-muted-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function Badge({
  className,
  variant = 'default',
  render,
  ...props
}: useRender.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: 'span',
    props: mergeProps<'span'>(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props,
    ),
    render,
    state: {
      slot: 'badge',
      variant,
    },
  });
}

export { Badge, badgeVariants };
