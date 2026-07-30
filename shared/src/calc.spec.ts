import {
  bmr,
  buildPlanOptions,
  caloriesFromMacros,
  calorieTargetForPace,
  dailyEnergyDeltaForPace,
  hasReachedTarget,
  manualCalorieRange,
  paceForCalorieTarget,
  projectedDate,
  tdee,
} from './calc';
import { MAX_SAFE_PACE_KG } from './goals';
import type { Pace } from './goals';

describe('caloriesFromMacros (Atwater)', () => {
  it('applies 4/4/9 kcal per gram', () => {
    // 62·4 + 0·4 + 7·9 = 311
    expect(
      caloriesFromMacros({ proteinGrams: 62, carbsGrams: 0, fatGrams: 7 }),
    ).toBe(311);
  });

  it('is zero when no macros are given', () => {
    expect(
      caloriesFromMacros({ proteinGrams: 0, carbsGrams: 0, fatGrams: 0 }),
    ).toBe(0);
  });

  it('rounds fractional grams to whole kcal', () => {
    // 10.5·4 + 0·4 + 0·9 = 42
    expect(
      caloriesFromMacros({ proteinGrams: 10.5, carbsGrams: 0, fatGrams: 0 }),
    ).toBe(42);
    // 0.1·4 + 0.1·4 + 0.1·9 = 1.7 → 2
    expect(
      caloriesFromMacros({ proteinGrams: 0.1, carbsGrams: 0.1, fatGrams: 0.1 }),
    ).toBe(2);
  });
});

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
    [0, 0], // maintenance: no deficit, no surplus
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
    // paceSchema bounds the contract at the ceiling; this is the runtime
    // backstop for a caller that reached the math without going through it.
    expect(() => dailyEnergyDeltaForPace(1.5)).toThrow(/pace/i);
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

describe('paceForCalorieTarget (calories → weekly rate, the manual plan)', () => {
  // Male, moderate (1.55), 80 kg → TDEE 2759.
  const male = {
    age: 30,
    sex: 'male' as const,
    heightCm: 180,
    activityLevel: 'moderate' as const,
    currentWeightKg: 80,
  };

  it('derives the rate from a loss budget', () => {
    // 2759 − 1750 = 1009 deficit; 1009 × 7 ÷ 7700 = 0.917272… → 0.9173 (4dp)
    expect(paceForCalorieTarget({ ...male, targetWeightKg: 70 }, 1750)).toBe(
      0.9173,
    );
  });

  it('measures a gain budget in the gain direction', () => {
    // Target above current, so the surplus is what counts:
    // 3200 − 2759 = 441; 441 × 7 ÷ 7700 = 0.400909… → 0.4009
    expect(paceForCalorieTarget({ ...male, targetWeightKg: 90 }, 3200)).toBe(
      0.4009,
    );
  });

  it('is 0 when the budget would not move the user toward the target', () => {
    // A loss goal eating at or above maintenance. Pace 0 is already a
    // maintenance plan with no projected date (ADR-0006), so the honest answer
    // needs no new branch downstream.
    expect(paceForCalorieTarget({ ...male, targetWeightKg: 70 }, 2759)).toBe(0);
    expect(paceForCalorieTarget({ ...male, targetWeightKg: 70 }, 3000)).toBe(0);
  });

  it('caps at the safety ceiling however low the budget', () => {
    // 2759 − 500 = 2259 → 2.05 kg/week, well past the ceiling.
    expect(paceForCalorieTarget({ ...male, targetWeightKg: 70 }, 500)).toBe(
      MAX_SAFE_PACE_KG,
    );
  });

  it('round-trips a manual budget back to the exact number typed', () => {
    // The reason the rate carries four decimals and not two. One step of Pace is
    // worth `step × 7700 ÷ 7` kcal/day, so at 2dp the achievable targets sat on
    // an 11 kcal grid and a typed 1,600 came back as 1,596. At 4dp the step is
    // 0.11 kcal, inside what whole-kcal rounding absorbs.
    const plan = { ...male, targetWeightKg: 70 } as const;
    for (const budget of [1659, 1700, 1750, 1913, 2100, 2758]) {
      expect(
        calorieTargetForPace(plan, paceForCalorieTarget(plan, budget)),
      ).toBe(budget);
    }
  });
});

