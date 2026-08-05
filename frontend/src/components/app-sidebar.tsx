'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ChevronsUpDownIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  NotebookTextIcon,
  PaletteIcon,
  TrendingDownIcon,
  UserRoundPenIcon,
} from 'lucide-react';
import type { Appearance } from '@foodnote/shared';
import { useAppearance } from '@/components/appearance-provider';
import { APPEARANCE_OPTIONS } from '@/components/appearance-options';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
import { LogWeightAction } from '@/components/log-weight-action';
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
  const { appearance, setAppearance } = useAppearance();
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
        {/* AppHeader's `h-16 lg:h-18`, less SidebarHeader's own `p-2` — so the
            wordmark and the route title sit on one line and this row ends where
            the header's border does. Both sides now name the same two
            utilities instead of each summing its own paddings.
            Collapsed, the rail is 3rem and that `p-2` leaves exactly the
            mascot's 32px — so the row drops its `px-4` there and centres, and
            the wordmark goes. With the padding kept, the logo was pushed past
            the edge and `overflow-hidden` cut it in half. */}
        <div className="flex h-12 items-center gap-2 overflow-hidden px-4 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 lg:h-14">
          <Image
            src="/mascot/default.webp"
            alt="FoodNote mascot"
            width={32}
            height={32}
            className="size-8 shrink-0 rounded-full"
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
              {/* A place, unlike "Log weight" above it in the header — that one
                  opens a drawer and stays an action. This is the journal itself,
                  at any range. */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={pathname === '/weights'}
                  tooltip="Weights"
                  onClick={closeSheet}
                  render={<Link href="/weights" />}
                >
                  <TrendingDownIcon />
                  <span>Weights</span>
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
        {isMobile && <LogWeightAction />}
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  // Collapsed, the row is the avatar and nothing else: the
                  // frame and the fill go with it. Upstream shrinks the button
                  // to size-8, which is the avatar's own size, so a rectangular
                  // border around it clipped the circle against `rounded-sm`
                  // and read as a half-round shape under the face.
                  <SidebarMenuButton
                    size="lg"
                    className="h-14 border border-text-foreground bg-primary/5 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent"
                  />
                }
              >
                <Avatar className="size-8">
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                {/* Hidden rather than left to collapse to zero width: as flex
                    children they still took a share of a 32px row and pushed
                    the avatar off its centre. */}
                <div className="grid flex-1 text-left group-data-[collapsible=icon]:hidden">
                  <span className="truncate text-sm font-semibold">
                    {fullName}
                  </span>
                  <span className="truncate text-sm text-muted-foreground">
                    {authUser?.email}
                  </span>
                </div>
                <ChevronsUpDownIcon className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
              </DropdownMenuTrigger>
              {/* Beside the rail on a desktop; above the row in the sheet,
                  where "right" puts the menu outside the sheet entirely. */}
              {/* Narrower than the trigger it hangs off: `w-(--anchor-width)`
                  makes a menu as wide as the whole account row, and three short
                  commands do not need 239px of it. */}
              <DropdownMenuContent
                side={isMobile ? 'top' : 'right'}
                align="end"
                className="w-40"
              >
                <DropdownMenuItem
                  onClick={closeSheet}
                  render={<Link href="/profile" />}
                >
                  <UserRoundPenIcon />
                  Profile
                </DropdownMenuItem>
                {/* A submenu rather than three rows: the menu's other items are
                    destinations and an action, and this is a setting with a
                    current value — the radio indicator is what says which. */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <PaletteIcon />
                    Theme
                  </DropdownMenuSubTrigger>
                  {/* Content-width by default, which left the three theme
                      names looking cramped against the tick. */}
                  <DropdownMenuSubContent className="min-w-32">
                    <DropdownMenuRadioGroup
                      value={appearance}
                      onValueChange={(next) =>
                        setAppearance(next as Appearance)
                      }
                    >
                      {APPEARANCE_OPTIONS.map(({ value, label, Icon }) => (
                        <DropdownMenuRadioItem
                          key={value}
                          value={value}
                          className="[&_[data-slot=dropdown-menu-radio-item-indicator]]:text-brand-ink! [&_[data-slot=dropdown-menu-radio-item-indicator]_svg]:text-brand-ink!"
                        >
                          <Icon />
                          {label}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
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
