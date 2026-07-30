'use client';

import { useRouter } from 'next/navigation';
import { Text } from '@/components/ui/text';
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
      <DropdownMenuTrigger aria-label="Account menu">
        <Avatar>
          <AvatarFallback>
            {initialsOf(user) || user?.email[0]?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[160px]">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="max-w-56">
            {fullName && (
              <Text variant="label" className="block truncate">
                {fullName}
              </Text>
            )}
            <Text variant="caption" tone="muted" className="block truncate">
              {user?.email}
            </Text>
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
