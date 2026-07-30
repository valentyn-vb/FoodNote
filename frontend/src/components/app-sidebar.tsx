'use client';

import { useState } from 'react';
import { Text } from '@/components/ui/text';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ChevronsUpDown,
  LayoutDashboard,
  LogOut,
  Scale,
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
import { WeightDrawer } from '@/components/weight-drawer';
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
import { useWeight } from '@/lib/weight-context';
import { fullNameOf, initialsOf } from '@/lib/user-display';
import { notImplemented } from '@/lib/not-implemented';

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { onWeightSaved } = useWeight();
  // The drawers run controlled here so each menu item can be a real
  // SidebarMenuButton — same look as the nav links, and it keeps the
  // collapsed-mode tooltip a hand-rolled trigger would have lost.
  const [mealDrawerOpen, setMealDrawerOpen] = useState(false);
  const [weightDrawerOpen, setWeightDrawerOpen] = useState(false);
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
          <div className="flex h-8 items-center gap-2 overflow-hidden px-1">
            <Image
              src="/mascot/defaultlogo.png"
              alt="FoodNote mascot"
              width={26}
              height={26}
              className="shrink-0"
            />
            <Text variant="title" className="truncate">
              FoodNote
            </Text>
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
                  <SidebarMenuButton
                    tooltip="Log a meal"
                    onClick={() => setMealDrawerOpen(true)}
                  >
                    <UtensilsCrossed />
                    <span>Log a meal</span>
                  </SidebarMenuButton>
                  <MealLogDrawer
                    open={mealDrawerOpen}
                    onOpenChange={setMealDrawerOpen}
                  />
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip="Log weight"
                    onClick={() => setWeightDrawerOpen(true)}
                  >
                    <Scale />
                    <span>Log weight</span>
                  </SidebarMenuButton>
                  <WeightDrawer
                    mode="create"
                    onWeightSaved={onWeightSaved}
                    open={weightDrawerOpen}
                    onOpenChange={setWeightDrawerOpen}
                  />
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger render={<SidebarMenuButton size="lg" />}>
                  <Avatar className="size-8">
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left">
                    <Text variant="label" className="truncate">
                      {fullName}
                    </Text>
                    <Text variant="caption" tone="muted" className="truncate">
                      {authUser?.email}
                    </Text>
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
