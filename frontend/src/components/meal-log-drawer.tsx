'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { Pencil, TriangleAlert } from 'lucide-react';
import NumberFlow from '@number-flow/react';
import { useForm, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  aiParseRequestSchema,
  type AiParsedMeal,
  type MealResponse,
} from '@foodnote/shared';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerTitleBar,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Disclaimer } from '@/components/disclaimer';
import {
  MEAL_FORM_ID,
  MealItemsFields,
  MealNameField,
  MealTotalsFields,
  MealTotalsSummary,
  MealTypeField,
  mealDraftSchema,
  useMealTotals,
  type MealDraftValues,
} from '@/components/meal-fields';
import { cn } from '@/lib/utils';
import { useMeals } from '@/lib/meals-context';
import { ApiError, meals as mealsApi } from '@/lib/api-client';
import { mealTypeForHour } from '@/lib/dashboard-transforms';
import { macroCalorieSuggestion, sumItems } from '@/lib/meal-draft';
import { useControllableState } from '@/hooks/use-controllable-state';

/**
 * Logging a meal, AI-first. Every state is a step inside this one container —
 * the manual form included — because a dialog stacked on an open sheet means
 * two focus traps, two Escape layers and, on mobile, two things fighting for
 * the keyboard.
 *
 * A parse never writes (ADR-0006): what it returns is a proposal the user
 * confirms, and only the confirm posts.
 */
type Step =
  | 'input'
  | 'manual'
  | 'loading'
  | 'preview'
  | 'not-food'
  | 'error'
  // Editing an existing Meal Entry: the same field blocks as the parsed
  // preview, but it is the first and only step — there is nothing to parse.
  | 'edit';

/** The AI call is a live model round-trip; past this it isn't coming. */
const PARSE_TIMEOUT_MS = 15_000;

const EXAMPLES = [
  'Two eggs and toast',
  'Oatmeal 60 g with banana',
  'Chicken breast 200 g and rice',
  'Greek yoghurt 150 g with honey',
  'Tuna salad and a slice of bread',
  'Cappuccino and a croissant',
  'Salmon 180 g with potatoes',
  'Pasta bolognese, a large plate',
  'Protein shake with milk',
  'Turkey sandwich and an apple',
  'Scrambled eggs, bacon and coffee',
  'Lentil soup and rye bread',
  'Beef steak 250 g with vegetables',
  'Cottage cheese 200 g with berries',
  'Chicken caesar salad',
  'Sushi, eight pieces',
  'Banana and a handful of almonds',
  'Pepperoni pizza, three slices',
  'Buckwheat 150 g with a fried egg',
  'Latte and a chocolate bar',
];

const EXAMPLE_CHIPS = 3;

/** A sample without replacement, so the three chips are never duplicates.
    Called on open and never during render: picking while rendering would give
    the server and the hydrating client different chips. */
function pickExamples() {
  const pool = [...EXAMPLES];
  return Array.from(
    { length: EXAMPLE_CHIPS },
    () => pool.splice(Math.floor(Math.random() * pool.length), 1)[0],
  );
}

// Static, so building it per render only allocates a closure useForm drops.
const mealDraftResolver = zodResolver(mealDraftSchema);

const emptyDraft = (): MealDraftValues => ({
  mealName: '',
  mealType: mealTypeForHour(new Date().getHours()),
  totalCalories: 0,
  proteinGrams: 0,
  carbsGrams: 0,
  fatGrams: 0,
  items: [],
});

const draftFromMeal = (meal: MealResponse): MealDraftValues => ({
  mealName: meal.mealName,
  mealType: meal.mealType,
  totalCalories: meal.totalCalories,
  proteinGrams: meal.proteinGrams,
  carbsGrams: meal.carbsGrams,
  fatGrams: meal.fatGrams,
  items: meal.items,
});

// One component, mode-switched, rather than a second drawer for editing — the
// two would restate the same field blocks, validation and save button (the same
// call WeightDrawer makes for "Log weight" / "Edit entry", #36).
type MealLogDrawerProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  // Layout only — the trigger's own look stays in the component. `/meals` and
  // the desktop dashboard need it to sit right in their columns.
  triggerClassName?: string;
  children?: React.ReactNode;
} & ({ mode?: 'create' } | { mode: 'edit'; meal: MealResponse });

