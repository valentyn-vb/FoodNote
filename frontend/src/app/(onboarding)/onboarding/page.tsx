'use client';

import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ACTIVITY_LEVEL_LABELS } from '@/lib/activity-levels';
import { goals, profile, weights } from '@/lib/api-client';
import { getOnboardingData } from '@/lib/onboarding';
import { activityLevelSchema } from '@foodnote/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  DEFAULT_GOAL_PACE,
  ONBOARDING_DEFAULTS,
  onboardingFormSchema,
  type OnboardingFormValues,
} from './form-schema';

const TOGGLE_ITEM_CLASS =
  'h-11.5 grow basis-0 rounded-sm border border-border font-sans text-text-muted data-[state=on]:border-[1.5px] data-[state=on]:border-primary data-[state=on]:bg-[#FFF3E7] data-[state=on]:font-semibold data-[state=on]:text-primary-deep';

const LABEL_CLASS = 'font-sans text-caption font-medium text-text';
const INPUT_CLASS =
  'h-11.5 rounded-sm border-border bg-surface px-3.5 font-sans text-[14.5px] text-text shadow-[0_1px_2px_#00000008] focus-visible:border-primary focus-visible:ring-0';

function NumberField({
  id,
  label,
  error,
  ...props
}: { id: string; label: string; error?: string } & React.ComponentProps<
  typeof Input
>) {
  return (
    <Field
      className="grow basis-0 gap-1.75"
      data-invalid={!!error || undefined}
    >
      <FieldLabel htmlFor={id} className={LABEL_CLASS}>
        {label}
      </FieldLabel>
      <Input
        id={id}
        aria-invalid={!!error || undefined}
        className={INPUT_CLASS}
        {...props}
      />
      {error && (
        <FieldError className="font-sans text-[12px]">{error}</FieldError>
      )}
    </Field>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingFormSchema),
    defaultValues: ONBOARDING_DEFAULTS,
  });

  // A returning (stepped-back) user has a saved profile + goal to prefill; a new
  // user has neither and keeps the defaults.
  useEffect(() => {
    let cancelled = false;
    getOnboardingData()
      .then(({ profile: savedProfile, goal }) => {
        if (cancelled || !savedProfile || !goal) return;
        reset({
          age: savedProfile.age,
          sex: savedProfile.sex,
          heightCm: savedProfile.heightCm,
          activityLevel: savedProfile.activityLevel,
          currentWeightKg: goal.startWeightKg,
          targetWeightKg: goal.targetWeightKg,
        });
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reset]);

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      const {
        age,
        sex,
        heightCm,
        activityLevel,
        currentWeightKg,
        targetWeightKg,
      } = values;
      await profile.put({ age, sex, heightCm, activityLevel, currentWeightKg });
      await weights.create({
        weightKg: currentWeightKg,
        recordedAt: new Date().toISOString(),
      });
      await goals.create({
        targetWeightKg,
        preferredWeeklyChangeKg: DEFAULT_GOAL_PACE,
      });
      router.push('/plan-selection');
    } catch {
      setSubmitError("Couldn't save your details. Please try again.");
    }
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-text-muted" />
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="mx-auto flex w-full max-w-md flex-col bg-bg pt-1.5 pb-5"
    >
      <div className="flex flex-col gap-1 px-5 pb-4.5">
        <Link
          href="/"
          className="mb-2 flex size-5.5 shrink-0 items-center justify-center"
        >
          <ChevronLeft size={18} className="text-[#333333]" strokeWidth={2} />
        </Link>
        <h1 className="font-display text-[26px] font-semibold tracking-[-0.01em] text-text">
          Tell us about you
        </h1>
        <p className="font-sans text-label text-text-muted">
          We&apos;ll use this to calculate your daily calorie target.
        </p>
      </div>

      <div className="flex flex-col gap-5 px-5 pt-4.5">
        <div className="flex gap-3">
          <NumberField
            id="age"
            label="Age"
            type="number"
            inputMode="numeric"
            error={errors.age?.message}
            {...register('age', { valueAsNumber: true })}
          />
          <NumberField
            id="heightCm"
            label="Height (cm)"
            type="number"
            inputMode="numeric"
            error={errors.heightCm?.message}
            {...register('heightCm', { valueAsNumber: true })}
          />
        </div>

        <Field className="gap-1.75">
          <FieldLabel className={LABEL_CLASS}>Sex</FieldLabel>
          <Controller
            control={control}
            name="sex"
            render={({ field }) => (
              <ToggleGroup
                value={field.value ? [field.value] : []}
                onValueChange={(values) =>
                  values[0] && field.onChange(values[0])
                }
                spacing={2}
                className="w-full gap-2"
              >
                <ToggleGroupItem value="female" className={TOGGLE_ITEM_CLASS}>
                  Female
                </ToggleGroupItem>
                <ToggleGroupItem value="male" className={TOGGLE_ITEM_CLASS}>
                  Male
                </ToggleGroupItem>
              </ToggleGroup>
            )}
          />
        </Field>

        <div className="flex gap-3">
          <NumberField
            id="currentWeightKg"
            label="Current weight (kg)"
            type="number"
            inputMode="numeric"
            error={errors.currentWeightKg?.message}
            {...register('currentWeightKg', { valueAsNumber: true })}
          />
          <NumberField
            id="targetWeightKg"
            label="Target weight (kg)"
            type="number"
            inputMode="numeric"
            error={errors.targetWeightKg?.message}
            {...register('targetWeightKg', { valueAsNumber: true })}
          />
        </div>

        <Field className="gap-1.75">
          <FieldLabel className={LABEL_CLASS}>Activity level</FieldLabel>
          <Controller
            control={control}
            name="activityLevel"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="h-11.5 w-full rounded-sm border-border bg-surface px-3.5 font-sans text-[14.5px] text-text shadow-[0_1px_2px_#00000008]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {activityLevelSchema.options.map((level) => (
                    <SelectItem key={level} value={level}>
                      {ACTIVITY_LEVEL_LABELS[level]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
      </div>

      <div className="px-5 pt-4 pb-1 font-sans text-[11.5px] text-text-muted">
        This is an estimate, not medical advice. Actual results vary.
      </div>

      <div className="flex flex-col gap-2.5 px-5 pt-3">
        {submitError && (
          <p role="alert" className="font-sans text-[12px] text-destructive">
            {submitError}
          </p>
        )}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-12.5 w-full rounded-sm bg-primary text-[15px] shadow-[0_2px_8px_#f5a65c59]"
        >
          {isSubmitting && <Loader2 className="size-4 animate-spin" />}
          Continue
        </Button>
      </div>
    </form>
  );
}
