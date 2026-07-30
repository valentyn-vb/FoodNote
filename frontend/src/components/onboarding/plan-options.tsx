'use client';

import { RadioGroup } from '@/components/ui/radio-group';
import { Text } from '@/components/ui/text';
import type { Pace, PlanOption } from '@foodnote/shared';
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
      <Text tone="muted" render={<p />}>
        No safe plan reaches this target from your current weight. Try a smaller
        change.
      </Text>
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
