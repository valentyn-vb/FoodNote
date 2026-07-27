'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/components/auth-provider';
import { fullNameOf, initialsOf } from '@/lib/user-display';

export function UserMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const fullName = fullNameOf(user);

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Avatar>
          <AvatarFallback className="bg-primary text-surface">
            {initialsOf(user) || user?.email[0]?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[160px]">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="max-w-56 font-normal">
            {fullName && (
              <span className="block truncate font-medium text-text">
                {fullName}
              </span>
            )}
            <span className="block truncate font-normal text-text-muted">
              {user?.email}
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
