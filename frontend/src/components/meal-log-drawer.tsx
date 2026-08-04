'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import Image from 'next/image';
import {
  ArrowLeftIcon,
  Bookmark,
  BookmarkCheck,
  Pencil,
  TriangleAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import NumberFlow from '@number-flow/react';
import {
  useForm,
  useWatch,
  type Control,
  type UseFormReturn,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  aiParseRequestSchema,
  perPortion,
  type AiParsedMeal,
  type AiParseRequest,
  type MealItem,
  type MealResponse,
  type MealSource,
} from '@foodnote/shared';
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerTitleBar,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import { InputGroup, InputGroupTextarea } from '@/components/ui/input-group';
import { Textarea } from '@/components/ui/textarea';
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
import {
  ApiError,
  meals as mealsApi,
  savedMeals as savedMealsApi,
} from '@/lib/api-client';
import { mealTypeForHour } from '@/lib/dashboard-transforms';
import { macroCalorieSuggestion, sumItems } from '@/lib/meal-draft';
import { useControllableState } from '@/hooks/use-controllable-state';
import { VoiceDictation } from '@/components/voice-dictation';

/**
 * The step, and whatever only that step knows. A parsed meal's confidence note
 * and a not-food verdict's reason used to be their own nullable state, which
 * meant `reset()` had to clear them and the render had to re-check the step
 * before reading them. Here they can't outlive the step they belong to.
 */
type View =
  | { step: 'ai-input' }
  | { step: 'manual' }
  | { step: 'loading' }
  | { step: 'preview'; confidenceNote: string | null }
  | { step: 'not-food'; reason: string }
  | { step: 'error' }
  // Correcting a stored Meal Entry: the first and only step, since there is
  // nothing to parse and nowhere to step back to.
  | { step: 'edit' };

const STEP_TITLES: Record<View['step'], string> = {
  'ai-input': 'Log a meal',
  manual: 'Enter a meal',
  loading: 'Log a meal',
  preview: 'Review your meal',
  'not-food': 'Log a meal',
  error: 'Log a meal',
  edit: 'Edit meal',
};

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
const parseResolver = zodResolver(aiParseRequestSchema);

/** The description is a form field like any other, so the AI step is a form. */
const PARSE_FORM_ID = 'ai-parse-form';

/** The seeded name has to survive the same validation the field does, so this
    tracks `mealNameSchema.max(200)` in `shared/src/common.ts`. Read from the
    schema it would be `number | null`, and a null would silently slice the seed
    to nothing — worse than a stated number. */
const MEAL_NAME_MAX = 200;

const emptyDraft = (): MealDraftValues => ({
  mealName: '',
  mealType: mealTypeForHour(new Date().getHours()),
  totalCalories: 0,
  proteinGrams: 0,
  carbsGrams: 0,
  fatGrams: 0,
  items: [],
});

/**
 * The items as the contract wants them. The four per-portion figures the form
 * carries — for the inputs and for `sumItems` — are display only, derived from
 * `per100g × portionGrams / 100`, and are not part of `mealItemSchema`; only
 * the weight and the density go on the wire. The meal-level totals are a
 * different thing and are untouched.
 *
 * Two callers: logging a meal, and keeping one for reuse.
 */
function toWireItems(items: MealDraftValues['items']): MealItem[] {
  return (items ?? []).map(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ({ calories, proteinGrams, carbsGrams, fatGrams, ...item }) => item,
  );
}

const draftFromMeal = (meal: MealResponse): MealDraftValues => ({
  mealName: meal.mealName,
  mealType: meal.mealType,
  totalCalories: meal.totalCalories,
  proteinGrams: meal.proteinGrams,
  carbsGrams: meal.carbsGrams,
  fatGrams: meal.fatGrams,
  items: meal.items.map((item) => ({
    ...item,
    // Populate per-portion display fields so the inputs show the right
    // figures and sumItems can still drive the totals on item edits.
    ...(item.per100g && item.portionGrams
      ? perPortion(item.per100g, item.portionGrams)
      : { calories: 0, proteinGrams: 0, carbsGrams: 0, fatGrams: 0 }),
  })),
});

/**
 * Logging a meal, AI-first. Every state is a step inside this one container —
 * the manual form included — because a dialog stacked on an open sheet means
 * two focus traps, two Escape layers and, on mobile, two things fighting for
 * the keyboard.
 *
 * Two forms, one per input the user actually fills: `parseForm` holds the
 * description the AI reads, `form` holds the draft that gets posted. A parse
 * never writes (ADR-0006) — what it returns is a proposal the user confirms,
 * and only the confirm posts.
 *
 * `mode: 'edit'` reuses all of that for a stored meal rather than a second
 * drawer, the same call `WeightLogDrawer` makes for "Log weight" / "Edit
 * entry" (#36): the two would restate the same field blocks, validation and
 * save button.
 */
type MealLogDrawerProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * The whole button that opens the drawer — variant, size, layout, icon and
   * label all belong to the caller. Not `children`: on a drawer that reads as
   * the drawer's own content, which is the one thing it isn't. Not
   * `triggerClassName` either — a class string can't change the variant or the
   * size, only fight the classes underneath it, and all four call sites were
   * passing layout to undo a default they never asked for.
   *
   * Omit it when driving `open` yourself; the caller then owns the trigger
   * outright and a second one here would sit in the tab order.
   */
  trigger?: React.ReactElement;
} & ({ mode?: 'create' } | { mode: 'edit'; meal: MealResponse });

