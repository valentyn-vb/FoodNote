import { cn } from '@/lib/utils';

// Homepage only (ticket #58). Light-mode brand colors via the `.gradient-mesh`
// utility in globals.css — a pure-CSS, GPU-composited replacement for the
// former @shadergradient/react WebGL canvas. No client JS, no WebGL context,
// no three.js: this is a server component. The colours are the decorative brand
// tokens (--brand, --brand-mint, --brand-coral), which keep the shader's own
// hues — the semantic --success and --warning are darkened for contrast and
// would dim the mesh.
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
