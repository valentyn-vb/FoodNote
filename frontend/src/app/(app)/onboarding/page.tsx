'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const WEEKLY_PACE_OPTIONS = ['0.25', '0.5', '0.75'];
const TOGGLE_ITEM_CLASS =
  'h-11.5 grow basis-0 rounded-sm border border-border font-sans text-text-muted data-[state=on]:border-[1.5px] data-[state=on]:border-primary data-[state=on]:bg-[#FFF3E7] data-[state=on]:font-semibold data-[state=on]:text-primary-deep';

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-sans text-caption font-medium text-text">
      {children}
    </div>
  );
}

function TextField({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex grow basis-0 flex-col gap-1.75">
      <FieldLabel>{label}</FieldLabel>
      <Input
        {...props}
        className="h-11.5 rounded-sm border-border bg-surface px-3.5 font-sans text-[14.5px] text-text shadow-[0_1px_2px_#00000008] focus-visible:border-primary focus-visible:ring-0"
      />
    </div>
  );
}

export default function OnboardingPage() {
  const [sex, setSex] = useState('Female');
  const [weeklyPace, setWeeklyPace] = useState('0.5');

  return (
    <div className="mx-auto flex w-full max-w-md flex-col bg-bg pt-1.5 pb-5">
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
          <TextField
            label="Age"
            type="number"
            defaultValue={27}
            inputMode="numeric"
          />
          <TextField
            label="Height (cm)"
            type="number"
            defaultValue={168}
            inputMode="numeric"
          />
        </div>

        <div className="flex flex-col gap-1.75">
          <FieldLabel>Sex</FieldLabel>
          <ToggleGroup
            value={[sex]}
            onValueChange={(values) => values[0] && setSex(values[0])}
            spacing={2}
            className="w-full gap-2"
          >
            <ToggleGroupItem value="Female" className={TOGGLE_ITEM_CLASS}>
              Female
            </ToggleGroupItem>
            <ToggleGroupItem value="Male" className={TOGGLE_ITEM_CLASS}>
              Male
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div className="flex gap-3">
          <TextField
            label="Current weight (kg)"
            type="number"
            defaultValue={72}
            inputMode="numeric"
          />
          <TextField
            label="Target weight (kg)"
            type="number"
            defaultValue={64}
            inputMode="numeric"
          />
        </div>

        <div className="flex flex-col gap-1.75">
          <FieldLabel>Activity level</FieldLabel>
          <Select defaultValue="Lightly active">
            <SelectTrigger className="h-11.5 w-full rounded-sm border-border bg-surface px-3.5 font-sans text-[14.5px] text-text shadow-[0_1px_2px_#00000008]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Sedentary">Sedentary</SelectItem>
              <SelectItem value="Lightly active">Lightly active</SelectItem>
              <SelectItem value="Moderately active">
                Moderately active
              </SelectItem>
              <SelectItem value="Very active">Very active</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.75">
          <FieldLabel>Weekly pace</FieldLabel>
          <ToggleGroup
            value={[weeklyPace]}
            onValueChange={(values) => values[0] && setWeeklyPace(values[0])}
            spacing={2}
            className="w-full gap-2"
          >
            {WEEKLY_PACE_OPTIONS.map((pace) => (
              <ToggleGroupItem
                key={pace}
                value={pace}
                className={`${TOGGLE_ITEM_CLASS} text-caption`}
              >
                {pace} kg
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>

      <div className="px-5 pt-4 pb-1 font-sans text-[11.5px] text-text-muted">
        This is an estimate, not medical advice. Actual results vary.
      </div>

      <div className="px-5 pt-3">
        <Button
          nativeButton={false}
          render={<Link href="/plan-selection" />}
          className="h-12.5 w-full rounded-sm bg-primary text-[15px] shadow-[0_2px_8px_#f5a65c59]"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
