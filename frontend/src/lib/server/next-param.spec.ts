import { describe, expect, it } from 'vitest';
import { DEFAULT_DESTINATION, safeDestination } from './next-param';

/**
 * Unit-tested rather than driven through the browser on purpose: the whole rule
 * is one pure function, and the e2e suite has five login attempts a minute to
 * spend across the entire run (`AUTH_THROTTLE`), two of which the fixtures
 * already use.
 */
describe('safeDestination', () => {
  it('keeps a path on this origin, query string and all', () => {
    expect(safeDestination('/meals?day=2026-08-01')).toBe(
      '/meals?day=2026-08-01',
    );
  });

  it('falls back when there is nothing to honour', () => {
    expect(safeDestination(undefined)).toBe(DEFAULT_DESTINATION);
    expect(safeDestination(null)).toBe(DEFAULT_DESTINATION);
    expect(safeDestination('')).toBe(DEFAULT_DESTINATION);
  });

  // The reason this function exists. Each of these is read by a browser as
  // another origin, so honouring one would make our own login form a springboard
  // to someone else's site — with our name in the address bar until the moment it
  // isn't.
  it.each([
    '//evil.example',
    '/\\evil.example',
    'https://evil.example',
    'javascript:alert(1)',
  ])('refuses %s', (value) => {
    expect(safeDestination(value)).toBe(DEFAULT_DESTINATION);
  });
});
