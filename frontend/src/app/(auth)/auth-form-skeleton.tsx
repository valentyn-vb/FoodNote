import { Skeleton } from '@/components/ui/skeleton';

// Shown while AuthProvider resolves the session restore (auth-provider.tsx).
// Real branch, not mock — every fresh /login or /register visit hits this
// for a frame before `status` settles.
export function AuthFormSkeleton() {
  return (
    <div className="flex w-full flex-col gap-3">
      <Skeleton className="h-11.5 w-full rounded-sm" />
      <Skeleton className="h-11.5 w-full rounded-sm" />
      <Skeleton className="h-12.5 w-full rounded-sm" />
    </div>
  );
}
