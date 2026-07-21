'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { useAuth } from '@/components/auth-provider';
import { OnboardingGuard } from '@/components/onboarding-guard';
import { MealsProvider } from '@/lib/meals-context';

// Every page in the (app) group requires a session: while AuthProvider is
// restoring one (refresh cookie → access token) we show a loader; once the
// status settles as unauthenticated we bounce to /login.
//
// Once authenticated, this is the shared shell for the app routes. Mobile
// gets none of the chrome — AppSidebar and SidebarInset only activate at
// lg+, each route's own `lg:hidden` block still owns the mobile layout.
// MealsProvider lives here (not in the dashboard page) so the sidebar's
// "Log a meal" trigger shares the same state as the dashboard's numbers.
export default function AppLayout({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
  }, [status, router]);

  if (status !== 'authenticated') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-text-muted" />
      </div>
    );
  }

  return (
    <OnboardingGuard>
      <SidebarProvider className="lg:min-h-screen">
        <MealsProvider>
          <AppSidebar />
          <SidebarInset className="bg-bg">{children}</SidebarInset>
        </MealsProvider>
      </SidebarProvider>
    </OnboardingGuard>
  );
}
