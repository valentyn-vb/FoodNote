import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function SiteNav() {
  return (
    <nav className="glass-card fixed inset-x-4 top-4 z-30 flex items-center justify-between rounded-full px-5 py-2.5 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.18)] sm:inset-x-16 sm:top-6">
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
      <Button
        render={<Link href="/login" />}
        nativeButton={false}
        variant="ghost"
        size="sm"
        className="text-text"
      >
        Log in
      </Button>
    </nav>
  );
}