export function MealLogDrawer(props: MealLogDrawerProps) {
  const { open: controlledOpen, onOpenChange, trigger } = props;
  const editing = props.mode === 'edit' ? props.meal : undefined;
  // MealsProvider owns the optimistic save/reconcile + the success toast+undo,
  // since Undo (DELETE) needs the server id and rollback is the provider's job.
  const { saveMeal, updateMeal } = useMeals();
  const isMobile = useIsMobile();
  const [open, setOpen] = useControllableState(
    controlledOpen,
    onOpenChange,
    false,
  );

  const [view, setView] = useState<View>(
    editing ? { step: 'edit' } : { step: 'ai-input' },
  );
  const step = view.step;
  // Once the user sets a total by hand the items stop driving it — they become
  // illustration again and both are posted as shown (ADR-0008). A stored meal
  // is in that state from the outset: its totals are already the source of
  // truth, so correcting an item must not silently rewrite the figure the
  // day's calories were counted from.
  const [totalsOverridden, setTotalsOverridden] = useState(!!editing);

  const abortRef = useRef<AbortController | null>(null);

  const form = useForm<MealDraftValues>({
    resolver: mealDraftResolver,
    defaultValues: editing ? draftFromMeal(editing) : emptyDraft(),
  });

  /** `mode: 'onChange'` so the Parse button's enabled state is the resolver's
      verdict rather than a second opinion about what counts as parseable. */
  const parseForm = useForm<AiParseRequest>({
    resolver: parseResolver,
    defaultValues: { description: '' },
    mode: 'onChange',
  });

  function abortParse() {
    abortRef.current?.abort();
    abortRef.current = null;
  }

  // A response that lands after the user has moved on must not resurrect a
  // step they left; aborting on unmount is what guarantees that.
  useEffect(() => () => abortRef.current?.abort(), []);

  function reset() {
    setView(editing ? { step: 'edit' } : { step: 'ai-input' });
    setTotalsOverridden(!!editing);
    form.reset(editing ? draftFromMeal(editing) : emptyDraft());
    parseForm.reset({ description: '' });
  }

  /** Reset on the way in, never on the way out — the same rule `WeightLogDrawer`
      follows. Resetting after a delay on close raced the close animation, and
      it re-derived the default meal type at close time, so a page left open
      overnight seeded yesterday's meal. */
  function handleOpenChange(next: boolean) {
    if (next) reset();
    else abortParse();
    setOpen(next);
  }

  /** Load a Parsed Meal into the form. The payload deliberately shares the
      draft's field names (see `shared/src/meals.ts`), so spreading it is what
      keeps that contract worth having — only `confidenceNote` isn't a field.
      Per-portion display fields are computed from each item's per100g and
      portionGrams so sumItems and the figure inputs show the right values.
      Its own totals stand until an item is edited: we never silently
      contradict the numbers the model returned. */
  function loadParsedMeal(meal: AiParsedMeal) {
    const { confidenceNote, ...draft } = meal;
    form.reset({
      ...emptyDraft(),
      ...draft,
      items: draft.items.map((item) => ({
        ...item,
        ...(item.per100g && item.portionGrams
          ? perPortion(item.per100g, item.portionGrams)
          : { calories: 0, proteinGrams: 0, carbsGrams: 0, fatGrams: 0 }),
      })),
    });
    setTotalsOverridden(false);
    setView({ step: 'preview', confidenceNote });
  }

  async function runParse({ description }: AiParseRequest) {
    abortParse();
    const controller = new AbortController();
    abortRef.current = controller;
    // Local, not a ref: it is written and read inside this one call, and as a
    // ref two overlapping parses shared it. It exists because an AbortError
    // doesn't say who aborted, and a user cancel must not surface as a failure.
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, PARSE_TIMEOUT_MS);

    setView({ step: 'loading' });

    try {
      const result = await mealsApi.aiParse({ description }, controller.signal);
      if (controller.signal.aborted) return;
      if (result.parsed) loadParsedMeal(result.meal);
      else setView({ step: 'not-food', reason: result.reason });
    } catch (error) {
      if (controller.signal.aborted && !timedOut) return;
      if (error instanceof ApiError && error.status === 429) {
        setView({ step: 'ai-input' });
        parseForm.setError('description', {
          message:
            "That's a lot of parsing at once — give it a few seconds and try again.",
        });
      } else {
        setView({ step: 'error' });
      }
    } finally {
      clearTimeout(timeout);
      if (abortRef.current === controller) abortRef.current = null;
    }
  }

  /** The submit path for both entry points to a parse: the input step's form,
      and "Try again" on the not-food step. Built inside the handler rather than
      at render level, so `runParse` reading `abortRef` isn't a ref read during
      render (react-hooks/refs). */
  const handleParse = () => parseForm.handleSubmit(runParse)();

  function handleCancelParse() {
    abortParse();
    setView({ step: 'ai-input' });
  }

  /** The AI is unreachable — carry the description over so the manual form
      isn't a blank page after a failure. */
  function switchToManual(seed?: string) {
    if (seed) {
      const firstSentence = seed.split(/[.!?\n]/)[0].trim() || seed;
      form.setValue('mealName', firstSentence.slice(0, MEAL_NAME_MAX));
    }
    setView({ step: 'manual' });
  }

  /** Items drive the totals until the user takes them over. Safe to read
      synchronously: react-hook-form writes the field (and useFieldArray writes
      the array) before it calls back here. Not memoized: `MealItemsFields`
      isn't, so a stable identity was never observed. */
  function handleItemsChange() {
    if (totalsOverridden) return;
    const next = sumItems(form.getValues('items') ?? []);
    form.setValue('totalCalories', next.totalCalories);
    form.setValue('proteinGrams', next.proteinGrams);
    form.setValue('carbsGrams', next.carbsGrams);
    form.setValue('fatGrams', next.fatGrams);
  }

  /**
   * How the figures on screen were produced. It goes onto a new Meal Entry and
   * onto a Saved Meal kept from this draft — a kept parse still reads as `ai`.
   * A stored meal keeps its own: an edit corrects figures, it does not rewrite
   * where they came from.
   */
  const draftSource: MealSource = editing
    ? editing.source
    : step === 'manual'
      ? 'manual'
      : 'ai';

  function handleSave(values: MealDraftValues) {
    const items = toWireItems(values.items);
    if (editing) {
      // No recordedAt and no source in the patch: an edit corrects a meal's
      // figures, it doesn't move it to another Tracking Day or turn an AI parse
      // into a manual entry.
      updateMeal(editing, { ...values, items });
    } else {
      saveMeal({
        ...values,
        items,
        recordedAt: new Date().toISOString(),
        source: draftSource,
      });
    }
    // Closing resets: DrawerPortal unmounts the content, and `handleOpenChange`
    // re-seeds the forms on the way back in.
    setOpen(false);
  }

  // A snapshot, not a subscription: both readers render after a step change,
  // and watching here would re-render the whole drawer on every keystroke.
  const readDescription = () => parseForm.getValues('description');

  const pickExample = (example: string) =>
    parseForm.setValue('description', example, { shouldValidate: true });

  // The back link out of the manual step. Rendered into the title bar, never
  // floating in the body.
  const back =
    step === 'manual' ? (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        // The title bar is one row with the title and the close control, and
        // below 768 the full label leaves the title nowhere to go. The
        // accessible name stays the long one — a lone "Back" says where it
        // goes only to someone who can see the step behind it.
        aria-label="Back to AI Input"
        onClick={() => setView({ step: 'ai-input' })}
      >
        <ArrowLeftIcon /> {isMobile ? 'Back' : 'Back to AI Input'}
      </Button>
    ) : undefined;

  // Everything below the title bar.
  const steps = (
    <>
      {/* Outside the steps on purpose: a live region has to exist before its
          text changes, or the change is never announced — one mounted
          together with its own content says nothing. */}
      <span aria-live="polite" className="sr-only">
        {step === 'loading' ? 'Reading your meal…' : ''}
      </span>

      {step === 'ai-input' && (
        <StepPanel key="input">
          <DrawerBody>
            <form
              id={PARSE_FORM_ID}
              onSubmit={(event) => parseForm.handleSubmit(runParse)(event)}
              noValidate
              className="flex flex-col gap-3"
            >
              <DescriptionField
                parseForm={parseForm}
                autoFocus
                rows={4}
                placeholder="Chicken breast 200 g, rice 150 g and a salad…"
                className="min-h-32"
              />
              <ExampleChips control={parseForm.control} onPick={pickExample} />
            </form>
          </DrawerBody>
          <StepFooter
            primary={{
              label: (
                <>
                  Parse with AI <span aria-hidden="true">✨</span>
                </>
              ),
              type: 'submit',
              form: PARSE_FORM_ID,
              disabled: !parseForm.formState.isValid,
            }}
            secondary={{
              label: 'Enter manually instead',
              onClick: () => switchToManual(),
            }}
          />
        </StepPanel>
      )}

      {step === 'loading' && (
        <StepPanel key="loading">
          {/* flex-1 + justify-center so the wait sits in the middle of a
                full-height desktop panel; on mobile the sheet is content-sized
                and there is no slack to centre in, so it just stacks. Cancel
                lives in here rather than in the footer — pinned to the bottom
                it ended up a screen away from the thing it cancels.
                `aria-busy` only: the announcement is the drawer-level live
                region above, which exists before this panel mounts. */}
          <div
            aria-busy="true"
            className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 px-4 py-12"
          >
            {/* The round wash the mascot waits in. */}
            <div className="flex size-33 shrink-0 items-center justify-center rounded-full bg-accent">
              <Image
                src="/mascot/default.webp"
                alt=""
                width={104}
                height={104}
                className="size-26"
              />
            </div>
            <p className="text-sm font-semibold">Reading your meal…</p>
            <Progress indeterminate size="sm" className="w-40" />
            {/* The same shape as the header's Back: both step out of where
                  the user is, so they read as one control, not two ideas. */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCancelParse}
            >
              Cancel
            </Button>
          </div>
        </StepPanel>
      )}

      {view.step === 'preview' && (
        <StepPanel key="preview">
          <ReviewStep
            form={form}
            description={readDescription()}
            confidenceNote={view.confidenceNote}
            source={draftSource}
            totalsOverridden={totalsOverridden}
            onTakeOverTotals={() => setTotalsOverridden(true)}
            onItemsChange={handleItemsChange}
            onReparse={() => setView({ step: 'ai-input' })}
            onSubmit={form.handleSubmit(handleSave)}
          />
        </StepPanel>
      )}

      {step === 'manual' && (
        <StepPanel key="manual">
          <ManualStep
            form={form}
            source={draftSource}
            onTakeOverTotals={() => setTotalsOverridden(true)}
            onSubmit={form.handleSubmit(handleSave)}
          />
        </StepPanel>
      )}

      {step === 'edit' && (
        <StepPanel key="edit">
          <EditStep
            form={form}
            source={draftSource}
            onItemsChange={handleItemsChange}
            onTakeOverTotals={() => setTotalsOverridden(true)}
            onSubmit={form.handleSubmit(handleSave)}
          />
        </StepPanel>
      )}

      {view.step === 'not-food' && (
        <StepPanel key="not-food">
          <RecoverStep
            message={
              view.reason ||
              'That doesn’t look like a meal. Try describing what you ate — like “two eggs and toast.”'
            }
            primary={{
              label: 'Try again',
              onClick: handleParse,
              disabled: !parseForm.formState.isValid,
            }}
            secondary={{
              label: 'Enter manually instead',
              onClick: () => switchToManual(readDescription()),
            }}
          >
            <DrawerBody>
              <DescriptionField parseForm={parseForm} autoFocus rows={3} />
            </DrawerBody>
          </RecoverStep>
        </StepPanel>
      )}

      {step === 'error' && (
        // Manual leads: the failures that land here are terminal (ADR-0006),
        // so "try again" is the wrong thing to make prominent.
        <StepPanel key="error">
          <RecoverStep
            message="AI logging isn’t available right now. You can still enter the meal yourself — nothing you typed is lost."
            primary={{
              label: 'Enter manually',
              onClick: () => switchToManual(readDescription()),
            }}
            secondary={{ label: 'Try again', onClick: handleParse }}
          />
        </StepPanel>
      )}
    </>
  );

  // Nothing to render when the caller drives `open` itself.
  const showTrigger = controlledOpen === undefined && trigger;

  // One shell at every width: `responsiveSide` is what changes shape — a bottom
  // sheet in the thumb zone on a phone, a right-hand panel on desktop. Logging a
  // meal is not a modal question to answer; the day stays visible beside it.
  return (
    <Drawer open={open} onOpenChange={handleOpenChange} responsiveSide>
      {showTrigger && <DrawerTrigger render={trigger} />}
      <DrawerContent>
        {/* The shared header (#39): the title optically centred, one definition
            of the close button, and the back link in its `leading` slot. */}
        <DrawerTitleBar leading={back}>{STEP_TITLES[step]}</DrawerTitleBar>
        {steps}
      </DrawerContent>
    </Drawer>
  );
}

