import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { fullNameOf, initialsOf } from '@/lib/user-display';
import type { AuthUser, ProfileResponse } from '@foodnote/shared';
import { AppearanceSection } from './appearance-section';
import { CurrentPlanSection } from './current-plan-section';
import { EditProfileDialog } from './edit-profile-dialog';
import { PersonalDetailsSection } from './personal-details-section';

/**
 * The composition of `/profile`, on the server: it holds no state now that the
 * profile arrives as a prop, so nothing here needs the client. The sections that
 * do — three dialogs and a toggle — declare it for themselves.
 *
 * The profile no longer needs an owner either. It was held here so that a change
 * in one section re-rendered the other, which is what an edit to weight does to
 * the calorie target; the actions behind both sections refresh this tree instead,
 * so the two cannot disagree without the server disagreeing with itself.
 */
export function ProfileView({
  user,
  profile,
}: {
  user: AuthUser;
  profile: ProfileResponse;
}) {
  const fullName = fullNameOf(user);
  const initials = initialsOf(user);

  return (
    <div className="flex w-full max-w-xl flex-col gap-6">
      <div className="flex flex-col items-center gap-2.5 px-2 lg:flex-row lg:gap-4">
        <Avatar className="size-18">
          <AvatarFallback className="bg-primary text-2xl font-semibold text-primary-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col items-center gap-2.5 lg:items-start lg:gap-0.5">
          <p className="text-lg font-bold">{fullName}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
        <div className="lg:ml-auto">
          <EditProfileDialog user={user} />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <CurrentPlanSection profile={profile} />
        <PersonalDetailsSection profile={profile} />
        <AppearanceSection />
      </div>
    </div>
  );
}
