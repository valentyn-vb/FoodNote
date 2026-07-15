'use client';

import {
  EvilLineChart,
  Line,
  Tooltip as LineTooltip,
  YAxis,
} from '@/components/evilcharts/charts/line-chart';
import {
  Bar,
  EvilBarChart,
  Tooltip as BarTooltip,
  XAxis,
} from '@/components/evilcharts/charts/bar-chart';
import { Card } from '@/components/ui/card';
import { mockDailyCalories, mockWeightTrend } from '@/lib/mock-data';

// Shared by the mobile and desktop dashboard layouts — same chart, sized by
// className. Colors come from the FoodNote tokens, not EvilCharts defaults.

const weightConfig = {
  kg: { label: 'Weight (kg)', colors: { light: ['var(--fn-secondary)'] } },
};

const calorieConfig = {
  kcal: { label: 'kcal', colors: { light: ['var(--fn-primary)'] } },
};

export function WeightTrendChart({ className }: { className?: string }) {
  return (
    <EvilLineChart
      data={mockWeightTrend}
      config={weightConfig}
      className={className}
      curveType="monotone"
    >
      {/* Fitted domain — kg values sit in a ~1.5 kg band; a zero-based axis
          would flatten the trend into a straight line. */}
      <YAxis hide domain={['dataMin - 0.4', 'dataMax + 0.4']} />
      <Line dataKey="kg" />
      <LineTooltip />
    </EvilLineChart>
  );
}

export function DailyCaloriesChart({ className }: { className?: string }) {
  return (
    <EvilBarChart
      data={mockDailyCalories}
      config={calorieConfig}
      className={className}
    >
      <XAxis dataKey="day" />
      <Bar dataKey="kcal" radius={4} />
      <BarTooltip />
    </EvilBarChart>
  );
}

// Card + chart together, per review: dashboard blocks were duplicated inline
// across the mobile and desktop layouts in page.tsx. Styling stays owned by
// the caller (className / chartClassName) since mobile and desktop size them
// differently.
export function WeightTrendCard({
  className,
  chartClassName,
  title,
}: {
  className?: string;
  chartClassName?: string;
  title?: string;
}) {
  return (
    <Card className={className}>
      {title && (
        <div className="font-sans text-label font-semibold text-text">
          {title}
        </div>
      )}
      <WeightTrendChart className={chartClassName} />
    </Card>
  );
}

export function RemainingTodayRingCard({
  className,
  remainingKcal,
  goalKcal,
}: {
  className?: string;
  remainingKcal: number;
  goalKcal: number;
}) {
  return (
    <Card className={className}>
      <div className="self-start font-sans text-caption font-semibold text-text">
        Remaining today
      </div>
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r="50"
          fill="none"
          stroke="#F0EEE9"
          strokeWidth="12"
        />
        <circle
          cx="60"
          cy="60"
          r="50"
          transform="rotate(-90 60 60)"
          fill="none"
          stroke="#F5A65C"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${Math.round((remainingKcal / goalKcal) * 314)} 314`}
          className="transition-[stroke-dasharray] duration-500"
        />
        <text
          x="60"
          y="56"
          textAnchor="middle"
          className="font-display"
          fontSize="20"
          fontWeight="600"
          fill="#1A1A1A"
        >
          {remainingKcal}
        </text>
        <text
          x="60"
          y="74"
          textAnchor="middle"
          className="font-sans"
          fontSize="10"
          fill="#6B6B6B"
        >
          kcal left
        </text>
      </svg>
    </Card>
  );
}