/**
 * The AI's proposal, up for confirmation. The items are the editable surface
 * here — correcting a figure there recomputes the totals tiles — so the totals
 * stay read-only until the user takes them over.
 */
function ReviewStep({
  form,
  description,
  confidenceNote,
  source,
  totalsOverridden,
  onTakeOverTotals,
  onItemsChange,
  onReparse,
  onSubmit,
}: {
  form: UseFormReturn<MealDraftValues>;
  description: string;
  confidenceNote: string | null;
  source: MealSource;
  totalsOverridden: boolean;
  onTakeOverTotals: () => void;
  onItemsChange: () => void;
  onReparse: () => void;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
}) {
  return (
    <>
      <DrawerBody>
        <form
          id={MEAL_FORM_ID}
          onSubmit={onSubmit}
          noValidate
          className="flex flex-col gap-5"
        >
          <Item size="sm" className="bg-accent">
            <ItemContent>
              <ItemTitle className="text-muted-foreground">
                “{description}”
              </ItemTitle>
            </ItemContent>
            <ItemActions>
              <Button
                type="button"
                variant="link"
                className="h-auto gap-2 p-0"
                onClick={onReparse}
              >
                <Pencil className="size-3" />
                Edit &amp; re-parse
              </Button>
            </ItemActions>
          </Item>

          <MealNameField form={form} />
          <MealItemsFields form={form} onItemsChange={onItemsChange} />

          {totalsOverridden ? (
            <>
              <MealTotalsFields form={form} onUserEdit={onTakeOverTotals} />
              <p className="text-sm text-muted-foreground">
                Totals set by hand — they no longer follow the items.
              </p>
            </>
          ) : (
            <MealTotalsSummary control={form.control} />
          )}

          <MacroSuggestion
            control={form.control}
            onUse={(kcal) => {
              form.setValue('totalCalories', kcal);
              onTakeOverTotals();
            }}
          />

          <MealTypeField form={form} />

          {confidenceNote && (
            <Item className="bg-accent">
              <ItemMedia variant="image">
                <Image
                  src="/mascot/reassure.webp"
                  alt=""
                  width={40}
                  height={40}
                />
              </ItemMedia>
              <ItemContent>
                {/* `line-clamp-none`: the note is the model's own words about
                    what it wasn't sure of, and two lines truncates the reason
                    away. */}
                <ItemDescription className="line-clamp-none text-foreground">
                  {confidenceNote}
                </ItemDescription>
                <Disclaimer />
              </ItemContent>
            </Item>
          )}
        </form>
      </DrawerBody>

      {/* `items-center gap-2`, as StepFooter does: one full-width action with a
          quiet link under it. */}
      <DrawerFooter className="items-center gap-2 pb-5">
        <SaveButton control={form.control} />
        <SaveToMyMealsButton form={form} source={source} />
      </DrawerFooter>
    </>
  );
}

