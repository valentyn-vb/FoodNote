/**
 * A missing secret in production must stop the boot, not degrade into a service
 * that signs tokens with a string published in a public repository — anyone
 * reading it could mint a token for any account, and nothing would log it.
 * Development and tests keep the convenient fallback.
 */
export function readJwtSecret(
  name: 'JWT_ACCESS_SECRET' | 'JWT_REFRESH_SECRET',
  fallback: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const value = env[name]?.trim();
  if (value) return value;
  if (env.NODE_ENV === 'production') {
    throw new Error(`${name} is required in production.`);
  }
  return fallback;
}
