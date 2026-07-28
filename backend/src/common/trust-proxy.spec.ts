import { readTrustProxyHops } from './trust-proxy';

describe('readTrustProxyHops', () => {
  it('defaults to trusting nothing when unset or empty', () => {
    expect(readTrustProxyHops(undefined)).toBe(0);
    expect(readTrustProxyHops('  ')).toBe(0);
  });

  it('reads a hop count', () => {
    expect(readTrustProxyHops('2')).toBe(2);
    expect(readTrustProxyHops(' 2 ')).toBe(2);
  });

  // Express compiles a numeric 'trust proxy' to `i < val`, so a bad value would
  // silently behave like 0 and put every client in one rate-limit bucket.
  it.each(['abc', '-1', '1.5'])('rejects %p instead of trusting 0', (raw) => {
    expect(() => readTrustProxyHops(raw)).toThrow(/TRUST_PROXY_HOPS/);
  });
});
