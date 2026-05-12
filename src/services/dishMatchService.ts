import type {
  Dish,
  DayPlan,
  MealType,
  Ingredient,
  Macros,
  AiDishResponse,
  HydratedAiDish,
  HydratedAiIngredient,
} from '../types';
import { INGREDIENTS_DB } from '../data/ingredients';
import { computeTotalMacros } from '../utils/macroHelpers';
import { gramsToHumanPortion } from '../utils/portionHelpers';

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

/**
 * Fuzzy match an ingredient name from Gemini against INGREDIENTS_DB.
 * Returns the matched Ingredient or undefined.
 */
function fuzzyMatchIngredient(name: string): Ingredient | undefined {
  const normalized = name.toLowerCase().trim();

  const exact = INGREDIENTS_DB.find(
    (ing) => ing.name.toLowerCase() === normalized,
  );
  if (exact) return exact;

  const includes = INGREDIENTS_DB.find(
    (ing) =>
      ing.name.toLowerCase().includes(normalized) ||
      normalized.includes(ing.name.toLowerCase()),
  );
  if (includes) return includes;

  const firstWord = normalized.split(' ')[0];
  if (firstWord && firstWord.length >= 3) {
    const startsWith = INGREDIENTS_DB.find((ing) =>
      ing.name.toLowerCase().startsWith(firstWord),
    );
    if (startsWith) return startsWith;
  }

  return undefined;
}

/**
 * Hydrate an AiDishResponse from Gemini into a HydratedAiDish
 * with fuzzy-matched ingredients, macros, and human portions.
 */
export function hydrateAiDish(dish: AiDishResponse): HydratedAiDish {
  const entries = dish.ingredientes.map((ai) => {
    const matched = fuzzyMatchIngredient(ai.nombre);
    return {
      ingredientId: matched?.id ?? null,
      name: matched?.name ?? ai.nombre,
      grams: ai.gramos,
    };
  });

  const macros = computeTotalMacros(
    entries
      .filter((e) => e.ingredientId !== null)
      .map((e) => ({ ingredientId: e.ingredientId!, grams: e.grams })),
    INGREDIENTS_DB,
  );

  const humanIngredients: HydratedAiIngredient[] = entries.map((e) => {
    const ingredient = e.ingredientId
      ? INGREDIENTS_DB.find((ing) => ing.id === e.ingredientId)
      : undefined;
    return {
      name: e.name,
      grams: e.grams,
      humanPortion: gramsToHumanPortion(e.ingredientId ?? '', e.grams, ingredient),
      ingredientId: e.ingredientId,
    };
  });

  return {
    name: dish.nombre,
    humanIngredients,
    macros,
    prepMinutes: dish.tiempo_prep,
    preparation: dish.preparacion,
    tip: dish.tip,
  };
}
