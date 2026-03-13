import type { Macros, Ingredient, CalculatorEntry } from '../types';

export const DAILY_REFERENCE: Macros = {
  calories: 2000,
  protein: 50,
  carbs: 275,
  fat: 78,
};

export function computeMacrosForEntry(ingredient: Ingredient, grams: number): Macros {
  const factor = grams / 100;
  return {
    calories: Math.round(ingredient.calories * factor * 10) / 10,
    protein: Math.round(ingredient.protein * factor * 10) / 10,
    carbs: Math.round(ingredient.carbs * factor * 10) / 10,
    fat: Math.round(ingredient.fat * factor * 10) / 10,
  };
}

export function computeTotalMacros(
  entries: CalculatorEntry[],
  ingredients: Ingredient[],
): Macros {
  const totals: Macros = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  for (const entry of entries) {
    const ing = ingredients.find((i) => i.id === entry.ingredientId);
    if (!ing) continue;
    const m = computeMacrosForEntry(ing, entry.grams);
    totals.calories += m.calories;
    totals.protein += m.protein;
    totals.carbs += m.carbs;
    totals.fat += m.fat;
  }
  return {
    calories: Math.round(totals.calories * 10) / 10,
    protein: Math.round(totals.protein * 10) / 10,
    carbs: Math.round(totals.carbs * 10) / 10,
    fat: Math.round(totals.fat * 10) / 10,
  };
}

export function formatMacro(value: number, unit: string): string {
  if (unit === 'kcal') return `${Math.round(value)} kcal`;
  return `${value.toFixed(1)}g`;
}

export function getMacroPercent(value: number, dailyRef: number): number {
  if (dailyRef <= 0) return 0;
  return Math.min(Math.round((value / dailyRef) * 100), 100);
}
