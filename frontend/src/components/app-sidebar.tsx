'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ChevronsUpDownIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  NotebookTextIcon,
  UserRoundPenIcon,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { useAuth } from '@/components/auth-provider';
import { fullNameOf, initialsOf } from '@/lib/user-display';

// Navigation only. "Log a meal" and "Log weight" were menu items here; they are
// actions, not places, and as rows they went away with the collapsed rail. They
// live in AppHeader now, which is on every route at every rail state.
export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user: authUser, logout } = useAuth();
  const fullName = fullNameOf(authUser);
  const initials = initialsOf(authUser);

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <div className="hidden lg:contents">
      <Sidebar collapsible="icon">
        <SidebarHeader>
          {/* Collapsed, the rail is 3rem and SidebarHeader's own `p-2` leaves
              exactly the mascot's 32px — so the row drops its `px-4` there and
              centres, and the wordmark goes. With the padding kept, the logo
              was pushed past the edge and `overflow-hidden` cut it in half. */}
          <div className="flex h-18 items-center gap-2 overflow-hidden px-4 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
            <Image
              src="/mascot/default.webp"
              alt="FoodNote mascot"
              width={32}
              height={32}
              className="shrink-0 rounded-full"
            />
            <span className="truncate text-lg font-bold group-data-[collapsible=icon]:hidden">
              FoodNote
            </span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={pathname === '/dashboard'}
                    tooltip="Dashboard"
                    render={<Link href="/dashboard" />}
                  >
                    <LayoutDashboardIcon />
                    <span>Dashboard</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={pathname === '/meals'}
                    tooltip="Meals"
                    render={<Link href="/meals" />}
                  >
                    <NotebookTextIcon />
                    <span>Meals</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <SidebarMenuButton
                      size="lg"
                      className="bg-primary/5 border border-text-foreground h-14"
                    />
                  }
                >
                  <Avatar className="size-8">
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left">
                    <span className="truncate text-sm font-semibold">
                      {fullName}
                    </span>
                    <span className="truncate text-sm text-muted-foreground">
                      {authUser?.email}
                    </span>
                  </div>
                  <ChevronsUpDownIcon className="ml-auto size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="end">
                  <DropdownMenuItem render={<Link href="/profile" />}>
                    <UserRoundPenIcon />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOutIcon />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
    </div>
  );
}
