'use client';

import { RadioGroup } from '@/components/ui/radio-group';
import type { Pace, PlanOption } from '@foodnote/shared';
import { DEFAULT_PLAN_PACE } from './form-schema';
import { PlanOptionCard } from './plan-option-card';

type PlanOptionsProps = {
  options: PlanOption[];
  value: Pace | null;
  onValueChange: (pace: Pace) => void;
};

// A RadioGroup of selectable plan cards, shared by onboarding and the profile
// plan-edit dialog. Renders a fallback message when no safe plan is available.
export function PlanOptions({
  options,
  value,
  onValueChange,
}: PlanOptionsProps) {
  if (options.length === 0) {
    return (
      <p className="font-sans text-label text-text-muted">
        No safe plan reaches this target from your current weight. Try a smaller
        change.
      </p>
    );
  }

  return (
    <RadioGroup
      value={value !== null ? String(value) : ''}
      onValueChange={(next) => onValueChange(Number(next) as Pace)}
    >
      {options.map((option) => (
        <PlanOptionCard
          key={option.pace}
          option={option}
          selected={option.pace === value}
        />
      ))}
    </RadioGroup>
  );
}
