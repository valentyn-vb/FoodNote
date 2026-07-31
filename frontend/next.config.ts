import type { NextConfig } from 'next';
import { env } from './src/lib/server/env';

// All browser traffic goes to the frontend's own origin; Next.js proxies
// /api/* to the backend. Keeps auth cookies first-party in production.
//
// The environment is read through `env` rather than `process.env` so that this
// import is what validates it: the config is loaded before anything else, so a
// bad value stops the build instead of surfacing on a request.
const nextConfig: NextConfig = {
  // localhost:3000 may be taken by another local service, so the app is often
  // browsed via the machine's LAN IP in dev. Next 16 blocks dev resources
  // (hydration/HMR) for non-localhost origins unless allowlisted — without
  // this, pages render but nothing is interactive.
  allowedDevOrigins: ['192.168.0.64'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${env.API_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
