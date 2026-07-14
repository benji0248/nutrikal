import type { Meal, MealType } from '../types';
import { MEAL_TYPE_ORDER } from '../types';
import { getCurrentMealType } from '../utils/mealTimeHelpers';
import { generateId } from '../utils/dateHelpers';
import { getMealSlotBudget } from './portionEngine';

/** Factor local para alivianar comidas restantes tras un desvío. */
export const RESCUE_LIGHTEN_FACTOR = 0.75;

/**
 * Comidas del día que aún no “pasaron” (incluye la actual si no hubo nada marcado).
 * Usa el orden de día y la franja horaria aproximada.
 */
export function getRemainingMealTypes(now: Date = new Date()): MealType[] {
  const current = getCurrentMealType();
  if (!current) {
    // Fuera de franjas típicas (noche tarde): no queda nada por ajustar hoy
    const hour = now.getHours();
    if (hour >= 21 || hour < 6) return [];
    return [...MEAL_TYPE_ORDER];
  }
  const idx = MEAL_TYPE_ORDER.indexOf(current);
  // Ajustamos las siguientes (no la actual, ya que “comí algo” suele ser la de ahora)
  return MEAL_TYPE_ORDER.slice(idx + 1);
}

/** Escala porciones/kcal de un plato sin replanificar el día entero. */
export function lightenMeal(meal: Meal, factor: number = RESCUE_LIGHTEN_FACTOR): Meal {
  const scale = (grams: number) => Math.max(1, Math.round(grams * factor));
  return {
    ...meal,
    id: generateId(),
    calories: meal.calories != null ? Math.round(meal.calories * factor) : undefined,
    entries: meal.entries?.map((e) => ({ ...e, grams: scale(e.grams) })),
    aiIngredients: meal.aiIngredients?.map((i) => ({ ...i, grams: scale(i.grams) })),
  };
}

export interface RebalanceResult {
  adjusted: Array<{ mealType: MealType; name: string }>;
  skippedEmpty: MealType[];
}

/**
 * Aliviana comidas ya planificadas en los slots restantes.
 * Heurística local: ~75% del plato; no toca slots vacíos ni la comida actual.
 */
export function rebalanceRemainingMeals(
  mealsByType: Record<MealType, Meal[]>,
  remaining: MealType[],
): { nextMeals: Partial<Record<MealType, Meal[]>>; result: RebalanceResult } {
  const nextMeals: Partial<Record<MealType, Meal[]>> = {};
  const adjusted: Array<{ mealType: MealType; name: string }> = [];
  const skippedEmpty: MealType[] = [];

  for (const mt of remaining) {
    const slot = mealsByType[mt] ?? [];
    if (slot.length === 0) {
      skippedEmpty.push(mt);
      continue;
    }
    const lightened = slot.map((m) => lightenMeal(m));
    nextMeals[mt] = lightened;
    adjusted.push({ mealType: mt, name: lightened[0]?.name ?? mt });
  }

  return { nextMeals, result: { adjusted, skippedEmpty } };
}

/** Presupuestos sugeridos (~75%) para slots vacíos / regeneración. */
export function getLightenedSlotBudgets(
  dailyBudget: number,
  remaining: MealType[],
  factor: number = RESCUE_LIGHTEN_FACTOR,
): Partial<Record<MealType, number>> {
  const out: Partial<Record<MealType, number>> = {};
  for (const mt of remaining) {
    out[mt] = Math.round(getMealSlotBudget(dailyBudget, mt) * factor);
  }
  return out;
}
