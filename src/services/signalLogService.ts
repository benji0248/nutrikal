import type { AiMeal, IngredientSignalEntry, WeekPlan } from '../types';
import { MEAL_TYPE_ORDER } from '../types';
import { useIngredientSignalStore } from '../store/useIngredientSignalStore';

/** Hoy los AiMeal solo traen nombre por ingrediente; el log usa esas cadenas hasta mapear a ids */
function refsFromAiMeal(meal: AiMeal): string[] {
  return meal.ingredients.map((i) => i.name);
}

/**
 * Registra señal positiva al aplicar un plan (sin fricción).
 * ingredientes_* usan nombres legibles hasta que el flujo guarde ids.
 */
export function recordWeekPlanApplied(plan: WeekPlan): void {
  const rows: Array<Omit<IngredientSignalEntry, 'id'>> = [];

  for (const day of plan.days) {
    for (const mt of MEAL_TYPE_ORDER) {
      const meal = day.meals[mt];
      if (!meal) continue;
      const refs = refsFromAiMeal(meal);
      rows.push({
        fecha: day.date,
        comida: mt,
        ingredientes_sugeridos: refs,
        ingredientes_finales: refs,
        ingredientes_removidos: [],
        ingredientes_agregados: [],
        accion: 'aceptado',
      });
    }
  }

  if (rows.length > 0) {
    useIngredientSignalStore.getState().appendMany(rows);
  }
}
