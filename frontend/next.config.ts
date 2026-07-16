import type { NextConfig } from 'next';

// All browser traffic goes to the frontend's own origin; Next.js proxies
// /api/* to the backend. Keeps auth cookies first-party in production.
const API_URL = process.env.API_URL ?? 'http://localhost:3001';

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
        destination: `${API_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
