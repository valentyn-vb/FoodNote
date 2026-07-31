import { z } from 'zod';
import { weightKgSchema } from '@foodnote/shared';
import { type UseFormReturn } from 'react-hook-form';
import { toDatetimeLocal } from '@/lib/dashboard-transforms';
import { FieldDescription } from '@/components/ui/field';
import { FigureField, InputField } from './form-fields';

// weightKg stays a string end to end (not a transform to number) so the
// component never needs a manual parse: the comma-decimal check ("71,4",
// common on EU keyboards) lives in the schema, and the caller converts to a
// number only in the already-validated submit handler, via parsedWeightKg.
export const weightFormSchema = z.object({
  weightKg: z
    .string()
    .refine(
      (v) => weightKgSchema.safeParse(Number(v.replace(',', '.'))).success,
      'Enter a weight between 30 and 300 kg.',
    ),
  recordedAt: z
    .string()
    .min(1, 'Pick a date and time.')
    // The form has noValidate — Zod owns validation, not the browser — so the
    // datetime-local input's `max` alone doesn't stop a typed-in future date
    // from submitting. Skipped when empty; .min(1) above already covers that.
    .refine(
      (v) => !v || new Date(v).getTime() <= Date.now(),
      "Weight can't be logged for a future date.",
    ),
});

export type WeightFormValues = z.infer<typeof weightFormSchema>;

export function parsedWeightKg(values: WeightFormValues): number {
  return Number(values.weightKg.replace(',', '.'));
}

export const WEIGHT_FORM_ID = 'weight-form';

export function WeightForm({
  form,
  onSubmit,
  showDate,
}: {
  form: UseFormReturn<WeightFormValues>;
  onSubmit: (values: WeightFormValues) => void;
  showDate: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  return (
    <form
      id={WEIGHT_FORM_ID}
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      // No padding of its own: inside the drawer `DrawerBody` owns all four
      // edges, and inside the desktop dialog its wrapper does — the same rule
      // the meal steps follow. Its own `px-5 pt-2` fought both.
      className="flex flex-col gap-3"
    >
      {/* The same field the meal totals use, unit in the box and all, but with
          the standard label and the stock surface: one field on its own screen
          doesn't need the accent that marks the leading figure of a row.
          `type="text"` with a decimal keypad, not `number` — the comma-decimal
          check lives in the schema above, and a number input would drop "71,4"
          before Zod ever saw it. */}
      <FigureField
        id="weightKg"
        label="Weight"
        unit="kg"
        type="text"
        inputMode="decimal"
        autoFocus
        placeholder="e.g. 71.4"
        error={errors.weightKg?.message}
        {...register('weightKg')}
      />
      {showDate ? (
        <InputField
          id="recordedAt"
          label="Date and time"
          type="datetime-local"
          max={toDatetimeLocal(new Date().toISOString())}
          error={errors.recordedAt?.message}
          {...register('recordedAt')}
        />
      ) : (
        <FieldDescription>
          Each save adds a new entry to your weight journal.
        </FieldDescription>
      )}
    </form>
  );
}