/**
 * Typing a meal in by hand: the same field vocabulary, no items and no proposal
 * to confirm, so the totals are the editable surface from the start. A separate
 * component rather than a mode flag — the two steps shared one form body behind
 * five `step === 'preview'` checks, and neither could be read straight through.
 */
function ManualStep({
  form,
  source,
  onTakeOverTotals,
  onSubmit,
}: {
  form: UseFormReturn<MealDraftValues>;
  source: MealSource;
  onTakeOverTotals: () => void;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
}) {
  return (
    <>
      <DrawerBody>
        <form
          id={MEAL_FORM_ID}
          onSubmit={onSubmit}
          noValidate
          className="flex flex-col gap-5"
        >
          <MealNameField form={form} />
          <MealTotalsFields form={form} onUserEdit={onTakeOverTotals} />
          <MacroSuggestion
            control={form.control}
            onUse={(kcal) => {
              form.setValue('totalCalories', kcal);
              onTakeOverTotals();
            }}
          />
          <MealTypeField form={form} />
        </form>
      </DrawerBody>

      <DrawerFooter className="items-center gap-2 pb-5">
        <SaveButton control={form.control} />
        <SaveToMyMealsButton form={form} source={source} />
      </DrawerFooter>
    </>
  );
}

/**
 * Correcting a stored meal. The same field vocabulary as the parsed preview,
 * minus everything about the parse: there is no description to re-read, no
 * confidence note, and no proposal to confirm. The totals are editable from the
 * start rather than following the items — a stored meal's figures are already
 * what the day was counted from (ADR-0008), so the items below them are
 * illustration.
 */
