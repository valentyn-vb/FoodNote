import { readJwtSecret } from './jwt-secrets';

describe('readJwtSecret', () => {
  it('returns the configured value when the variable is set', () => {
    expect(
      readJwtSecret('JWT_ACCESS_SECRET', 'dev-access-secret', {
        JWT_ACCESS_SECRET: 'configured-value',
      }),
    ).toBe('configured-value');
  });

  it('returns the fallback when absent in development', () => {
    expect(
      readJwtSecret('JWT_ACCESS_SECRET', 'dev-access-secret', {
        NODE_ENV: 'development',
      }),
    ).toBe('dev-access-secret');
  });

  it('throws in production when the secret is missing', () => {
    expect(() =>
      readJwtSecret('JWT_ACCESS_SECRET', 'dev-access-secret', {
        NODE_ENV: 'production',
      }),
    ).toThrow('JWT_ACCESS_SECRET');
  });

  it('throws in production when the secret is blank', () => {
    expect(() =>
      readJwtSecret('JWT_REFRESH_SECRET', 'dev-refresh-secret', {
        NODE_ENV: 'production',
        JWT_REFRESH_SECRET: '   ',
      }),
    ).toThrow('JWT_REFRESH_SECRET');
  });
});
