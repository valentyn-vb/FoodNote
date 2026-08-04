import { DEFAULT_APPEARANCE, appearanceSchema } from '@foodnote/shared';
import type { Appearance } from '@foodnote/shared';

/**
 * The names the server render and the browser have to agree on, in one place —
 * the root layout reads the cookie and stamps the attribute, the provider writes
 * both, and `globals.css` selects on the attribute. A typo in any one of them is
 * a page that silently ignores the setting.
 *
 * The cookie is a cache, not the truth: the profile is (ADR 0014). It is
 * deliberately not httpOnly — the browser writes it — and holds no secret.
 */
export const APPEARANCE_COOKIE = 'foodnote_appearance';
export const APPEARANCE_ATTRIBUTE = 'data-appearance';

/** A year: this is a preference, not a session. */
export const APPEARANCE_COOKIE_MAX_AGE_S = 365 * 24 * 60 * 60;

/**
 * Anything unparseable — absent, stale, hand-edited — is `system`, which is both
 * the default and the only appearance a route with no profile can have.
 */
export function appearanceOrDefault(value: string | undefined): Appearance {
  return appearanceSchema.safeParse(value).data ?? DEFAULT_APPEARANCE;
}
