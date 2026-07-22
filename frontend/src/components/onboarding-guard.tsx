'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useOnboardingStatus } from '@/lib/use-onboarding-status';

// Gates the (app) group on onboarding completion. Assumes the caller has
// already confirmed auth === 'authenticated' — this only mounts inside
// (app)/layout.tsx, after its auth check. A not-onboarded user is sent to
// /onboarding; because the onboarding pages live in the (onboarding) group they
// are never wrapped by this guard, so the redirect can't loop.
export function OnboardingGuard({ children }: { children: ReactNode }) {
  const status = useOnboardingStatus();
  const router = useRouter();

  useEffect(() => {
    if (status === 'not-onboarded') router.replace('/onboarding');
  }, [status, router]);

  if (status !== 'onboarded') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-text-muted" />
      </div>
    );
  }

  return <>{children}</>;
}
