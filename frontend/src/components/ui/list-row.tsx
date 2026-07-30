import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';

/**
 * A row-shaped surface: a name with a line of context under it, and a value or
 * a set of actions at the end. A logged meal and a weight entry are the same
 * object with different content — which is why the object lives here and only
 * the content is passed in.
 */
function ListRow({
  title,
  meta,
  end,
  numeric,
  className,
  ...props
}: Omit<React.ComponentProps<typeof Card>, 'variant' | 'title'> & {
  title: React.ReactNode;
  meta?: React.ReactNode;
  end?: React.ReactNode;
  /** Tabular figures on the title — for a weight or a count, not a name. */
  numeric?: boolean;
}) {
  return (
    <Card variant="row" className={className} {...props}>
      <div className="flex flex-col gap-0.5">
        <Text variant="label" numeric={numeric}>
          {title}
        </Text>
        {meta && (
          <Text variant="caption" tone="muted">
            {meta}
          </Text>
        )}
      </div>
      {end && <div className="flex shrink-0 items-center gap-1">{end}</div>}
    </Card>
  );
}

export { ListRow };
