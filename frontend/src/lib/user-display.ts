import type { AuthUser } from '@foodnote/shared';

type NamedUser = Pick<AuthUser, 'firstName' | 'lastName'>;

/** "First Last" for display, or '' while the user isn't loaded yet. */
export function fullNameOf(user: NamedUser | null | undefined): string {
  return user ? `${user.firstName} ${user.lastName}`.trim() : '';
}

/** Uppercase first initials, e.g. Jamie Rivera → "JR" (empty until loaded). */
export function initialsOf(user: NamedUser | null | undefined): string {
  if (!user) return '';
  return `${user.firstName.at(0) ?? ''}${user.lastName.at(0) ?? ''}`.toUpperCase();
}
