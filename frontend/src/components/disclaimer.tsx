import { cn } from '@/lib/utils';

// Ticket #41: shared copy for every estimate-showing surface.
export function Disclaimer({ className }: { className?: string }) {
  return (
    <div className={cn('font-sans text-[11.5px] text-text-muted', className)}>
      This is an estimate, not medical advice. Actual results vary.
    </div>
  );
}
