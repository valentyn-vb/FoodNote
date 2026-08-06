import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/server/reads';
import { getCurrentUser } from '@/lib/server/session';
import { ProfileView } from './profile-view';

export const metadata: Metadata = {
  title: 'Profile — FoodNote',
};

/**
 * Both reads happen here and flow down as props: the identity, and the profile
 * that used to be fetched in an effect one level below. Each is memoized per
 * render pass, so this shares the shell's requests rather than adding two.
 *
 * No profile means onboarding was never finished — `GET /profile` 404s until it
 * is. That is a redirect rather than an empty state: a settings screen with
 * nothing to settle is not a screen.
 */
export default async function ProfilePage() {
  const [user, profile] = await Promise.all([getCurrentUser(), getProfile()]);
  if (!profile) redirect('/onboarding');

  return <ProfileView user={user} profile={profile} />;
}