describe('manualCalorieRange (what a manual plan may name)', () => {
  const male = {
    age: 30,
    sex: 'male' as const,
    heightCm: 180,
    activityLevel: 'moderate' as const,
    currentWeightKg: 80,
  };

  it('spans the ceiling deficit up to maintenance for a loss goal', () => {
    // TDEE 2759, ceiling delta 1100 → 1659; floor 1500 does not bind.
    expect(manualCalorieRange({ ...male, targetWeightKg: 70 })).toEqual({
      min: 1659,
      max: 2759,
    });
  });

  it('spans maintenance up to the ceiling surplus for a gain goal', () => {
    expect(manualCalorieRange({ ...male, targetWeightKg: 90 })).toEqual({
      min: 2759,
      max: 3859,
    });
  });

  it('never offers a budget below the Safety Floor', () => {
    // Female sedentary 60 kg → 1584; 1584 − 1100 = 484, lifted to 1200. Without
    // this the form would accept a number the read-time clamp then overrules.
    const female = {
      age: 30,
      sex: 'female' as const,
      heightCm: 165,
      activityLevel: 'sedentary' as const,
      currentWeightKg: 60,
    };
    expect(manualCalorieRange({ ...female, targetWeightKg: 55 })).toEqual({
      min: 1200,
      max: 1584,
    });
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

  it('returns null at pace 0 instead of dividing by zero', () => {
    // A maintenance plan has no projected date. Without the guard, 5 ÷ 0 is
    // Infinity days → Invalid Date → toISOString() throws RangeError.
    expect(projectedDate(5, 0, '2026-01-01')).toBeNull();
  });
});

describe('hasReachedTarget (direction from start, not from current)', () => {
  // A loss plan: started at 85, aiming for 78.
  const loss = {
    startWeightKg: 85,
    targetWeightKg: 78,
    preferredWeeklyChangeKg: 0.5 as Pace,
  };

  it('is false while the target is still ahead', () => {
    expect(hasReachedTarget({ ...loss, currentWeightKg: 80 })).toBe(false);
  });

  it('is true exactly at the target', () => {
    expect(hasReachedTarget({ ...loss, currentWeightKg: 78 })).toBe(true);
  });

  it('is true past the target, where a magnitude test fails', () => {
    // 77 kg is 1 kg *beyond* 78. Comparing target to CURRENT weight would read
    // 78 > 77 as a gain goal still to come — the bug this replaces.
    expect(hasReachedTarget({ ...loss, currentWeightKg: 77 })).toBe(true);
  });

  it('mirrors for a gain plan', () => {
    const gain = {
      startWeightKg: 60,
      targetWeightKg: 65,
      preferredWeeklyChangeKg: 0.5 as Pace,
    };
    expect(hasReachedTarget({ ...gain, currentWeightKg: 63 })).toBe(false);
    expect(hasReachedTarget({ ...gain, currentWeightKg: 65 })).toBe(true);
    expect(hasReachedTarget({ ...gain, currentWeightKg: 66 })).toBe(true);
  });

  it('is always false on a maintenance plan, whatever the weights say', () => {
    // Pace 0 is the only thing that makes a plan maintenance, so a stale target
    // left over from a patched-away diet must not report an achievement.
    expect(
      hasReachedTarget({
        ...loss,
        preferredWeeklyChangeKg: 0,
        currentWeightKg: 78,
      }),
    ).toBe(false);
    expect(
      hasReachedTarget({
        ...loss,
        preferredWeeklyChangeKg: 0,
        currentWeightKg: 70,
      }),
    ).toBe(false);
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
        // Maintenance is never hidden — it is the one option that always clears
        // the floor, so the picker is never a dead end.
        pace: 0,
        dailyCalorieTarget: 1584, // TDEE untouched
        dailyEnergyDelta: 0,
        projectedGoalDate: null,
      },
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
    expect(options).toHaveLength(5); // four gain paces + maintenance
    expect(options.find((o) => o.pace === 1.0)).toEqual({
      pace: 1.0,
      dailyCalorieTarget: 2684, // 1584.3 + 1100 = 2684.3
      dailyEnergyDelta: 1100,
      projectedGoalDate: '2026-02-05', // 5 kg ÷ 1.0 = 5 wk = 35 days
    });
  });

  it('includes the plan the user is on, sorted in among the presets', () => {
    // A manual plan's rate is derived from calories, so it is not a preset. It
    // still needs a card, or the picker opens with nothing selected and has to
    // substitute a preset that misreports the pace and the calories.
    const options = buildPlanOptions({
      age: 30,
      sex: 'male',
      heightCm: 180,
      activityLevel: 'moderate',
      currentWeightKg: 80,
      targetWeightKg: 75,
      fromDate: '2026-01-01',
      currentPace: 0.6855,
    });
    expect(options.map((o) => o.pace)).toEqual([
      0, 0.25, 0.5, 0.6855, 0.75, 1.0,
    ]);
    // And it is a full option, not a stub: 2759 − 0.6855 × 1100 = 2004.95.
    expect(options.find((o) => o.pace === 0.6855)).toEqual({
      pace: 0.6855,
      dailyCalorieTarget: 2005,
      dailyEnergyDelta: 754, // 0.6855 × 7700 ÷ 7 = 754.05
      projectedGoalDate: '2026-02-22', // 5 kg ÷ 0.6855 = 7.29 wk → 52 days
    });
  });

  it('does not duplicate a current pace that is already a preset', () => {
    const options = buildPlanOptions({
      age: 30,
      sex: 'male',
      heightCm: 180,
      activityLevel: 'moderate',
      currentWeightKg: 80,
      targetWeightKg: 75,
      fromDate: '2026-01-01',
      currentPace: 0.5,
    });
    expect(options.map((o) => o.pace)).toEqual([0, 0.25, 0.5, 0.75, 1.0]);
  });

  it('returns every pace when even the fastest loss pace clears the floor', () => {
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
    expect(options.map((o) => o.pace)).toEqual([0, 0.25, 0.5, 0.75, 1.0]);
  });
});
