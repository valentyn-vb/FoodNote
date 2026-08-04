/**
 * The `?next=` round trip: proxy writes it, the login action honours it.
 *
 * Pure, so `proxy.ts` can import it — and shared, because the two halves have to
 * agree on both the parameter name and what counts as an acceptable value. A
 * validator on only one side is the same as no validator.
 */

export const NEXT_PARAM = 'next';

export const DEFAULT_DESTINATION = '/dashboard';

/**
 * `//` and `/\` are the reason this exists: a browser reads both as
 * protocol-relative URLs pointing at another origin, so honouring one turns our
 * own login form into a springboard to someone else's site.
 *
 * The fallback is silent rather than an error — the value is either an attack,
 * where there is nobody to inform, or a mangled link, where `/dashboard` is
 * where they were going anyway.
 */
export function safeDestination(value: string | null | undefined): string {
  if (!value) return DEFAULT_DESTINATION;
  if (!value.startsWith('/')) return DEFAULT_DESTINATION;
  if (value.startsWith('//') || value.startsWith('/\\')) {
    return DEFAULT_DESTINATION;
  }
  return value;
}