export function MealLogDrawer(props: MealLogDrawerProps) {
  const {
    open: controlledOpen,
    onOpenChange,
    triggerClassName,
    children,
  } = props;
  const editing = props.mode === 'edit' ? props.meal : undefined;
  // MealsProvider owns the optimistic save/reconcile + the success toast+undo,
  // since Undo (DELETE) needs the server id and rollback is the provider's job.
  const { saveMeal, updateMeal } = useMeals();
  const [open, setOpen] = useControllableState(
    controlledOpen,
    onOpenChange,
    false,
  );

  const [step, setStep] = useState<Step>(editing ? 'edit' : 'input');
  const [description, setDescription] = useState('');
  const [notFoodReason, setNotFoodReason] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const [confidenceNote, setConfidenceNote] = useState<string | null>(null);
  // Once the user sets a total by hand the items stop driving it — they become
  // illustration again and both are posted as shown (ADR-0008). A stored meal
  // is in that state from the outset: its totals are already the source of
  // truth, so opening it to edit must not let an item edit rewrite them.
  const [totalsOverridden, setTotalsOverridden] = useState(!!editing);

  const abortRef = useRef<AbortController | null>(null);
  const timedOutRef = useRef(false);

  const form = useForm<MealDraftValues>({
    resolver: mealDraftResolver,
    defaultValues: editing ? draftFromMeal(editing) : emptyDraft(),
  });

  // One evaluation feeds both the submit guard and the button's enabled state,
  // so the two can't disagree about what counts as parseable.
  const parsedDescription = useMemo(
    () => aiParseRequestSchema.safeParse({ description }),
    [description],
  );

  const abortParse = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  // A response that lands after the user has moved on must not resurrect a
  // step they left; aborting on close is what guarantees that.
  useEffect(() => abortParse, [abortParse]);

  function reset() {
    setStep(editing ? 'edit' : 'input');
    setDescription('');
    setNotFoodReason(null);
    setRateLimited(false);
    setConfidenceNote(null);
    // A stored meal's totals are the source of truth (ADR-0008), so editing one
    // starts already "overridden": correcting an item must not silently rewrite
    // the figure the day's calories were counted from.
    setTotalsOverridden(!!editing);
    form.reset(editing ? draftFromMeal(editing) : emptyDraft());
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      abortParse();
      setTimeout(reset, 300);
    }
    setOpen(next);
  }

  /** Load a Parsed Meal into the form. Its own totals stand until an item is
      edited — we never silently contradict the numbers the model returned. */
  function loadParsedMeal(meal: AiParsedMeal) {
    form.reset({
      mealName: meal.mealName,
      mealType: mealTypeForHour(new Date().getHours()),
      totalCalories: meal.totalCalories,
      proteinGrams: meal.proteinGrams,
      carbsGrams: meal.carbsGrams,
      fatGrams: meal.fatGrams,
      items: meal.items,
    });
    setConfidenceNote(meal.confidenceNote);
    setTotalsOverridden(false);
  }

  async function handleParse() {
    if (!parsedDescription.success) return;

    abortParse();
    const controller = new AbortController();
    abortRef.current = controller;
    timedOutRef.current = false;
    const timeout = setTimeout(() => {
      timedOutRef.current = true;
      controller.abort();
    }, PARSE_TIMEOUT_MS);

    setRateLimited(false);
    setStep('loading');

    try {
      const result = await mealsApi.aiParse(
        parsedDescription.data,
        controller.signal,
      );
      if (controller.signal.aborted) return;
      if (result.parsed) {
        loadParsedMeal(result.meal);
        setStep('preview');
      } else {
        setNotFoodReason(result.reason);
        setStep('not-food');
      }
    } catch (error) {
      // A user-initiated cancel already returned us to the input step; only a
      // timeout should surface as a failure.
      if (controller.signal.aborted && !timedOutRef.current) return;
      // 429 is transient and the text is still good — keep them on the input
      // step. A 502 is terminal (ADR-0006), so retrying is the wrong headline.
      if (error instanceof ApiError && error.status === 429) {
        setRateLimited(true);
        setStep('input');
      } else {
        setStep('error');
      }
    } finally {
      clearTimeout(timeout);
      if (abortRef.current === controller) abortRef.current = null;
    }
  }

  function handleCancelParse() {
    abortParse();
    setStep('input');
  }

  /** The AI is unreachable — carry the description over so the manual form
      isn't a blank page after a failure. */
  function switchToManual(seedName?: string) {
    if (seedName) {
      const firstSentence = seedName.split(/[.!?\n]/)[0].trim() || seedName;
      form.setValue('mealName', firstSentence.slice(0, 200));
    }
    setStep('manual');
  }

  /** Items drive the totals until the user takes them over. Safe to read
      synchronously: react-hook-form writes the field (and useFieldArray writes
      the array) before it calls back here. */
  const handleItemsChange = useCallback(() => {
    if (totalsOverridden) return;
    const next = sumItems(form.getValues('items') ?? []);
    form.setValue('totalCalories', next.totalCalories);
    form.setValue('proteinGrams', next.proteinGrams);
    form.setValue('carbsGrams', next.carbsGrams);
    form.setValue('fatGrams', next.fatGrams);
  }, [form, totalsOverridden]);

  function handleSave(values: MealDraftValues) {
    setOpen(false);
    if (editing) {
      // No recordedAt and no source in the patch: an edit corrects a meal's
      // figures, it doesn't move it to another Tracking Day or turn an AI parse
      // into a manual entry.
      updateMeal(editing, values);
    } else {
      saveMeal({
        ...values,
        recordedAt: new Date().toISOString(),
        source: step === 'manual' ? 'manual' : 'ai',
      });
    }
    setTimeout(reset, 300);
  }

  const canParse = parsedDescription.success;

  return (
    <Drawer open={open} onOpenChange={handleOpenChange} responsiveSide>
      {children && (
        <DrawerTrigger
          className={cn(
            'h-12.5 grow-2 basis-0 rounded-md bg-primary text-surface shadow-cta lg:grow-0 lg:px-6',
            triggerClassName,
          )}
        >
          {children}
        </DrawerTrigger>
      )}

      <DrawerContent>
        <DrawerTitleBar>
          {step === 'edit'
            ? 'Edit meal'
            : step === 'preview'
              ? 'Review your meal'
              : step === 'manual'
                ? 'Enter a meal'
                : 'Log a meal'}
        </DrawerTitleBar>

        {step === 'input' && (
          <StepPanel key="input">
            <div className="flex flex-col gap-3 px-5 pt-5">
              <DrawerDescription className="font-sans text-caption font-medium text-text">
                Describe what you ate
              </DrawerDescription>
              <textarea
                autoFocus
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setRateLimited(false);
                }}
                rows={4}
                placeholder="Chicken breast 200 g, rice 150 g and a salad…"
                className="min-h-32.5 rounded-md border-[1.5px] border-primary bg-surface p-3.5 font-sans text-[14.5px] text-text shadow-focus-primary focus:outline-none"
              />
              <ExampleChips
                show={description.length === 0}
                onPick={setDescription}
              />
              <div className="font-sans text-[12px] text-text-muted">
                One meal at a time. Portions can be approximate — you&apos;ll
                review before saving.
              </div>
              {rateLimited && (
                <p role="alert" className="font-sans text-[12px] text-error">
                  That&apos;s a lot of parsing at once — give it a few seconds
                  and try again.
                </p>
              )}
            </div>
            <DrawerFooter className="items-center gap-3.5 pt-4.5 pb-5">
              <Button
                onClick={handleParse}
                disabled={!canParse}
                variant="cta"
                size="cta"
              >
                Parse with AI
              </Button>
              <Button
                variant="quiet"
                size="inline"
                onClick={() => switchToManual()}
              >
                Enter manually instead
              </Button>
            </DrawerFooter>
          </StepPanel>
        )}

        {step === 'loading' && (
          <StepPanel key="loading">
            {/* flex-1 + justify-center so the wait sits in the middle of a
                full-height desktop panel; on mobile the sheet is content-sized
                and there is no slack to centre in, so it just stacks. Cancel
                lives in here rather than in the footer — pinned to the bottom
                it ended up a screen away from the thing it cancels. */}
            <div
              aria-busy="true"
              aria-live="polite"
              className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 px-6 py-12"
            >
              <div className="flex size-33 shrink-0 items-center justify-center rounded-full bg-primary-tint">
                <Image
                  src="/mascot/defaultlogo.png"
                  alt=""
                  width={104}
                  height={104}
                  className="size-26"
                />
              </div>
              <div className="font-sans text-[14.5px] font-medium text-text">
                Reading your meal…
              </div>
              <div className="h-1.5 w-40 shrink-0 overflow-hidden rounded-full bg-track">
                <div className="h-full w-full origin-left rounded-full bg-primary animate-indeterminate" />
              </div>
              <Button
                variant="quiet"
                size="inline"
                onClick={handleCancelParse}
                className="mt-1"
              >
                Cancel
              </Button>
            </div>
          </StepPanel>
        )}

        {(step === 'preview' || step === 'manual' || step === 'edit') && (
          <StepPanel key="form">
            <form
              id={MEAL_FORM_ID}
              onSubmit={form.handleSubmit(handleSave)}
              noValidate
              className="flex min-h-0 flex-col gap-4.5 overflow-y-auto px-5 pt-4 pb-2"
            >
              {/* Below the title rather than beside it: level with the title it
                  read as a second heading and crowded the centred label. */}
              {step === 'manual' && (
                <Button
                  type="button"
                  variant="quiet"
                  size="inline"
                  onClick={() => setStep('input')}
                  className="w-fit"
                >
                  ← Back
                </Button>
              )}

              {step === 'preview' && (
                <div className="flex items-center gap-2 rounded-md bg-primary-tint-soft px-3.5 py-2.5">
                  <span className="min-w-0 grow basis-0 truncate font-sans text-[12.5px] text-text-warm">
                    “{description}”
                  </span>
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => setStep('input')}
                    className="h-auto shrink-0 gap-1 p-0 text-[12px] text-primary-deep no-underline"
                  >
                    <Pencil className="size-3" />
                    Edit &amp; re-parse
                  </Button>
                </div>
              )}

              <MealNameField form={form} />

              {/* Editing shows the items too, but they stay illustration: with
                  totalsOverridden set they no longer feed the totals. */}
              {(step === 'preview' || step === 'edit') && (
                <MealItemsFields
                  form={form}
                  onItemsChange={handleItemsChange}
                />
              )}

              {/* Read-only in the parsed preview: the items are the editable
                  surface, and correcting a figure there recomputes these
                  tiles. Taking the totals over by hand is reachable from the
                  macro suggestion below, and manual entry has its own step. */}
              {step === 'preview' && !totalsOverridden ? (
                <MealTotalsSummary control={form.control} />
              ) : (
                <>
                  <MealTotalsFields
                    form={form}
                    onUserEdit={() => setTotalsOverridden(true)}
                  />
                  {step === 'preview' && (
                    <div className="font-sans text-[11.5px] text-text-muted">
                      Totals set by hand — they no longer follow the items.
                    </div>
                  )}
                </>
              )}

              <MacroSuggestion
                control={form.control}
                onUse={(kcal) => {
                  form.setValue('totalCalories', kcal);
                  setTotalsOverridden(true);
                }}
              />

              <MealTypeField form={form} />

              {step === 'preview' && confidenceNote && (
                <div className="flex flex-col gap-2 rounded-md bg-primary-tint-soft px-3.5 py-3">
                  <div className="flex items-center gap-2.5">
                    <Image
                      src="/mascot/reassure.webp"
                      alt=""
                      width={40}
                      height={40}
                      className="size-10 shrink-0"
                    />
                    <div className="font-sans text-[12.5px] text-text-warm">
                      {confidenceNote}
                    </div>
                  </div>
                  <Disclaimer />
                </div>
              )}
            </form>

            <DrawerFooter className="pt-4 pb-5">
              <SaveButton control={form.control} />
            </DrawerFooter>
          </StepPanel>
        )}

        {step === 'not-food' && (
          <RecoverStep
            message={
              notFoodReason ??
              'That doesn’t look like a meal. Try describing what you ate — like “two eggs and toast.”'
            }
            primary={{
              label: 'Try again',
              onClick: handleParse,
              disabled: !canParse,
            }}
            secondary={{
              label: 'Enter manually instead',
              onClick: () => switchToManual(description),
            }}
          >
            <div className="flex flex-col gap-2.5 px-5 pt-3.5">
              <div className="font-sans text-caption font-medium text-text">
                Describe what you ate
              </div>
              <textarea
                autoFocus
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="min-h-22.5 rounded-md border-[1.5px] border-error bg-surface p-3.5 font-sans text-[14.5px] text-text focus:outline-none"
              />
            </div>
          </RecoverStep>
        )}

        {step === 'error' && (
          // Manual leads: the failures that land here are terminal (ADR-0006),
          // so "try again" is the wrong thing to make prominent.
          <RecoverStep
            message="AI logging isn’t available right now. You can still enter the meal yourself — nothing you typed is lost."
            primary={{
              label: 'Enter manually',
              onClick: () => switchToManual(description),
            }}
            secondary={{ label: 'Try again', onClick: handleParse }}
          />
        )}
      </DrawerContent>
    </Drawer>
  );
}

