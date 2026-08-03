'use client';

import { useAuth } from '@/components/auth-provider';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { profile } from '@/lib/api-client';
import { fullNameOf, initialsOf } from '@/lib/user-display';
import type { ProfileResponse } from '@foodnote/shared';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CurrentPlanSection } from './current-plan-section';
import { EditProfileDialog } from './edit-profile-dialog';
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
    // Capped and left-aligned on a desktop: one column of label/value rows is
    // unreadable at 1120px, where a row's value sits a screen away from its
    // label. This is the one page that owns a max-width — see AGENTS.md, which
    // records it as the exception rather than pretending the rule is absolute.
    <div className="flex w-full max-w-xl flex-col gap-6">
      {/* Identity spans the top at every width; the edit trigger joins the row
          at `lg` instead of floating centred beneath the avatar. */}
      <div className="flex flex-col items-center gap-2.5 lg:flex-row lg:gap-4">
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
        <div className="lg:ml-auto">
          <EditProfileDialog />
        </div>
      </div>

      {/* One column at every width. Two were tried (#131) and reversed: the
          sections stack. */}
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
    </div>
  );
}
