'use client';

import { Button } from '@/components/ui/button';
import { notImplemented } from '@/lib/not-implemented';

// Client-side island for stub actions, so pages that only need a "not wired
// up yet" toast can stay server components.
export function NotImplementedButton({
  action,
  variant,
  className,
  children,
}: {
  action: string;
  variant?: React.ComponentProps<typeof Button>['variant'];
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant={variant}
      className={className}
      onClick={() => notImplemented(action)}
    >
      {children}
    </Button>
  );
}
