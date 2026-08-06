/**
 * The three macros, in the order every surface shows them, with both the word
 * and the letter each surface needs: `label` for prose (`MacroLine`), `short`
 * for an input's marker, where there is room for nothing else.
 *
 * One table rather than a list per screen, so a renamed or added macro cannot
 * appear on the item fields and go missing from the line beneath them.
 */
export const MACRO_FIELDS = [
  { name: 'proteinGrams', label: 'Protein', short: 'P' },
  { name: 'carbsGrams', label: 'Carbs', short: 'C' },
  { name: 'fatGrams', label: 'Fat', short: 'F' },
] as const;

/** What `MacroLine` and the totals fields read — the three figures, nothing else. */
export type MacroGrams = {
  [Field in (typeof MACRO_FIELDS)[number]['name']]: number;
};
