'use client';

import { ShaderGradientCanvas, ShaderGradient } from '@shadergradient/react';
import { cn } from '@/lib/utils';

// Homepage only (ticket #58). Light-mode brand colors, not the library's
// dark-theme example defaults — colors are our --fn-primary/-secondary/-tertiary.
export function GradientMesh({ className }: { className?: string }) {
  return (
    <div className={cn('pointer-events-none absolute inset-0', className)}>
      <ShaderGradientCanvas
        style={{ width: '100%', height: '100%' }}
        pixelDensity={1}
        fov={45}
      >
        <ShaderGradient
          animate="on"
          type="plane"
          wireframe={false}
          shader="defaults"
          color1="#f5a65c"
          color2="#f4907e"
          color3="#5bb98c"
          brightness={1.1}
          grain="off"
          cAzimuthAngle={180}
          cPolarAngle={90}
          cDistance={1.2}
          cameraZoom={1}
          reflection={0.1}
          uAmplitude={0.4}
          uDensity={1.3}
          uFrequency={5.5}
          uSpeed={0.3}
          uStrength={1.2}
          positionX={0}
          positionY={0}
          positionZ={0}
          rotationX={0}
          rotationY={0}
          rotationZ={0}
        />
      </ShaderGradientCanvas>
    </div>
  );
}
