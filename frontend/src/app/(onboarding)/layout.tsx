'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/components/auth-provider';

// Auth-only wrapper for the onboarding flow. Mirrors the auth check in
// (app)/layout.tsx, but deliberately omits both the sidebar shell and the
// onboarding-complete gate: onboarding is a focused, full-screen flow, and
// applying the "must be onboarded" redirect here would loop forever (the gate
// bounces incomplete users *to* /onboarding).
//
// TODO(onboarding-forms): once GET /goals/current ships, optionally bounce an
// already-onboarded user who lands here back to /dashboard.
export default function OnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
  }, [status, router]);

  if (status !== 'authenticated') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" tone="muted" />
      </div>
    );
  }

  return <main className="min-h-screen">{children}</main>;
}
