import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/server/session';
import { ProfileView } from './profile-view';

export const metadata: Metadata = {
  title: 'Profile — FoodNote',
};

/**
 * Reads the signed-in user at page level and hands it down as a prop, now that
 * `AuthProvider` is gone. `getCurrentUser()` is memoized per render pass, so this
 * shares one request with the shell's own read rather than adding a second.
 */
export default async function ProfilePage() {
  const user = await getCurrentUser();

  return <ProfileView user={user} />;
}
