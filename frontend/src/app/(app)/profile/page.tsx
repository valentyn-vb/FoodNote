'use client';

import { useAuth } from '@/components/auth-provider';
import { NotImplementedButton } from '@/components/not-implemented-button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { profile } from '@/lib/api-client';
import { mockUserProfile } from '@/lib/mock-data';
import type { ProfileResponse } from '@foodnote/shared';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CurrentPlanSection } from './current-plan-section';
import { LogoutButton } from './logout-button';
import { PersonalDetailsSection } from './personal-details-section';

// No mascot on this screen — Profile is a routine settings surface, not a
// moment that needs guidance, reassurance, or celebration (see H08 in Paper).

export default function ProfilePage() {
  const user = mockUserProfile;
  const initials = user.name
    .split(' ')
    .map((part) => part[0])
    .join('');

  // Profile is the single source of truth for both sections: a change in one
  // (e.g. editing weight recomputes the calorie target) must re-render the
  // other, so the data and its updater live here and flow down as props.
  const [profileData, setProfileData] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const { user: authUser } = useAuth();

  useEffect(() => {
    let cancelled = false;
    profile
      .current()
      .then((p) => {
        if (!cancelled) setProfileData(p);
      })
      .catch(() => {
        if (!cancelled) toast.error("Couldn't load your profile.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex w-full max-w-md flex-col bg-surface lg:mx-14 lg:my-10 lg:max-w-xl">
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
        <NotImplementedButton
          action="Edit"
          variant="ghost"
          className="h-auto p-0 font-sans text-title font-semibold text-primary-deep hover:bg-transparent"
        >
          Edit
        </NotImplementedButton>
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
            {authUser?.email}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 px-4 pb-5">
        <CurrentPlanSection
          profileData={profileData}
          loading={loading}
          onProfileChange={setProfileData}
        />

        <PersonalDetailsSection
          profileData={profileData}
          loading={loading}
          onProfileChange={setProfileData}
        />
      </div>

      <div className="border-t border-border px-4 pt-3 pb-6">
        <LogoutButton
          variant="outline"
          className="h-12 w-full rounded-sm border-[1.5px] border-error bg-transparent text-title font-semibold text-error shadow-none hover:bg-error-bg"
        >
          Log out
        </LogoutButton>
      </div>
    </div>
  );
}
