'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';

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
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-4 py-10">
      <div className="flex flex-col items-center gap-3">
        <Image
          src="/mascot/guide.webp"
          alt="FoodNote mascot"
          width={112}
          height={112}
          priority
        />
        <div className="font-display text-2xl font-semibold text-text">
          FoodNote
        </div>
      </div>
      <div className="w-full max-w-sm">
        {status === 'unauthenticated' ? (
          children
        ) : (
          <div className="flex justify-center py-12">
            <Loader2 className="size-6 animate-spin text-text-muted" />
          </div>
        )}
      </div>
    </div>
  );
}
