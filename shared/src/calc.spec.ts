import {
  bmr,
  buildPlanOptions,
  calorieTargetForPace,
  dailyEnergyDeltaForPace,
  MAX_SAFE_PACE_KG,
  projectedDate,
  tdee,
} from './calc';
import type { Pace } from './goals';

describe('bmr (Mifflin-St Jeor)', () => {
  it('computes male BMR: 10·kg + 6.25·cm − 5·age + 5', () => {
    // 10·80 + 6.25·180 − 5·30 + 5 = 1780
    expect(bmr({ age: 30, sex: 'male', heightCm: 180, weightKg: 80 })).toBe(
      1780,
    );
  });

  it('computes female BMR: 10·kg + 6.25·cm − 5·age − 161, unrounded', () => {
    // 10·60 + 6.25·165 − 5·30 − 161 = 1320.25 (raw precision, no rounding)
    expect(bmr({ age: 30, sex: 'female', heightCm: 165, weightKg: 60 })).toBe(
      1320.25,
    );
  });
});

describe('tdee (BMR × activity factor)', () => {
  // Male, age 30, 180 cm, 80 kg → BMR 1780.
  const metrics = {
    age: 30,
    sex: 'male' as const,
    heightCm: 180,
    weightKg: 80,
  };

  it.each([
    ['sedentary', 2136], // 1780 × 1.2
    ['light', 2447.5], // 1780 × 1.375
    ['moderate', 2759], // 1780 × 1.55
    ['active', 3070.5], // 1780 × 1.725
    ['veryActive', 3382], // 1780 × 1.9
  ] as const)('scales BMR by the %s factor → %d', (level, expected) => {
    expect(tdee(metrics, level)).toBe(expected);
  });
});

describe('dailyEnergyDeltaForPace (~7700 kcal/kg)', () => {
  it.each([
    [0.25, 275],
    [0.5, 550],
    [0.75, 825],
    [1.0, 1100],
  ] as const)('%d kg/week → %d kcal/day', (pace, expected) => {
    expect(dailyEnergyDeltaForPace(pace)).toBe(expected);
  });

  it('exposes 1.0 kg/week as the safety ceiling', () => {
    expect(MAX_SAFE_PACE_KG).toBe(1.0);
  });

  it('rejects a pace above the safety ceiling', () => {
    // Guards the one invariant no contract schema enforces (a caller bypassing
    // paceSchema). 1.5 is not a valid Pace — cast to reach the runtime guard.
    expect(() => dailyEnergyDeltaForPace(1.5 as Pace)).toThrow(/pace/i);
  });
});

describe('calorieTargetForPace (direction + safety floor, rounded)', () => {
  // Male, moderate (1.55), 80 kg → TDEE 2759.
  const male = {
    age: 30,
    sex: 'male' as const,
    heightCm: 180,
    activityLevel: 'moderate' as const,
    currentWeightKg: 80,
  };
  // Female, sedentary (1.2), 60 kg → TDEE 1584.3.
  const female = {
    age: 30,
    sex: 'female' as const,
    heightCm: 165,
    activityLevel: 'sedentary' as const,
    currentWeightKg: 60,
  };

  it('subtracts the deficit for a loss goal (target < current)', () => {
    expect(calorieTargetForPace({ ...male, targetWeightKg: 70 }, 0.5)).toBe(
      2209,
    );
  });

  it('adds the surplus for a gain goal (target > current), rounding to whole kcal', () => {
    // 1584.3 + 275 = 1859.3 → 1859
    expect(calorieTargetForPace({ ...female, targetWeightKg: 65 }, 0.25)).toBe(
      1859,
    );
  });

  it('returns maintenance unchanged when target == current', () => {
    expect(calorieTargetForPace({ ...male, targetWeightKg: 80 }, 0.75)).toBe(
      2759,
    );
  });

  it('clamps a loss target up to the female floor (1200)', () => {
    // 1584.3 − 550 = 1034.3 → floor 1200
    expect(calorieTargetForPace({ ...female, targetWeightKg: 55 }, 0.5)).toBe(
      1200,
    );
  });

  it('clamps a loss target up to the male floor (1500)', () => {
    // small male: TDEE 1506; 1506 − 275 = 1231 → floor 1500
    const smallMale = {
      age: 60,
      sex: 'male' as const,
      heightCm: 160,
      activityLevel: 'sedentary' as const,
      currentWeightKg: 55,
    };
    expect(
      calorieTargetForPace({ ...smallMale, targetWeightKg: 50 }, 0.25),
    ).toBe(1500);
  });
});

describe('projectedDate (remaining ÷ weekly pace, ceil to whole days)', () => {
  it('adds whole weeks: 1 kg at 0.5/wk = 14 days', () => {
    expect(projectedDate(1, 0.5, '2026-01-01')).toBe('2026-01-15');
  });

  it('rounds partial days up: 1 kg at 0.75/wk = 9.33 → 10 days', () => {
    expect(projectedDate(1, 0.75, '2026-01-01')).toBe('2026-01-11');
  });

  it('crosses month boundaries correctly', () => {
    expect(projectedDate(1, 0.5, '2026-01-20')).toBe('2026-02-03');
  });

  it('returns null when nothing remains (target already met)', () => {
    expect(projectedDate(0, 0.5, '2026-01-01')).toBeNull();
    expect(projectedDate(-2, 0.5, '2026-01-01')).toBeNull();
  });
});

describe('buildPlanOptions (viable options only, one per pace)', () => {
  it('hides loss options whose target falls below the safety floor', () => {
    // Female, sedentary, 60 kg → TDEE 1584.3, floor 1200. Losing to 55 kg:
    // 0.25 → 1309.3 (ok); 0.5/0.75/1.0 all drop below 1200 → hidden.
    const options = buildPlanOptions({
      age: 30,
      sex: 'female',
      heightCm: 165,
      activityLevel: 'sedentary',
      currentWeightKg: 60,
      targetWeightKg: 55,
      fromDate: '2026-01-01',
    });
    expect(options).toEqual([
      {
        pace: 0.25,
        dailyCalorieTarget: 1309,
        dailyEnergyDelta: 275,
        projectedGoalDate: '2026-05-21', // 5 kg ÷ 0.25 = 20 wk = 140 days
      },
    ]);
  });

  it('never hides gain options (floor is loss-only) and adds the surplus', () => {
    const options = buildPlanOptions({
      age: 30,
      sex: 'female',
      heightCm: 165,
      activityLevel: 'sedentary',
      currentWeightKg: 60,
      targetWeightKg: 65,
      fromDate: '2026-01-01',
    });
    expect(options).toHaveLength(4);
    expect(options.find((o) => o.pace === 1.0)).toEqual({
      pace: 1.0,
      dailyCalorieTarget: 2684, // 1584.3 + 1100 = 2684.3
      dailyEnergyDelta: 1100,
      projectedGoalDate: '2026-02-05', // 5 kg ÷ 1.0 = 5 wk = 35 days
    });
  });

  it('returns all four options when even the fastest loss pace clears the floor', () => {
    // Male, moderate, 80 kg → TDEE 2759, floor 1500. 1.0 → 1659 ≥ 1500.
    const options = buildPlanOptions({
      age: 30,
      sex: 'male',
      heightCm: 180,
      activityLevel: 'moderate',
      currentWeightKg: 80,
      targetWeightKg: 75,
      fromDate: '2026-01-01',
    });
    expect(options.map((o) => o.pace)).toEqual([0.25, 0.5, 0.75, 1.0]);
  });
});
