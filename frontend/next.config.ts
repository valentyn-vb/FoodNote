import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // @foodnote/shared ships raw TypeScript (no build artifact on deploy);
  // let the bundler compile it from source. See shared/package.json "main".
  transpilePackages: ['@foodnote/shared'],
};

export default nextConfig;