function EditStep({
  form,
  source,
  onItemsChange,
  onTakeOverTotals,
  onSubmit,
}: {
  form: UseFormReturn<MealDraftValues>;
  source: MealSource;
  onItemsChange: () => void;
  onTakeOverTotals: () => void;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
}) {
  return (
    <>
      <DrawerBody>
        <form
          id={MEAL_FORM_ID}
          onSubmit={onSubmit}
          noValidate
          className="flex flex-col gap-5"
        >
          <MealNameField form={form} />
          <MealItemsFields form={form} onItemsChange={onItemsChange} />
          <MealTotalsFields form={form} onUserEdit={onTakeOverTotals} />
          <MacroSuggestion
            control={form.control}
            onUse={(kcal) => {
              form.setValue('totalCalories', kcal);
              onTakeOverTotals();
            }}
          />
          <MealTypeField form={form} />
        </form>
      </DrawerBody>

      <DrawerFooter className="items-center gap-2 pb-5">
        <SaveButton control={form.control} />
        {/* Here too, not only on the create steps: this is what lets a meal
            logged days ago be kept for reuse. */}
        <SaveToMyMealsButton form={form} source={source} />
      </DrawerFooter>
    </>
  );
}

/**
 * A secondary action that reads as a link but is still a target: `py-2` puts it
 * at ~36px where `p-0` left a 20px strip. WCAG 2.5.8's inline-text exemption
 * doesn't apply — none of these sit inside a sentence.
 */
