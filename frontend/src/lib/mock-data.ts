// Stand-in for real API responses (see ticket #10) — shapes mirror what the
// backend will eventually return, but nothing here is a committed contract.
// Once the real endpoints exist, replace these with fetches against them.

export type Plan = {
  label: string;
  ratePerWeek: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  goalDate: string;
  weeksLeft: number;
};

export const mockPlanOptions: Plan[] = [
  {
    label: 'Gentle',
    ratePerWeek: 0.25,
    kcal: 1850,
    protein: 140,
    carbs: 230,
    fat: 70,
    goalDate: 'Nov 14',
    weeksLeft: 18,
  },
  {
    label: 'Moderate',
    ratePerWeek: 0.5,
    kcal: 1650,
    protein: 130,
    carbs: 220,
    fat: 65,
    goalDate: 'Sep 19',
    weeksLeft: 9,
  },
  {
    label: 'Aggressive',
    ratePerWeek: 0.75,
    kcal: 1450,
    protein: 120,
    carbs: 190,
    fat: 55,
    goalDate: 'Aug 28',
    weeksLeft: 6,
  },
];

export type Meal = {
  id: string;
  name: string;
  kcal: number;
  source: 'ai' | 'manual';
  loggedAt: string;
};

export const mockRecentMeals: Meal[] = [
  {
    id: 'm1',
    name: 'Chicken, rice & salad',
    kcal: 690,
    source: 'ai',
    loggedAt: '12:40 PM',
  },
];

export type DashboardStats = {
  remainingKcal: number;
  eatenKcal: number;
  goalKcal: number;
  goalDate: string;
  weeksLeft: number;
  weightTrendKg: number;
  weightTrendLastMonthKg: number;
};

export const mockDashboardStats: DashboardStats = {
  remainingKcal: 960,
  eatenKcal: 690,
  goalKcal: 1650,
  goalDate: 'Sep 19',
  weeksLeft: 9,
  weightTrendKg: -1.2,
  weightTrendLastMonthKg: -0.8,
};

// `projected` starts at the same value as the last `actual` point so the
// dashed line visually continues from where the solid line stops.
export const mockWeightTrend = [
  { week: '6w ago', actual: 74.2 },
  { week: '5w ago', actual: 74.4 },
  { week: '4w ago', actual: 73.9 },
  { week: '3w ago', actual: 73.5 },
  { week: '2w ago', actual: 73.6 },
  { week: '1w ago', actual: 73.1 },
  { week: 'Now', actual: 73.0, projected: 73.0 },
  { week: '+3w', projected: 71.5 },
  { week: '+6w', projected: 70.0 },
  { week: '+9w', projected: 68.5 },
];

export const mockDailyCalories = [
  { day: 'Mon', kcal: 990 },
  { day: 'Tue', kcal: 1240 },
  { day: 'Wed', kcal: 830 },
  { day: 'Thu', kcal: 1400 },
  { day: 'Fri', kcal: 1070 },
  { day: 'Sat', kcal: 1160 },
  { day: 'Sun', kcal: 690 },
];
