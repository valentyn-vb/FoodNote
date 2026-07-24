import { cn } from '@/lib/utils';

// Homepage only (ticket #58). Light-mode brand colors via the `.gradient-mesh`
// utility in globals.css — a pure-CSS, GPU-composited replacement for the
// former @shadergradient/react WebGL canvas. No client JS, no WebGL context,
// no three.js: this is a server component. Colors are our
// --fn-primary/-secondary/-tertiary, matching the shader it replaced.
export function GradientMesh({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'gradient-mesh pointer-events-none absolute inset-0',
        className,
      )}
    />
  );
}
