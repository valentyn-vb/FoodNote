'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ChevronsUpDownIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  NotebookTextIcon,
  TrendingDownIcon,
  UserRoundPenIcon,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
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
  useSidebar,
} from '@/components/ui/sidebar';
import { useAuth } from '@/components/auth-provider';
import { WeightLogDrawer } from '@/components/weight-log-drawer';
import { useMeals } from '@/lib/meals-context';
import { useWeight } from '@/lib/weight-context';
import { fullNameOf, initialsOf } from '@/lib/user-display';

// Navigation, at every width: a rail or a panel from 768 up, a sheet below it.
// "Log a meal" and "Log weight" were menu items here; they are actions, not
// places, and as rows they went away with the collapsed rail. They live in
// AppHeader now — except that below 768 the header row has no space for "Log
// weight", so the sheet carries it back as a button rather than as a nav row.
export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user: authUser, logout } = useAuth();
  const { isMobile, setOpenMobile } = useSidebar();
  const { isToday } = useMeals();
  const { onWeightSaved } = useWeight();
  const fullName = fullNameOf(authUser);
  const initials = initialsOf(authUser);

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  // A sheet does not unmount on navigation, so following a link inside it has
  // to close it by hand. The rail and the panel stay put, as they should.
  function closeSheet() {
    if (isMobile) setOpenMobile(false);
  }

  return (
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
                  onClick={closeSheet}
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
                  onClick={closeSheet}
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
        {/* Only in the sheet: from 768 up "Log weight" is back in the header
            row, which has the width for it. A button, deliberately not a nav
            row — the sidebar's list is places, and this is an action. The sheet
            stays open behind the drawer: closing it would unmount the drawer
            with it. */}
        {isMobile && (
          <WeightLogDrawer
            mode="create"
            onWeightSaved={onWeightSaved}
            trigger={
              <Button variant="outline" size="lg" disabled={!isToday}>
                <TrendingDownIcon />
                Log weight
              </Button>
            }
          />
        )}
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
              {/* Beside the rail on a desktop; above the row in the sheet,
                  where "right" puts the menu outside the sheet entirely. */}
              <DropdownMenuContent
                side={isMobile ? 'top' : 'right'}
                align="end"
              >
                <DropdownMenuItem
                  onClick={closeSheet}
                  render={<Link href="/profile" />}
                >
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
  );
}
