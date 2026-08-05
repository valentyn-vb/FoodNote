import { BrandMark } from '@/components/brand-mark';

/**
 * The mascot and the wordmark, and nothing else.
 *
 * It used to hold a session gate: a `useAuth()` read, a `router.replace` in an
 * effect, and a skeleton standing in until the restore settled — so every visit
 * to `/login` paid a flash of placeholder before the form appeared. `proxy.ts`
 * now bounces an already-signed-in visitor to `/dashboard` before this renders
 * at all, so there is nothing left to wait for and no state to hold.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-10">
      <BrandMark />
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