function QuietButton({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      type="button"
      variant="link"
      className={cn(
        'h-auto gap-1 px-1 py-2 text-sm text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

/**
 * The one description field, used by the input step and by the not-food step's
 * second try — the same field of the same form, so a retry keeps what was
 * typed, and `min(3)`/`max(500)` finally produce a message instead of silently
 * disabling the button. Invalid styling is declared on both the `Field` and the
 * control, per the Forms rule.
 */
function DescriptionField({
  parseForm,
  className,
  ...props
}: {
  parseForm: UseFormReturn<AiParseRequest>;
} & Omit<React.ComponentProps<typeof Textarea>, 'form'>) {
  const id = useId();
  const { error } = parseForm.getFieldState('description', parseForm.formState);

  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>Describe what you ate</FieldLabel>
      {/* InputGroup so the mic sits inside the field's border rather than beside
          it: speaking and typing fill the same box, which is the point. */}
      <InputGroup>
        <InputGroupTextarea
          id={id}
          aria-invalid={error ? true : undefined}
          className={cn('min-h-22', className)}
          {...props}
          {...parseForm.register('description')}
        />
        <VoiceDictation parseForm={parseForm} />
      </InputGroup>
      {/* Says what the disabled Parse button is waiting for. Before the field is
          touched there is no error to show, so without this the button is dead
          with no stated reason. */}
      <FieldDescription>
        A few words is enough. One meal at a time, and portions can be
        approximate — you&apos;ll review before saving.
      </FieldDescription>
      <FieldError errors={[error]} />
    </Field>
  );
}

/** Subscribes to the description itself, so typing re-renders the chips rather
    than the drawer. */
function ExampleChips({
  control,
  onPick,
}: {
  control: Control<AiParseRequest>;
  onPick: (example: string) => void;
}) {
  const [examples] = useState(pickExamples);
  const description = useWatch({ control, name: 'description' });

  if (description.length > 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {examples.map((example) => (
        <Button
          key={example}
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPick(example)}
          // A suggestion, not a peer of the Parse action: muted at rest, and
          // `outline`'s own `hover:text-foreground` brings it back on approach.
          className="rounded-full text-muted-foreground"
        >
          {example}
        </Button>
      ))}
    </div>
  );
}

/** Every step ends the same way: one full-width action, one quiet link under
    it. `RecoverStep` and the input step used to spell this out separately, and
    disagreed on the gap. */
function StepFooter({
  primary,
  secondary,
}: {
  primary: {
    /** A node, not a string, so a label can carry decoration the accessible
        name must not — see the AI step's `aria-hidden` sparkle. */
    label: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    type?: 'button' | 'submit';
    form?: string;
  };
  secondary: { label: string; onClick: () => void };
}) {
  return (
    <DrawerFooter className="items-center gap-2 pb-5">
      <Button
        type={primary.type ?? 'button'}
        form={primary.form}
        onClick={primary.onClick}
        disabled={primary.disabled}
        size="lg"
        className="w-full"
      >
        {primary.label}
      </Button>
      <QuietButton onClick={secondary.onClick}>{secondary.label}</QuietButton>
    </DrawerFooter>
  );
}

/**
 * Wraps a step so it fades and rises into place instead of blinking in.
 * Keyed on the step in the caller, so React remounts it and @starting-style
 * has something to start from.
 *
 * The remount is also where focus is caught: a step swap unmounts whatever held
 * it, and without this the keyboard lands on `<body>` — the user is outside the
 * drawer with nothing announced. Only when the new panel focuses nothing of its
 * own, so an `autoFocus`ed field still wins.
 *
 * The fade is not decoration: swapping a whole panel with no transition reads as
 * a glitch, especially here where the drawer's height changes at the same
 * moment. Under reduced motion the fade stays and the travel goes.
 */
function StepPanel({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const panel = ref.current;
    if (panel && !panel.contains(document.activeElement)) panel.focus();
  }, []);

  return (
    <div
      ref={ref}
      tabIndex={-1}
      className="motion-keep-fade flex min-h-0 flex-1 flex-col transition-[opacity,transform] duration-200 ease-out-strong outline-none starting:translate-y-1 starting:opacity-0"
    >
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
      <div className="flex flex-col items-center gap-3.5 px-4 pt-9 pb-2">
        {/* The same wash, tinted by the failure: the mascot sits in it while
            the panel below says what went wrong. */}
        <div className="flex size-30 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklch,var(--destructive),var(--card)_90%)]">
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
        <Card
          role="alert"
          className="gap-1 rounded-md border-[color-mix(in_oklch,var(--destructive),var(--card)_70%)] bg-[color-mix(in_oklch,var(--destructive),var(--card)_90%)] px-3.5 py-3 shadow-none max-w-4/5 flex-row items-start gap-2.5"
        >
          <TriangleAlert aria-hidden className="mt-px size-4 shrink-0" />
          <p className="text-pretty text-sm font-semibold">{message}</p>
        </Card>
      </div>
      {children}
      <StepFooter primary={primary} secondary={secondary} />
    </>
  );
}

/**
 * Keeps the draft on screen as a Saved Meal, to log again later without a parse.
 *
 * Its own press rather than a checkbox on the save: the two are independent
 * records (ADR-0014), either order is valid, and this is the only way to keep a
 * meal that was logged days ago — the Edit step gets the same control.
 *
 * It latches once it succeeds. Nothing stops duplicate names server-side, so
 * without this a second press would quietly make a second copy.
 */
function SaveToMyMealsButton({
  form,
  source,
}: {
  form: UseFormReturn<MealDraftValues>;
  source: MealSource;
}) {
  const [state, setState] = useState<'idle' | 'saving' | 'kept'>('idle');

  async function keep() {
    // A template is the draft as shown, so it has to clear the same validation a
    // Meal Entry does — an unnamed meal is no more keepable than it is loggable.
    if (!(await form.trigger())) return;
    setState('saving');
    const values = form.getValues();
    try {
      // No mealType and no recordedAt: those describe an occasion, and a Saved
      // Meal has none — the user picks them each time it is logged.
      await savedMealsApi.create({
        mealName: values.mealName,
        totalCalories: values.totalCalories,
        proteinGrams: values.proteinGrams,
        carbsGrams: values.carbsGrams,
        fatGrams: values.fatGrams,
        source,
        items: toWireItems(values.items),
      });
      setState('kept');
      toast.success(`“${values.mealName}” is in My meals`);
    } catch {
      // Back to idle, not to a dead end: the meal is still there to keep.
      setState('idle');
      toast.error("Couldn't keep that meal. Please try again.");
    }
  }

  const kept = state === 'kept';

  return (
    <QuietButton onClick={keep} disabled={state !== 'idle'}>
      {kept ? <BookmarkCheck aria-hidden /> : <Bookmark aria-hidden />}
      {kept ? 'In My meals' : 'Save to My meals'}
    </QuietButton>
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
      <Button type="submit" form={MEAL_FORM_ID} size="lg" className="w-full">
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
    <p className="flex items-center gap-2 text-sm text-muted-foreground">
      <span>By macros that&apos;s {suggestion} kcal.</span>
      <Button
        type="button"
        variant="link"
        className="h-auto gap-1 p-0"
        onClick={() => onUse(suggestion)}
      >
        Use it
      </Button>
    </p>
  );
}
