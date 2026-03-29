import type {
  Dish,
  DayPlan,
  MealType,
  Ingredient,
  Macros,
} from '../types';
import { computeTotalMacros } from '../utils/macroHelpers';

/**
 * Compute macros for a dish using ingredient DB.
 */
export function computeDishMacros(dish: Dish, allIngredients: Ingredient[]): Macros {
  return computeTotalMacros(
    dish.ingredients.map((di) => ({ ingredientId: di.ingredientId, grams: di.grams })),
    allIngredients,
  );
}

/**
 * Compute consumed calories for a day from the day plan.
 */
export function computeDayConsumed(
  dayPlan: DayPlan | undefined,
  allIngredients: Ingredient[],
): number {
  if (!dayPlan) return 0;
  let total = 0;
  for (const mealType of Object.keys(dayPlan.meals) as MealType[]) {
    for (const meal of dayPlan.meals[mealType]) {
      if (meal.calories) {
        total += meal.calories;
      } else if (meal.entries && meal.entries.length > 0) {
        const macros = computeTotalMacros(meal.entries, allIngredients);
        total += macros.calories;
      }
    }
  }
  return total;
}
