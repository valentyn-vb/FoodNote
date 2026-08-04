'use client';

import { useEffect } from 'react';
import { MascotDisc } from '@/components/mascot-disc';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { AuthFormSkeleton } from './auth-form-skeleton';

/**
 * The form only renders once the session restore has settled as
 * unauthenticated — rendering it optimistically would flash the login form
 * at logged-in users before the redirect to the dashboard kicks in.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') router.replace('/dashboard');
  }, [status, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-10">
      <div className="flex flex-col items-center gap-3">
        {/* In a disc of the artwork's own cream: `guide.webp` is opaque, so on a
            dark page it was a lit square. See MascotDisc. */}
        <MascotDisc src="/mascot/guide.webp" alt="FoodNote mascot" priority />
        {/* The wordmark: a page title, so it keeps the brand face. */}
        <p className="font-heading text-2xl font-semibold">FoodNote</p>
      </div>
      <div className="w-full max-w-sm">
        {status === 'unauthenticated' ? children : <AuthFormSkeleton />}
      </div>
    </div>
  );
}
