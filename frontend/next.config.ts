import type { NextConfig } from 'next';

// All browser traffic goes to the frontend's own origin; Next.js proxies
// /api/* to the backend. Keeps auth cookies first-party in production.
const API_URL = process.env.API_URL ?? 'http://localhost:3001';

const nextConfig: NextConfig = {
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
