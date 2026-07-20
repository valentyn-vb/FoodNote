'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ChevronsUpDown,
  LayoutDashboard,
  LogOut,
  Scale,
  Settings,
  UserRoundPen,
  UtensilsCrossed,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MealLogDrawer } from '@/components/meal-log-drawer';
import { WeightLogDrawer } from '@/components/weight-log-drawer';
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
import { useMeals } from '@/lib/meals-context';
import { mockUserProfile } from '@/lib/mock-data';
import { notImplemented } from '@/lib/not-implemented';

// Mirrors SidebarMenuButton's look (incl. icon-collapsed mode via the root
// `group` data attributes) for the one item that must be a DrawerTrigger.
// Hover tooltip in collapsed mode is the one nicety it lacks.
const DRAWER_TRIGGER_CLASS =
  'flex h-8 w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! [&>svg]:size-4 [&>svg]:shrink-0 [&>span]:truncate';

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { onMealSaved, onMealUndone } = useMeals();
  // Session identity (email, logout) comes from auth; name/initials are
  // still the mock profile until the profile API exists.
  const { user: authUser, logout } = useAuth();
  const user = mockUserProfile;
  const initials = user.name
    .split(' ')
    .map((part) => part[0])
    .join('');

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <div className="hidden lg:contents">
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex h-8 items-center gap-2 overflow-hidden px-1">
            <Image
              src="/mascot/defaultlogo.png"
              alt="FoodNote mascot"
              width={26}
              height={26}
              className="shrink-0 rounded-full ring-1 ring-border"
            />
            <span className="truncate font-display text-body font-semibold text-text">
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
                    <LayoutDashboard />
                    <span>Dashboard</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <MealLogDrawer
                    onMealSaved={onMealSaved}
                    onMealUndone={onMealUndone}
                    triggerClassName={DRAWER_TRIGGER_CLASS}
                  >
                    <UtensilsCrossed />
                    <span>Log a meal</span>
                  </MealLogDrawer>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <WeightLogDrawer triggerClassName={DRAWER_TRIGGER_CLASS}>
                    <Scale />
                    <span>Log weight</span>
                  </WeightLogDrawer>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip="Settings"
                    onClick={() => notImplemented('Settings')}
                  >
                    <Settings />
                    <span>Settings</span>
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
                      className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
                    />
                  }
                >
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-primary text-caption text-surface">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left leading-tight">
                    <span className="truncate font-sans text-label font-semibold">
                      {user.name}
                    </span>
                    <span className="truncate font-sans text-[11.5px] text-text-muted">
                      {authUser?.email}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="end" className="w-48">
                  <DropdownMenuItem render={<Link href="/profile" />}>
                    <UserRoundPen />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut />
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