function ExampleChips({
  show,
  onPick,
}: {
  show: boolean;
  onPick: (example: string) => void;
}) {
  const [examples] = useState(pickExamples);

  if (!show) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {examples.map((example) => (
        <Button
          key={example}
          variant="outline"
          onClick={() => onPick(example)}
          className="rounded-full px-4 h-8 font-sans text-caption text-text-muted"
        >
          {example}
        </Button>
      ))}
    </div>
  );
}

/**
 * Wraps a step so it fades and rises into place instead of blinking in.
 * Keyed on the step in the caller, so React remounts it and @starting-style
 * has something to start from.
 *
 * The purpose is not decoration: swapping a whole panel with no transition
 * reads as a glitch, especially here where the drawer's height changes at the
 * same moment. Under reduced motion the fade stays and the travel goes.
 */
function StepPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="motion-keep-fade flex min-h-0 flex-1 flex-col transition-[opacity,transform] duration-200 ease-out-strong starting:translate-y-1 starting:opacity-0">
      {children}
    </div>
  );
}

/** The RECOVER mascot state: something went wrong, here is the way out. */
function RecoverStep({
  message,
  primary,
  secondary,
  children,
}: {
  message: string;
  primary: { label: string; onClick: () => void; disabled?: boolean };
  secondary: { label: string; onClick: () => void };
  children?: React.ReactNode;
}) {
  return (
    <>
      <div className="flex flex-col items-center gap-3.5 px-6 pt-9 pb-2">
        <div className="flex size-30 shrink-0 items-center justify-center rounded-full bg-error-bg">
          <Image
            src="/mascot/recover.webp"
            alt=""
            width={96}
            height={96}
            className="size-24"
          />
        </div>
        {/* Announced and framed as a failure: the mascot alone reads as a
            friendly illustration, so nothing told the user the parse had not
            worked. The tinted panel and the icon carry that, and `role=alert`
            makes a screen reader say it. */}
        <div
          role="alert"
          className="flex max-w-4/5 items-start gap-2.5 rounded-md border border-error/45 bg-error-bg px-3.5 py-3"
        >
          <TriangleAlert
            aria-hidden
            className="mt-px size-4 shrink-0 text-error"
          />
          <div className="font-sans text-[14.5px] text-text text-pretty">
            {message}
          </div>
        </div>
      </div>
      {children}
      <DrawerFooter className="items-center gap-3.5 pt-4.5 pb-5">
        <Button
          onClick={primary.onClick}
          disabled={primary.disabled}
          variant="cta"
          size="cta"
        >
          {primary.label}
        </Button>
        <Button variant="quiet" size="inline" onClick={secondary.onClick}>
          {secondary.label}
        </Button>
      </DrawerFooter>
    </>
  );
}

