'use client';

import { cn } from '@/lib/utils';

// Homepage only (ticket #58). Light-mode brand colors (--fn-primary/-secondary/-tertiary).
// Uses a GPU-composited CSS mesh gradient instead of heavy WebGL canvas for 60fps scroll performance.
export function GradientMesh({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden opacity-70',
        className,
      )}
    >
      <div className="absolute -top-[30%] -left-[20%] h-[160%] w-[140%] animate-[spin_20s_linear_infinite] filter blur-[90px] will-change-transform">
        <div className="absolute top-[20%] left-[20%] h-[55%] w-[55%] rounded-full bg-[#f5a65c]/45 mix-blend-multiply" />
        <div className="absolute top-[25%] right-[15%] h-[50%] w-[50%] rounded-full bg-[#f4907e]/40 mix-blend-multiply" />
        <div className="absolute bottom-[15%] left-[25%] h-[55%] w-[55%] rounded-full bg-[#5bb98c]/40 mix-blend-multiply" />
      </div>
    </div>
  );
}
