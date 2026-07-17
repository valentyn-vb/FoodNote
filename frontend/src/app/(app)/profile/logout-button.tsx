'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth-provider';

// Client-side island (same pattern as NotImplementedButton) so the profile
// page stays a server component. On mobile this is the only logout — the
// sidebar and its user menu are desktop-only.
export function LogoutButton({
  variant,
  className,
  children,
}: {
  variant?: React.ComponentProps<typeof Button>['variant'];
  className?: string;
  children: React.ReactNode;
}) {
  const { logout } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <Button variant={variant} className={className} onClick={handleLogout}>
      {children}
    </Button>
  );
}
