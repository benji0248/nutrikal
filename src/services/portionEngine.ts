import type {
  Ingredient,
  MacroRole,
  AiMealLite,
  AiMeal,
  AiIngredient,
  HydratedIngredient,
  HydratedMeal,
  MealType,
} from '../types';

// ── Meal-slot budget distribution (% of dailyBudget) ──

const SLOT_PERCENTAGES: Record<MealType, number> = {
  desayuno: 0.25,
  almuerzo: 0.35,
  cena: 0.30,
  snack: 0.10,
};

// ── Macro-role budget distribution within a single meal ──

const ROLE_PERCENTAGES: Record<MacroRole, number> = {
  protein: 0.30,
  energy: 0.40,
  fat: 0.20,
  volume: 0.10,
};

// ── Per-role gram clamps (min, max) ──

const ROLE_GRAM_LIMITS: Record<MacroRole, { min: number; max: number }> = {
  protein: { min: 50, max: 400 },
  energy: { min: 30, max: 400 },
  fat: { min: 5, max: 60 },
  volume: { min: 30, max: 300 },
};

/**
 * Classify an ingredient into a MacroRole based on its dominant macro
 * and its category.
 *
 * Rules:
 *  - Category 'grasas' → always 'fat'
 *  - Category 'carnes' (except high-fat processed) → 'protein'
 *  - Category 'legumbres' → 'protein' (they hold significant protein)
 *  - Category 'cereales' → 'energy'
 *  - Category 'frutas' → 'energy'
 *  - Category 'verduras' with > 60 kcal/100g (papa, batata, mandioca, choclo) → 'energy'
 *  - Category 'verduras' with ≤ 60 kcal/100g → 'volume'
 *  - Category 'lacteos': decide by dominant macro
 *  - Category 'bebidas' → 'volume'
 *  - Category 'ultraprocesados' → by dominant macro
 *  - Category 'comidas_preparadas' → by dominant macro
 *  - Category 'otros' → by dominant macro
 */
export function classifyMacroRole(ingredient: Ingredient): MacroRole {
  const { category, calories, protein, carbs, fat } = ingredient;

  // Fixed-category rules
  if (category === 'grasas') return 'fat';
  if (category === 'carnes') return 'protein';
  if (category === 'legumbres') return 'protein';
  if (category === 'cereales') return 'energy';
  if (category === 'frutas') return 'energy';
  if (category === 'bebidas') return 'volume';

  // Verduras: starchy vs leafy
  if (category === 'verduras') {
    return calories > 60 ? 'energy' : 'volume';
  }

  // For other categories, use dominant macro by caloric contribution
  const proteinCals = protein * 4;
  const carbCals = carbs * 4;
  const fatCals = fat * 9;

  const max = Math.max(proteinCals, carbCals, fatCals);
  if (max === fatCals) return 'fat';
  if (max === proteinCals) return 'protein';
  return 'energy';
}

/**
 * Compute exact gram portions for a set of ingredients to hit a target
 * caloric budget. Groups by macro role, distributes budget proportionally,
 * then solves: Grams = (kcalTarget / kcalPer100g) × 100.
 *
 * @param ingredientIds - IDs from INGREDIENTS_DB
 * @param mealBudgetKcal - Target calories for this meal
 * @param allIngredients - Full ingredient database
 * @returns Array of HydratedIngredient with exact grams, or null if an ID is invalid
 */
