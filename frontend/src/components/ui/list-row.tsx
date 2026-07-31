import { cn } from '@/lib/utils';
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
}: Omit<React.ComponentProps<typeof Card>, 'title'> & {
  title: React.ReactNode;
  meta?: React.ReactNode;
  end?: React.ReactNode;
  /** Tabular figures on the title — for a weight or a count, not a name. */
  numeric?: boolean;
}) {
  return (
    <Card
      // One line of a list: a fixed-height surface that never flexes, because
      // inside a bounded scrolling column a row would squash before the column
      // scrolled. Tighter radius than the card default — 20px on a 64px row
      // reads as a pill.
      className={cn(
        'shrink-0 flex-row items-center justify-between gap-3 rounded-md px-4 py-3.5',
        className,
      )}
      {...props}
    >
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
