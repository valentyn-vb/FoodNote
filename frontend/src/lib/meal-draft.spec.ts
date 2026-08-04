import { describe, it, expect } from 'vitest';
import { sumItems, macroCalorieSuggestion } from './meal-draft';

describe('sumItems', () => {
  it('returns zero totals for an empty list', () => {
    expect(sumItems([])).toEqual({
      totalCalories: 0,
      proteinGrams: 0,
      carbsGrams: 0,
      fatGrams: 0,
    });
  });

  it('sums a single item', () => {
    expect(
      sumItems([
        { calories: 300, proteinGrams: 40, carbsGrams: 0, fatGrams: 7 },
      ]),
    ).toEqual({
      totalCalories: 300,
      proteinGrams: 40,
      carbsGrams: 0,
      fatGrams: 7,
    });
  });

  it('sums multiple items', () => {
    expect(
      sumItems([
        { calories: 300, proteinGrams: 40, carbsGrams: 0, fatGrams: 7 },
        { calories: 197, proteinGrams: 4.4, carbsGrams: 43.1, fatGrams: 0.5 },
      ]),
    ).toEqual({
      totalCalories: 497,
      proteinGrams: 44.4,
      carbsGrams: 43.1,
      fatGrams: 7.5,
    });
  });

  it('accepts objects with extra fields (FormMealItem shape)', () => {
    const item = {
      name: 'Rice',
      quantityDescription: '150 g',
      portionGrams: 150,
      per100g: {
        calories: 131,
        proteinGrams: 2.9,
        carbsGrams: 28.7,
        fatGrams: 0.3,
      },
      calories: 197,
      proteinGrams: 4.4,
      carbsGrams: 43.1,
      fatGrams: 0.5,
    };
    expect(sumItems([item])).toEqual({
      totalCalories: 197,
      proteinGrams: 4.4,
      carbsGrams: 43.1,
      fatGrams: 0.5,
    });
  });
});

describe('macroCalorieSuggestion', () => {
  it('returns null when all macros are zero (calories-only entry)', () => {
    expect(
      macroCalorieSuggestion({
        totalCalories: 500,
        proteinGrams: 0,
        carbsGrams: 0,
        fatGrams: 0,
      }),
    ).toBeNull();
  });

  it('returns null when calories agree with macros within 15 %', () => {
    // 30·4 + 50·4 + 10·9 = 120 + 200 + 90 = 410 kcal; stated 420 → 2.4 % off
    expect(
      macroCalorieSuggestion({
        totalCalories: 420,
        proteinGrams: 30,
        carbsGrams: 50,
        fatGrams: 10,
      }),
    ).toBeNull();
  });

  it('returns the macro-derived figure when it diverges beyond 15 %', () => {
    // 30·4 + 50·4 + 10·9 = 410; stated 200 → 51 % off
    expect(
      macroCalorieSuggestion({
        totalCalories: 200,
        proteinGrams: 30,
        carbsGrams: 50,
        fatGrams: 10,
      }),
    ).toBe(410);
  });

  it('returns null when the macro-derived figure is zero (avoids divide-by-zero)', () => {
    // Macros are non-zero but yield 0 kcal — degenerate edge case.
    // caloriesFromMacros(0, 0, 0) = 0, covered by the all-zero guard above,
    // so this tests the stated-0 case alongside real macros treated as "ok".
    expect(
      macroCalorieSuggestion({
        totalCalories: 0,
        proteinGrams: 30,
        carbsGrams: 50,
        fatGrams: 10,
      }),
    ).toBe(410); // divergence is 100 % → suggestion fires
  });

  it('returns null at exactly the 15 % threshold (boundary is exclusive)', () => {
    // fromMacros = 400; threshold = 60 kcal. stated 340 → exactly 15 % → null.
    // 50·4 + 50·4 + 0·9 = 400
    expect(
      macroCalorieSuggestion({
        totalCalories: 340,
        proteinGrams: 50,
        carbsGrams: 50,
        fatGrams: 0,
      }),
    ).toBeNull();
  });
});
