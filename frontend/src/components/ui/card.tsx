import * as React from 'react';
import { cloneElement } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';
import { Text } from '@/components/ui/text';

/**
 * Surface, radius and elevation live in the variant, never in the base — so
 * `panel` and `tile` don't have to undo `default`'s ring and padding the way
 * the old CARD_CLASS constant did.
 */
const cardVariants = cva(
  'group/card flex flex-col gap-(--card-spacing) overflow-hidden text-sm text-card-foreground [--card-spacing:--spacing(6)] has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(4)] *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl',
  {
    variants: {
      variant: {
        // One surface boundary, one mechanism: `border`, never a ring. A ring is
        // reserved for focus and invalid states, so a card and a focused card
        // can't be drawn the same way.
        default:
          'rounded-xl border border-border bg-card py-(--card-spacing) shadow-xs',
        // The app's standard content surface: hairline border and padding
        // supplied by the call site.
        panel: 'rounded-xl border border-border bg-card shadow-card',
        // A compact stat tile — self-padding, tighter radius and gap.
        tile: 'gap-1.5 rounded-lg border border-border bg-card px-4.5 py-4 shadow-hairline',
        // One line of a list: a fixed-height surface that never flexes, because
        // inside a bounded scrolling column a row would squash before the column
        // scrolled. Tighter radius than `panel` — 20px on a 64px row reads as a
        // pill.
        row: 'shrink-0 flex-row items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-3.5 shadow-card',
        // A tile you choose between: same surface, plus a selected state driven
        // by `data-selected` on the call site. The border keeps its width and
        // only changes colour — thickening it on selection shifts the content
        // half a pixel in every direction, which reads as a twitch.
        option:
          'gap-1.5 rounded-lg border border-border bg-card px-4.5 py-4 shadow-hairline transition-colors duration-150 data-selected:border-brand data-selected:bg-brand-softer',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

/**
 * `render` swaps the element without moving the look outside: a selectable card
 * has to be a <label> to make the whole surface click its radio, and that is a
 * semantic decision, not a visual one.
 */
function Card({
  className,
  size = 'default',
  variant = 'default',
  render,
  children,
  ...props
}: React.ComponentProps<'div'> &
  VariantProps<typeof cardVariants> & {
    size?: 'default' | 'sm';
    render?: React.ReactElement<{ className?: string }>;
  }) {
  const shared = {
    'data-slot': 'card',
    'data-size': size,
    className: cn(cardVariants({ variant, className })),
  };

  if (render) {
    return cloneElement(render, { ...shared, ...props }, children);
  }

  return (
    <div {...shared} {...props}>
      {children}
    </div>
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        'group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)',
        className,
      )}
      {...props}
    />
  );
}

/**
 * Renders a <Text> level rather than its own font rules, so the heading face
 * is declared in one place instead of two. A small card drops a level rather
 * than shrinking the same one.
 */
function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <Text
      data-slot="card-title"
      variant="heading"
      render={<div />}
      className={cn('group-data-[size=sm]/card:text-title', className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <Text
      data-slot="card-description"
      variant="caption"
      tone="muted"
      render={<div />}
      className={className}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        'col-start-2 row-span-2 row-start-1 self-start justify-self-end',
        className,
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-content"
      className={cn('px-(--card-spacing)', className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        'flex items-center rounded-b-xl px-(--card-spacing) [.border-t]:pt-(--card-spacing)',
        className,
      )}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
