import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// `proxy.ts` reaches `env.ts` through `cookies.ts`, and that module parses
// `process.env` at load — by design, so a bad environment fails the build. The
// matcher is a static string and cares about none of it, so the value is
// satisfied rather than mocked, and the import is deferred until it is.
process.env.API_URL ??= 'http://localhost:3001/api';
const { config } = await import('./proxy');

const PUBLIC_DIR = fileURLToPath(new URL('../public', import.meta.url));

/** Next anchors a matcher entry at both ends. */
const matches = (pathname: string) =>
  config.matcher.some((pattern) => new RegExp(`^${pattern}$`).test(pathname));

function assetPaths(dir: string, prefix = ''): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) {
      return assetPaths(`${dir}/${entry.name}`, `${prefix}/${entry.name}`);
    }
    // macOS leaves these around; they are not served and not our problem.
    if (entry.name === '.DS_Store') return [];
    return [`${prefix}/${entry.name}`];
  });
}

describe('the proxy matcher', () => {
  const assets = assetPaths(PUBLIC_DIR);

  it('found the public directory', () => {
    // A wrong path yields an empty list, and every assertion below would then
    // pass by having nothing to check.
    expect(assets.length).toBeGreaterThan(10);
  });

  it.each(assets)('skips %s', (asset) => {
    expect(matches(asset)).toBe(false);
  });

  it.each([
    '/',
    '/login',
    '/dashboard',
    '/meals',
    '/profile',
    '/api/meals/ai-parse',
  ])('still runs on %s', (route) => {
    expect(matches(route)).toBe(true);
  });
});