/** Carries the running total, which is the flow's main trust signal. */
function SaveButton({ control }: { control: Control<MealDraftValues> }) {
  const { totalCalories } = useMealTotals(control);
  return (
    <>
      {/* A total recomputed from an item edit changes away from the field
          being typed in, so announce it. */}
      <span aria-live="polite" className="sr-only">
        {totalCalories} kcal total
      </span>
      <Button type="submit" form={MEAL_FORM_ID} variant="cta" size="cta">
        Save
        {totalCalories > 0 && (
          <>
            {' · '}
            <NumberFlow value={totalCalories} suffix=" kcal" />
          </>
        )}
      </Button>
    </>
  );
}

/** Offers the macro-derived calorie figure when it disagrees with the stated
    one. Informational only — it never blocks the save. */
function MacroSuggestion({
  control,
  onUse,
}: {
  control: Control<MealDraftValues>;
  onUse: (kcal: number) => void;
}) {
  const suggestion = macroCalorieSuggestion(useMealTotals(control));
  if (suggestion === null) return null;
  return (
    <div className="flex items-center gap-2 font-sans text-[12px] text-text-muted">
      <span>By macros that&apos;s {suggestion} kcal.</span>
      <Button
        type="button"
        variant="link"
        size="inline"
        onClick={() => onUse(suggestion)}
        className="text-[12px] text-primary-deep"
      >
        Use it
      </Button>
    </div>
  );
}
