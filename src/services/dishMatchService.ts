import type {
  Dish,
  DishCategory,
  DishTag,
  DietaryRestriction,
  Ingredient,
  Macros,
  MealType,
  DayPlan,
} from '../types';
import { computeTotalMacros } from '../utils/macroHelpers';

interface MatchFilters {
  category?: DishCategory;
  tags?: DishTag[];
  restrictions?: DietaryRestriction[];
  dislikedIngredientIds?: string[];
  maxCalories?: number;
  searchQuery?: string;
}

const RESTRICTION_TAG_MAP: Record<DietaryRestriction, DishTag | null> = {
  vegetarian: 'vegetariano',
  vegan: 'vegano',
  gluten_free: 'sin_gluten',
  lactose_free: 'sin_lactosa',
  low_sodium: null,
  diabetic: 'bajo_carb',
};

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
 * Fuzzy search: checks if query words appear in the dish name (case insensitive, accent tolerant).
 */
function fuzzyMatch(name: string, query: string): boolean {
  const normalize = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const normalizedName = normalize(name);
  const words = normalize(query).split(/\s+/).filter(Boolean);
  return words.every((w) => normalizedName.includes(w));
}

/**
 * Filter and match dishes based on criteria.
 */
export function matchDishes(
  dishes: Dish[],
  allIngredients: Ingredient[],
  filters: MatchFilters,
): Dish[] {
  return dishes.filter((dish) => {
    // Category filter
    if (filters.category && dish.category !== filters.category) return false;

    // Tag filter
    if (filters.tags && filters.tags.length > 0) {
      if (!filters.tags.some((t) => dish.tags.includes(t))) return false;
    }

    // Dietary restrictions: dish must have the corresponding tag
    if (filters.restrictions && filters.restrictions.length > 0) {
      for (const r of filters.restrictions) {
        const requiredTag = RESTRICTION_TAG_MAP[r];
        if (requiredTag && !dish.tags.includes(requiredTag)) return false;
      }
    }

    // Disliked ingredients
    if (filters.dislikedIngredientIds && filters.dislikedIngredientIds.length > 0) {
      const hasDisliked = dish.ingredients.some((di) =>
        filters.dislikedIngredientIds!.includes(di.ingredientId),
      );
      if (hasDisliked) return false;
    }

    // Max calories (internal, never shown)
    if (filters.maxCalories !== undefined) {
      const macros = computeDishMacros(dish, allIngredients);
      if (macros.calories > filters.maxCalories) return false;
    }

    // Search query
    if (filters.searchQuery && !fuzzyMatch(dish.name, filters.searchQuery)) return false;

    return true;
  });
}

/**
 * Map MealType to DishCategory for suggestions.
 */
export function mealTypeToDishCategory(mealType: MealType): DishCategory {
  switch (mealType) {
    case 'desayuno': return 'desayuno';
    case 'almuerzo': return 'almuerzo';
    case 'cena': return 'cena';
    case 'snack': return 'snack';
  }
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
 * Compute remaining budget for the day.
 */
export function computeRemainingBudget(
  dayPlan: DayPlan | undefined,
  dailyBudget: number,
  allIngredients: Ingredient[],
): number {
  const consumed = computeDayConsumed(dayPlan, allIngredients);
  return Math.max(0, dailyBudget - consumed);
}
