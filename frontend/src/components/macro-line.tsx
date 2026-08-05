import { Fragment } from 'react';
import { MACRO_FIELDS, type MacroGrams } from '@/lib/macros';

/**
 * A meal's macros as one line of prose: "12 g protein · 30 g carbs · 5 g fat".
 *
 * The figures carry the app's text colour and the words around them stay muted,
 * so the line reads as a sentence but its numbers are still findable at a
 * glance — without a fill, a second type size, or a table.
 *
 * Written out — `protein`, not `P` — because this is a sentence to read, not a
 * row of fields to scan; the abbreviations belong on the inputs. Rounded to
 * whole grams: a tenth of a gram of fat is below what the parser can honestly
 * claim, and it made the line look like a measurement rather than a check.
 *
 * Two call sites, which is why it is a component and not a pair of classnames:
 * the per-100 g row under a parsed item, and a saved meal in the picker.
 */
export function MacroLine({
  macros,
  lead,
  caloriesKcal,
}: {
  macros: MacroGrams;
  /** Opens the line where it is a claim about something — "Per 100 g". */
  lead?: string;
  /** Included only where the figure isn't already shown beside the line. */
  caloriesKcal?: number;
}) {
  return (
    <p className="text-xs text-muted-foreground">
      {lead && (
        <>
          {lead}
          <span aria-hidden> · </span>
        </>
      )}
      {caloriesKcal !== undefined && (
        <>
          <span className="tabular-nums text-foreground">
            {Math.round(caloriesKcal)} kcal
          </span>
          <span aria-hidden> · </span>
        </>
      )}
      {MACRO_FIELDS.map(({ name, label }, index) => (
        <Fragment key={name}>
          {index > 0 && <span aria-hidden> · </span>}
          <span className="tabular-nums text-foreground">
            {Math.round(macros[name])} g
          </span>
          {` ${label.toLowerCase()}`}
        </Fragment>
      ))}
    </p>
  );
}
