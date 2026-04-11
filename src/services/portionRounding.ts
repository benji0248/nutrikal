import type { HydratedIngredient, Ingredient, MacroRole } from '../types';

/** Gramos mostrados en múltiplos de este paso (redondeo hacia abajo). */
export const GRAM_DISPLAY_STEP = 5;

export function floorGramsToStep(
  grams: number,
  step: number = GRAM_DISPLAY_STEP,
): number {
  if (!Number.isFinite(grams) || grams <= 0) return 0;
  return Math.floor(grams / step) * step;
}

export function floorKcalFromGrams(calPer100: number, grams: number): number {
  if (calPer100 <= 0 || grams <= 0) return 0;
  return Math.floor((calPer100 * grams) / 100);
}

const FLEXIBLE_TRIM: Set<MacroRole> = new Set([
  'protein',
  'energy',
  'volume',
  'fat',
]);

/**
 * Si el piso de gramos hizo pasar el total de kcal del slot, recorta de a 5 g
 * en ingredientes flexibles hasta quedar ≤ presupuesto.
 */
export function trimHydratedUnderCalorieBudget(
  items: HydratedIngredient[],
  mealBudgetKcal: number,
  allIngredients: Ingredient[],
  gramLimits: Record<MacroRole, { min: number; max: number }>,
): HydratedIngredient[] {
  const out = items.map((h) => ({ ...h }));
  const map = new Map(allIngredients.map((i) => [i.id, i] as const));

  let total = out.reduce((s, h) => s + h.kcal, 0);
  let guard = 0;
  const maxIter = 400;

  while (total > mealBudgetKcal && guard < maxIter) {
    guard++;
    // Candidatos: flexibles, con gramos > min, kcal > 0
    const candidates = out
      .map((h, idx) => ({ h, idx }))
      .filter(({ h }) => FLEXIBLE_TRIM.has(h.macroRole))
      .filter(({ h }) => {
        const ing = map.get(h.ingredientId);
        return ing && ing.calories > 0 && h.grams > gramLimits[h.macroRole].min;
      })
      .sort((a, b) => b.h.kcal - a.h.kcal);

    if (candidates.length === 0) break;

    const { idx } = candidates[0];
    const h = out[idx];
    const ing = map.get(h.ingredientId);
    if (!ing) break;

    const lim = gramLimits[h.macroRole];
    const nextG = Math.max(lim.min, floorGramsToStep(h.grams - GRAM_DISPLAY_STEP));
    if (nextG === h.grams) break;

    const kcal = floorKcalFromGrams(ing.calories, nextG);
    const factor = nextG / 100;
    out[idx] = {
      ...h,
      grams: nextG,
      kcal,
      protein: Math.floor(ing.protein * factor * 10) / 10,
      carbs: Math.floor(ing.carbs * factor * 10) / 10,
      fat: Math.floor(ing.fat * factor * 10) / 10,
    };
    total = out.reduce((s, x) => s + x.kcal, 0);
  }

  return out;
}
