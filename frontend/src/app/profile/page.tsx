'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { AppSidebar } from '@/components/app-sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { mockUserProfile } from '@/lib/mock-data';

// No mascot on this screen — Profile is a routine settings surface, not a
// moment that needs guidance, reassurance, or celebration (see H08 in Paper).

function notImplemented(action: string) {
  toast.info(`${action} isn't wired up yet — this is a rough skeleton.`);
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border px-4 py-3.5 last:border-b-0">
      <div className="font-sans text-label text-text">{label}</div>
      <div className="font-sans text-label text-text-muted [font-variant-numeric:tabular-nums]">
        {value}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const user = mockUserProfile;
  const initials = user.name
    .split(' ')
    .map((part) => part[0])
    .join('');

  return (
    <div className="lg:flex lg:min-h-screen lg:bg-bg">
      <AppSidebar className="hidden lg:flex" />
      <div className="lg:flex lg:grow lg:justify-start lg:overflow-y-auto lg:px-14 lg:py-10">
        <div className="flex w-full max-w-md flex-col bg-surface lg:max-w-xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <Link
              href="/dashboard"
              aria-label="Back to dashboard"
              className="lg:hidden"
            >
              <ChevronLeft
                size={20}
                className="shrink-0 text-text"
                strokeWidth={1.8}
              />
            </Link>
            <h1 className="font-sans text-title font-semibold text-text lg:text-heading-lg">
              Profile
            </h1>
            <Button
              variant="ghost"
              className="h-auto p-0 font-sans text-title font-semibold text-primary-deep hover:bg-transparent"
              onClick={() => notImplemented('Edit')}
            >
              Edit
            </Button>
          </div>

          <div className="flex flex-col items-center gap-2.5 pt-7 pb-5 lg:flex-row lg:items-center lg:gap-4 lg:px-4 lg:pt-6">
            <Avatar className="size-18">
              <AvatarFallback className="bg-primary text-heading-lg text-surface">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-center gap-2.5 lg:items-start lg:gap-0.5">
              <div className="font-sans text-[17px] font-semibold text-text">
                {user.name}
              </div>
              <div className="font-sans text-caption text-text-muted">
                {user.email}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 px-4 pb-5">
            <div className="flex flex-col gap-2.5">
              <div className="font-sans text-caption text-text-muted">
                Current plan
              </div>
              <Card className="gap-1 rounded-lg border-[1.5px] border-border bg-surface p-4 py-4 shadow-[0_1px_3px_#0000000a] ring-0">
                <div className="font-display text-heading font-semibold text-text">
                  {user.plan.kcal.toLocaleString()} kcal / day
                </div>
                <div className="font-sans text-caption text-text-muted">
                  {user.plan.label} · {user.plan.protein}g protein ·{' '}
                  {user.plan.carbs}g carbs · {user.plan.fat}g fat
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

            <div className="flex flex-col gap-2.5">
              <div className="font-sans text-caption text-text-muted">
                Personal details
              </div>
              <Card className="gap-0 overflow-hidden rounded-lg border-[1.5px] border-border bg-surface py-0 ring-0">
                <DetailRow label="Sex" value={user.sex} />
                <DetailRow label="Age" value={user.age} />
                <DetailRow label="Height" value={`${user.heightCm} cm`} />
                <DetailRow
                  label="Weight goal"
                  value={`${user.weightGoalKg} kg`}
                />
              </Card>
              <Button
                variant="ghost"
                className="h-auto w-fit p-0 font-sans text-label font-semibold text-primary-deep hover:bg-transparent"
                onClick={() => notImplemented('Editing details')}
              >
                Edit details
              </Button>
            </div>
          </div>

          <div className="border-t border-border px-4 pt-3 pb-6">
            <Button
              variant="outline"
              className="h-12 w-full rounded-sm border-[1.5px] border-error bg-transparent text-title font-semibold text-error shadow-none hover:bg-error-bg"
              onClick={() => notImplemented('Log out')}
            >
              Log out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
