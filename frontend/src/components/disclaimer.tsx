import { cn } from '@/lib/utils';

// Ticket #41: shared copy for every estimate-showing surface.
export function Disclaimer({ className }: { className?: string }) {
  return (
    <span className={cn('text-sm text-muted-foreground', className)}>
      This is an estimate, not medical advice. Actual results vary.
    </span>
  );
}
