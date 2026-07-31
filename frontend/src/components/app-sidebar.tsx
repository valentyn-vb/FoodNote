'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ChevronsUpDown,
  LayoutDashboard,
  LogOut,
  NotebookText,
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
import { useMeals } from '@/lib/meals-context';
import { useWeight } from '@/lib/weight-context';
import { fullNameOf, initialsOf } from '@/lib/user-display';

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isToday } = useMeals();
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
                  <SidebarMenuButton
                    isActive={pathname === '/meals'}
                    tooltip="Meals"
                    render={
                      isToday ? <Link href="/meals" /> : <button disabled />
                    }
                    className={!isToday ? 'cursor-not-allowed opacity-40' : ''}
                  >
                    <NotebookText />
                    <span>Meals</span>
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
                    disabled={!isToday}
                    className={!isToday ? 'cursor-not-allowed opacity-40' : ''}
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
                      {fullName}
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