export function computePortions(
  ingredientIds: string[],
  mealBudgetKcal: number,
  allIngredients: Ingredient[],
): HydratedIngredient[] {
  // Resolve IDs to ingredients, skip unknown ones
  const resolved: Array<{ ingredient: Ingredient; role: MacroRole }> = [];
  for (const id of ingredientIds) {
    const ingredient = allIngredients.find((i) => i.id === id);
    if (!ingredient) continue;
    // Skip zero-calorie ingredients (salt, stevia, etc.) — add as 0g garnish
    if (ingredient.calories <= 0) {
      resolved.push({ ingredient, role: 'volume' });
      continue;
    }
    resolved.push({ ingredient, role: classifyMacroRole(ingredient) });
  }

  if (resolved.length === 0) return [];

  // Group by role
  const groups = new Map<MacroRole, Array<{ ingredient: Ingredient }>>();
  for (const item of resolved) {
    const group = groups.get(item.role) ?? [];
    group.push({ ingredient: item.ingredient });
    groups.set(item.role, group);
  }

  // Compute effective role percentages (redistribute if some roles are missing)
  const presentRoles = Array.from(groups.keys());
  const totalPresentPercent = presentRoles.reduce(
    (sum, role) => sum + ROLE_PERCENTAGES[role],
    0,
  );

  const results: HydratedIngredient[] = [];

  for (const [role, members] of groups) {
    // Proportional budget for this role, normalized by present roles
    const roleBudget =
      (ROLE_PERCENTAGES[role] / totalPresentPercent) * mealBudgetKcal;
    const perIngredientBudget = roleBudget / members.length;
    const limits = ROLE_GRAM_LIMITS[role];

    for (const { ingredient } of members) {
      let grams: number;

      if (ingredient.calories <= 0) {
        // Zero-cal garnish (salt, stevia): fixed small amount
        grams = 2;
      } else {
        // Core formula: Grams = (kcalTarget / kcalPer100g) × 100
        grams = (perIngredientBudget / ingredient.calories) * 100;
        // Clamp to reasonable range
        grams = Math.max(limits.min, Math.min(limits.max, grams));
      }

      grams = Math.round(grams);

      const factor = grams / 100;
      const kcal = Math.round(ingredient.calories * factor);
      const protein = Math.round(ingredient.protein * factor * 10) / 10;
      const carbs = Math.round(ingredient.carbs * factor * 10) / 10;
      const fat = Math.round(ingredient.fat * factor * 10) / 10;

      results.push({
        ingredientId: ingredient.id,
        name: ingredient.name,
        grams,
        kcal,
        protein,
        carbs,
        fat,
        macroRole: role,
      });
    }
  }

  // ── Final correction pass ──
  // If total kcal deviates from budget by > 5%, scale proportionally
  const totalKcal = results.reduce((s, r) => s + r.kcal, 0);
  const deviation = Math.abs(totalKcal - mealBudgetKcal) / mealBudgetKcal;

  if (deviation > 0.05 && totalKcal > 0) {
    const scaleFactor = mealBudgetKcal / totalKcal;

    for (const r of results) {
      if (r.kcal <= 0) continue; // Don't scale garnishes

      const ingredient = allIngredients.find((i) => i.id === r.ingredientId);
      if (!ingredient || ingredient.calories <= 0) continue;

      const limits = ROLE_GRAM_LIMITS[r.macroRole];
      let newGrams = Math.round(r.grams * scaleFactor);
      newGrams = Math.max(limits.min, Math.min(limits.max, newGrams));
      r.grams = newGrams;

      const factor = newGrams / 100;
      r.kcal = Math.round(ingredient.calories * factor);
      r.protein = Math.round(ingredient.protein * factor * 10) / 10;
      r.carbs = Math.round(ingredient.carbs * factor * 10) / 10;
      r.fat = Math.round(ingredient.fat * factor * 10) / 10;
    }
  }

  return results;
}

/**
 * Hydrate a lightweight AI meal (IDs only) into a fully computed HydratedMeal.
 */
export function hydrateMeal(
  mealLite: AiMealLite,
  mealBudgetKcal: number,
  allIngredients: Ingredient[],
): HydratedMeal {
  const ingredients = computePortions(
    mealLite.ingredientIds,
    mealBudgetKcal,
    allIngredients,
  );

  return {
    name: mealLite.name,
    ingredients,
    totalKcal: ingredients.reduce((s, i) => s + i.kcal, 0),
    totalProtein: ingredients.reduce((s, i) => s + i.protein, 0),
    totalCarbs: ingredients.reduce((s, i) => s + i.carbs, 0),
    totalFat: ingredients.reduce((s, i) => s + i.fat, 0),
    prepMinutes: mealLite.prepMinutes,
    humanPortion: mealLite.humanPortion,
  };
}

/**
 * Hydrate a full day of meals. Distributes dailyBudget across slots.
 */
export function hydrateDayMeals(
  meals: Partial<Record<MealType, AiMealLite>>,
  dailyBudget: number,
  allIngredients: Ingredient[],
): Partial<Record<MealType, HydratedMeal>> {
  const result: Partial<Record<MealType, HydratedMeal>> = {};

  for (const mealType of Object.keys(meals) as MealType[]) {
    const lite = meals[mealType];
    if (!lite) continue;

    const slotBudget = Math.round(dailyBudget * SLOT_PERCENTAGES[mealType]);
    result[mealType] = hydrateMeal(lite, slotBudget, allIngredients);
  }

  return result;
}

/**
 * Convert a HydratedMeal to the legacy AiMeal format.
 * This is the bridge that keeps all downstream code (calendar, shopping,
 * embeddings) working without any modifications.
 */
export function hydratedToAiMeal(hydrated: HydratedMeal): AiMeal {
  const ingredients: AiIngredient[] = hydrated.ingredients.map((hi) => ({
    name: hi.name,
    grams: hi.grams,
    kcal: hi.kcal,
  }));

  return {
    name: hydrated.name,
    ingredients,
    totalKcal: hydrated.totalKcal,
    prepMinutes: hydrated.prepMinutes,
    humanPortion: hydrated.humanPortion,
  };
}

/**
 * Compute the meal budget for a specific slot given the daily budget.
 */
export function getMealSlotBudget(
  dailyBudget: number,
  mealType: MealType,
): number {
  return Math.round(dailyBudget * SLOT_PERCENTAGES[mealType]);
}
