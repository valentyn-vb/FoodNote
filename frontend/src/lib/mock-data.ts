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

export type UserProfile = {
  name: string;
  email: string;
  sex: 'Female' | 'Male';
  age: number;
  heightCm: number;
  weightGoalKg: number;
  plan: Plan;
};

export const mockUserProfile: UserProfile = {
  name: 'Jamie Rivera',
  email: 'jamie.rivera@email.com',
  sex: 'Female',
  age: 29,
  heightCm: 168,
  weightGoalKg: 62,
  plan: mockPlanOptions[1],
};

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
  weightTrendPoints: number[];
  calorieChartDays: number[];
};

export const mockDashboardStats: DashboardStats = {
  remainingKcal: 960,
  eatenKcal: 690,
  goalKcal: 1650,
  goalDate: 'Sep 19',
  weeksLeft: 9,
  weightTrendKg: -1.2,
  weightTrendPoints: [30, 40, 35, 55, 50, 65, 60],
  calorieChartDays: [60, 75, 50, 85, 65, 70, 42],
};
