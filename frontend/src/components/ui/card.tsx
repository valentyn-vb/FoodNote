import * as React from 'react';
import { cloneElement } from 'react';

import { cn } from '@/lib/utils';

/**
 * Upstream `base-vega`, with one divergence: the surface boundary is a
 * `border`, not upstream's `ring-1 ring-foreground/10`. A ring is reserved for
 * focus and invalid states — drawn the upstream way, a card and a focused card
 * are the same picture. Everything else, including `py-(--card-spacing)` and
 * the header/content/footer slots that depend on it, is as shipped.
 *
 * No variants. The five looks that used to live here are written at the call
 * site now: a tile is a line of utilities, a note is a wash and a radius.
 */
function Card({
  className,
  size = 'default',
  render,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  size?: 'default' | 'sm';
  render?: React.ReactElement<{ className?: string }>;
}) {
  const shared = {
    'data-slot': 'card',
    'data-size': size,
    className: cn(
      'group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-xl border border-border bg-card py-(--card-spacing) text-sm text-card-foreground shadow-xs [--card-spacing:--spacing(6)] has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(4)] *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl',
      className,
    ),
  };

  // `render` swaps the element without moving the look outside: a selectable
  // card has to be a <label> to make the whole surface click its radio, and
  // that is a semantic decision, not a visual one.
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
 * `font-semibold`, not upstream's `font-medium`: #97 found a *card* heading
 * (16/600) to be a different role from a *section* heading (14/600), and both
 * carry the weight. Upstream's `cn-font-heading` is dropped — this project has
 * no such class, and the brand face is applied explicitly at display scale.
 */
function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        'text-base leading-normal font-semibold group-data-[size=sm]/card:text-sm',
        className,
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-description"
      className={cn('text-sm text-muted-foreground', className)}
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
