import { Text } from '@/components/ui/text';

/**
 * A read-only list of label/value pairs — a profile's details, a plan's numbers.
 * The dividers live here rather than as a `border-b … last:border-b-0` on every
 * row, which is the kind of rule that drifts the moment a second list appears.
 */
function DetailList({ className, ...props }: React.ComponentProps<'dl'>) {
  return (
    <dl
      data-slot="detail-list"
      className={['divide-y divide-border', className]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  );
}

/** One pair. `numeric` gives the value tabular figures — a weight, an age. */
function DetailRow({
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
      <Text variant="label" render={<dt />}>
        {label}
      </Text>
      <Text variant="label" tone="muted" numeric={numeric} render={<dd />}>
        {value}
      </Text>
    </div>
  );
}

export { DetailList, DetailRow };
