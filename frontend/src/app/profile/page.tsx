'use client';

import Link from 'next/link';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { mockUserProfile } from '@/lib/mock-data';

// No mascot on this screen — Profile is a routine settings surface, not a
// moment that needs guidance, reassurance, or celebration (see H08 in Paper).

function notImplemented(action: string) {
  toast.info(`${action} isn't wired up yet — this is a rough skeleton.`);
}

export default function ProfilePage() {
  const user = mockUserProfile;
  const initials = user.name
    .split(' ')
    .map((part) => part[0])
    .join('');

  return (
    <div className="mx-auto flex w-full max-w-md flex-col bg-surface">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <Link href="/dashboard" aria-label="Back to dashboard">
          <svg width="20" height="20" viewBox="0 0 20 20" className="shrink-0">
            <path
              d="M12.5 4.5L6 10l6.5 5.5"
              fill="none"
              stroke="var(--color-text)"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        <div className="font-sans text-[15px] font-semibold text-text">
          Profile
        </div>
        <Button
          variant="ghost"
          className="h-auto p-0 font-sans text-[15px] font-semibold text-primary-deep hover:bg-transparent"
          onClick={() => notImplemented('Edit')}
        >
          Edit
        </Button>
      </div>

      <div className="flex flex-col items-center gap-2.5 pt-7 pb-5">
        <Avatar className="size-18">
          <AvatarFallback className="bg-primary text-heading-lg text-surface">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="font-sans text-[17px] font-semibold text-text">
          {user.name}
        </div>
        <div className="font-sans text-caption text-text-muted">
          {user.email}
        </div>
      </div>

      <div className="flex flex-col gap-2.5 px-4 pb-5">
        <div className="font-sans text-caption text-text-muted">
          Current plan
        </div>
        <Card className="gap-1 rounded-lg border-[1.5px] border-border bg-surface p-4 py-4 shadow-[0_1px_3px_#0000000a] ring-0">
          <div className="font-display text-heading font-semibold text-text">
            {user.plan.kcal.toLocaleString()} kcal / day
          </div>
          <div className="font-sans text-caption text-text-muted">
            {user.plan.label} · {user.plan.protein}g protein · {user.plan.carbs}
            g carbs · {user.plan.fat}g fat
          </div>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/plan-selection" />}
            className="mt-1.5 h-9.5 w-fit rounded-sm border-[1.5px] border-primary bg-transparent px-3.5 text-label font-semibold text-primary-deep shadow-none hover:bg-[#FFF3E7]"
          >
            Change plan
          </Button>
        </Card>
      </div>

      <div className="flex flex-col gap-2.5 px-4 pb-5">
        <div className="font-sans text-caption text-text-muted">
          Personal details
        </div>
        <Card className="gap-0 overflow-hidden rounded-lg border-[1.5px] border-border bg-surface py-0 ring-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
            <div className="font-sans text-label text-text">Sex</div>
            <div className="font-sans text-label text-text-muted">
              {user.sex}
            </div>
          </div>
          <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
            <div className="font-sans text-label text-text">Age</div>
            <div className="font-sans text-label text-text-muted [font-variant-numeric:tabular-nums]">
              {user.age}
            </div>
          </div>
          <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
            <div className="font-sans text-label text-text">Height</div>
            <div className="font-sans text-label text-text-muted [font-variant-numeric:tabular-nums]">
              {user.heightCm} cm
            </div>
          </div>
          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="font-sans text-label text-text">Weight goal</div>
            <div className="font-sans text-label text-text-muted [font-variant-numeric:tabular-nums]">
              {user.weightGoalKg} kg
            </div>
          </div>
        </Card>
        <Button
          variant="ghost"
          className="h-auto w-fit p-0 font-sans text-label font-semibold text-primary-deep hover:bg-transparent"
          onClick={() => notImplemented('Editing details')}
        >
          Edit details
        </Button>
      </div>

      <div className="border-t border-border px-4 pt-3 pb-6">
        <Button
          variant="outline"
          className="h-12 w-full rounded-sm border-[1.5px] border-error bg-transparent text-[15px] font-semibold text-error shadow-none hover:bg-error-bg"
          onClick={() => notImplemented('Log out')}
        >
          Log out
        </Button>
      </div>
    </div>
  );
}
