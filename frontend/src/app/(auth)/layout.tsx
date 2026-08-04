import { MascotDisc } from '@/components/mascot-disc';

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
      <div className="flex flex-col items-center gap-3">
        {/* In a disc of the artwork's own cream: `guide.webp` is opaque, so on a
            dark page it was a lit square. See MascotDisc. */}
        <MascotDisc src="/mascot/guide.webp" alt="FoodNote mascot" priority />
        {/* The wordmark: a page title, so it keeps the brand face. */}
        <p className="font-heading text-2xl font-semibold">FoodNote</p>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
