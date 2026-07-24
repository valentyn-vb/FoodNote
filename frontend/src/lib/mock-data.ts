// Placeholder profile/plan data for the still-mock profile page and sidebar.
// The dashboard's mocks were removed in #34 (it now reads the real API); what
// remains is a stand-in for the profile read model until that endpoint lands.
// Nothing here is a committed contract.

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
