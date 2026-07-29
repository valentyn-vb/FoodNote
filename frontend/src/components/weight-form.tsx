import { z } from 'zod';
import { weightKgSchema } from '@foodnote/shared';
import { type UseFormReturn } from 'react-hook-form';
import { InputField } from './form-fields';

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
  recordedAt: z.string().min(1, 'Pick a date and time.'),
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
      className="flex flex-col gap-3 px-5 pt-2"
    >
      <InputField
        id="weightKg"
        label="Weight (kg)"
        type="text"
        inputMode="decimal"
        autoFocus
        placeholder="e.g. 71.4"
        error={errors.weightKg?.message}
        className="h-12 text-center font-display text-[22px] font-semibold [font-variant-numeric:tabular-nums]"
        {...register('weightKg')}
      />
      {showDate ? (
        <InputField
          id="recordedAt"
          label="Date and time"
          type="datetime-local"
          error={errors.recordedAt?.message}
          {...register('recordedAt')}
        />
      ) : (
        <div className="font-sans text-[12px] text-text-muted">
          Each save adds a new entry to your weight journal.
        </div>
      )}
    </form>
  );
}
