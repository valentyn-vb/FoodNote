import { cn } from '@/lib/utils';

/**
 * One label/value pair of a details list. The dividers belong to the `<dl>`
 * around it rather than to a `border-b … last:border-b-0` on every row.
 * `numeric` gives the value tabular figures — a weight, an age.
 *
 * Shared by the profile's Personal details and onboarding's review step, which
 * show the same list at either end of the same data.
 */
export function DetailRow({
  label,
  value,
  numeric = true,
}: {
  label: string;
  value: React.ReactNode;
  numeric?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <dt className="text-sm font-semibold">{label}</dt>
      <dd
        className={cn(
          'text-sm font-semibold text-muted-foreground',
          numeric && 'tabular-nums',
        )}
      >
        {value}
      </dd>
    </div>
  );
}
