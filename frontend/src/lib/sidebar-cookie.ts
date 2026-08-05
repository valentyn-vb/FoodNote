/**
 * The name `ui/sidebar.tsx` writes the collapsed/expanded state under, and
 * `(app)/layout.tsx` reads to seed it — beside `APPEARANCE_COOKIE`, for the same
 * reason: a name shared by a server render and the browser belongs in one place.
 *
 * It lives here rather than in `ui/sidebar.tsx`, which declares it, because that
 * file is `'use client'`: imported from a Server Component, its exports arrive as
 * client references, not values. `cookieStore.get()` was handed a function and
 * returned undefined, and nothing caught it — the import's *type* is still
 * `string`, so neither tsc nor eslint has anything to say.
 */
export const SIDEBAR_COOKIE_NAME = 'sidebar_state';
