'use client';

import { useAuth } from '@/components/auth-provider';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { profile } from '@/lib/api-client';
import { fullNameOf, initialsOf } from '@/lib/user-display';
import type { ProfileResponse } from '@foodnote/shared';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CurrentPlanSection } from './current-plan-section';
import { EditProfileDialog } from './edit-profile-dialog';
import { LogoutButton } from './logout-button';
import { PersonalDetailsSection } from './personal-details-section';

// No mascot on this screen — Profile is a routine settings surface, not a
// moment that needs guidance, reassurance, or celebration (see H08 in Paper).

export default function ProfilePage() {
  // Profile is the single source of truth for both sections: a change in one
  // (e.g. editing weight recomputes the calorie target) must re-render the
  // other, so the data and its updater live here and flow down as props.
  const [profileData, setProfileData] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const { user: authUser } = useAuth();
  const fullName = fullNameOf(authUser);
  const initials = initialsOf(authUser);

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
    <div className="flex w-full max-w-md flex-col lg:mx-14 lg:my-10 lg:max-w-xl">
      <div className="flex items-center justify-between px-4 py-3">
        <Link
          href="/dashboard"
          aria-label="Back to dashboard"
          className="lg:hidden"
        >
          <ChevronLeft size={20} className="shrink-0" strokeWidth={1.8} />
        </Link>
        <Text variant="title" render={<h1 />}>
          Profile
        </Text>
      </div>
      <Separator />

      <div className="pt-7 pb-5 lg:px-4 lg:pt-6">
        <div className="mb-2.5 flex flex-col items-center lg:flex-row lg:items-center lg:gap-4">
          <Avatar className="size-18">
            {/* The stock fallback is a grey wash at 14px — it reads as a
                missing image at this size, not as a person. */}
            <AvatarFallback className="bg-primary text-heading font-semibold text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-center gap-2.5 lg:items-start lg:gap-0.5">
            <Text variant="title">{fullName}</Text>
            <Text variant="caption" tone="muted">
              {authUser?.email}
            </Text>
          </div>
        </div>
        <EditProfileDialog />
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

      <Separator />
      <div className="px-4 pt-3 pb-6">
        {/* Outlined rather than filled: a destructive action that is
            *available* rather than urgent. The filled `destructive` variant is
            for the confirmation itself. */}
        <LogoutButton
          variant="outline"
          size="lg"
          className="w-full border-[color-mix(in_oklch,var(--destructive),var(--card)_70%)] bg-card text-destructive-text hover:bg-[color-mix(in_oklch,var(--destructive),var(--card)_90%)]"
        >
          Log out
        </LogoutButton>
      </div>
    </div>
  );
}
