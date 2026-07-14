import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // localhost:3000 may be taken by another local service, so the app is often
  // browsed via the machine's LAN IP in dev. Next 16 blocks dev resources
  // (hydration/HMR) for non-localhost origins unless allowlisted — without
  // this, pages render but nothing is interactive.
  allowedDevOrigins: ['192.168.0.64'],
};

export default nextConfig;
