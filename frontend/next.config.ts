import type { NextConfig } from 'next';
// Imported for the parse, not for a value: the module validates the environment
// at load, and nothing in this config reads a variable any more now that the
// rewrite is gone.
import './src/lib/server/env';

// The environment is read through `env` rather than `process.env` so that this
// import is what validates it: the config is loaded before anything else, so a
// missing `API_URL` stops the build instead of surfacing on the first request to
// each cold serverless instance.
//
// The `/api/*` rewrite that used to live here is gone. It was the browser's
// direct line to Nest, and it cannot survive an httpOnly access token: client JS
// can no longer build an `Authorization` header, and Nest knows no other scheme.
// Server-side reads go straight to `env.API_URL`; what client code still needs
// goes through a Server Action or a Route Handler that adds the header itself.
const nextConfig: NextConfig = {
  // localhost:3000 may be taken by another local service, so the app is often
  // browsed via the machine's LAN IP in dev. Next 16 blocks dev resources
  // (hydration/HMR) for non-localhost origins unless allowlisted — without
  // this, pages render but nothing is interactive.
  allowedDevOrigins: ['192.168.0.64'],

  experimental: {
    serverActions: {
      // Server Actions abort when the `Origin` header does not match the `Host`,
      // which is the framework's own CSRF defence. Behind Vercel's proxy a
      // preview deployment is reached on a per-build hashed host —
      // `foodnote-<hash>-<scope>.vercel.app` — so the pair can disagree there,
      // and no fixed list can name the hosts in advance. Every form in the app
      // is a Server Action from this PR on, so without the pattern a preview is
      // a site where nobody can log in.
      //
      // Previews only. Production keeps the framework's Origin/Host equality:
      // the relaxation is there to survive a hostname nobody can predict, and
      // production's hostname is the one we do know.
      allowedOrigins:
        process.env.VERCEL_ENV === 'production' ? [] : ['*.vercel.app'],
    },
  },
};

export default nextConfig;
