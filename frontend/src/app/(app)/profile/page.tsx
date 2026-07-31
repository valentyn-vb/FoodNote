'use client';

import { useAuth } from '@/components/auth-provider';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
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
    <div className="flex w-full max-w-md flex-col lg:max-w-xl">
      {/* Mobile only: at lg+ the shell's own AppHeader names the route. */}
      <div className="flex items-center justify-between px-4 py-3 lg:hidden">
        <Link href="/dashboard" aria-label="Back to dashboard">
          <ChevronLeft size={20} className="shrink-0" strokeWidth={1.8} />
        </Link>
        <h1 className="font-heading text-2xl font-semibold">Profile</h1>
      </div>
      <Separator className="lg:hidden" />

      <div className="mb-2.5 flex flex-col items-center lg:flex-row lg:items-center lg:gap-4">
        <Avatar className="size-18">
          {/* The stock fallback is a grey wash at 14px — it reads as a
                missing image at this size, not as a person. */}
          <AvatarFallback className="bg-primary text-2xl font-semibold text-primary-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col items-center gap-2.5 lg:items-start lg:gap-0.5">
          <p className="text-lg font-bold">{fullName}</p>
          <p className="text-sm text-muted-foreground">{authUser?.email}</p>
        </div>
      </div>
      <EditProfileDialog />

      <div className="flex flex-col gap-4">
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

      <LogoutButton
        variant="outline"
        size="lg"
        className="w-full border-[color-mix(in_oklch,var(--destructive),var(--card)_70%)] bg-card text-destructive-text hover:bg-[color-mix(in_oklch,var(--destructive),var(--card)_90%)]"
      >
        Log out
      </LogoutButton>
    </div>
  );
}
