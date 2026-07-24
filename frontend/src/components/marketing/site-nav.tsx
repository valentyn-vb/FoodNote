'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

const SECTIONS = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#features', label: 'Features' },
];

export function SiteNav() {
  const { status } = useAuth();
  const authed = status === 'authenticated';

  return (
    <nav className="glass-card fixed top-4 left-1/2 z-30 flex w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 items-center justify-between rounded-full px-5 py-2.5 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.18)] sm:top-6">
      <Tooltip>
        <TooltipTrigger className="flex items-center gap-2">
          <Image
            src="/mascot/defaultlogo.png"
            alt="FoodNote mascot"
            width={28}
            height={28}
            className="rounded-full"
          />
          <span className="font-display text-[17px] font-semibold text-text">
            FoodNote
          </span>
        </TooltipTrigger>
        <TooltipContent>
          Hamsters hoard food but almost never overeat. Kindred spirits.
        </TooltipContent>
      </Tooltip>

      {/* Desktop only — in-page section links; smooth-scrolls there (CSS
          scroll-behavior, see globals.css), no JS scroll library needed. */}
      <div className="hidden items-center gap-6 sm:flex">
        {SECTIONS.map((section) => (
          <a
            key={section.href}
            href={section.href}
            className="text-sm text-text/70 transition-colors hover:text-text"
          >
            {section.label}
          </a>
        ))}
      </div>

      <div className="flex items-center gap-1">
        <Button
          render={<Link href={authed ? '/dashboard' : '/login'} />}
          nativeButton={false}
          variant="ghost"
          size="sm"
          className="text-text"
        >
          {authed ? 'Dashboard' : 'Log in'}
        </Button>

        {/* Mobile only — section links live behind a burger instead of
            competing for space in the pill; Log in stays visible either
            way, it's the one action worth never hiding. */}
        <Sheet>
          <SheetTrigger
            render={<Button variant="ghost" size="icon-sm" />}
            className="sm:hidden"
          >
            <Menu className="size-4.5" />
            <span className="sr-only">Open menu</span>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetTitle className="px-4 pt-4">Menu</SheetTitle>
            <nav className="flex flex-col gap-1 p-4">
              {SECTIONS.map((section) => (
                <SheetClose
                  key={section.href}
                  render={<a href={section.href} />}
                  nativeButton={false}
                  className="rounded-md px-3 py-2 text-text hover:bg-muted"
                >
                  {section.label}
                </SheetClose>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
