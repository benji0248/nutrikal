import type {
  Dish,
  DayPlan,
  MealType,
  Meal,
  Ingredient,
  Macros,
  AiDishResponse,
  HydratedAiDish,
  HydratedAiIngredient,
  AiIngredient,
  AiMeal,
} from '../types';
import { INGREDIENTS_DB } from '../data/ingredients';
import { computeTotalMacros } from '../utils/macroHelpers';
import { gramsToHumanPortion } from '../utils/portionHelpers';
import { generateId } from '../utils/dateHelpers';

/** Gemini a veces usa nombres distintos a la DB local. */
const INGREDIENT_ALIASES: Record<string, string> = {
  zucchini: 'Zapallito',
  courgette: 'Zapallito',
  'calabacín': 'Zapallito',
  calabacin: 'Zapallito',
  'pechuga de pollo': 'Pechuga de pollo',
  pollo: 'Pechuga de pollo',
  quinoa: 'Quinoa cocida',
  'quinoa cocida': 'Quinoa cocida',
  'aceite oliva': 'Aceite de oliva',
  'perejil fresco': 'Perejil fresco',
  oregano: 'Orégano',
  'ají molido': 'Ají molido',
  'aji molido': 'Ají molido',
  'vino tinto': 'Vino tinto',
  'morron rojo': 'Morrón rojo',
  'morrón rojo': 'Morrón rojo',
};

const GRAM_STEP = 5;
const CALORIE_TOLERANCE = 0.08;

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

function resolveAlias(name: string): string {
  const lower = name.toLowerCase().trim();
  return INGREDIENT_ALIASES[lower] ?? name;
}

/**
 * Fuzzy match an ingredient name from Gemini against INGREDIENTS_DB.
 */
function fuzzyMatchIngredient(name: string): Ingredient | undefined {
  const resolved = resolveAlias(name);
  const normalized = resolved.toLowerCase().trim();

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

/** kcal estimadas cuando el ingrediente no está en la DB (para no subcontar). */
function estimateUnmatchedKcal(name: string, grams: number): number {
  if (grams <= 0) return 0;
  const n = name.toLowerCase();
  if (n.includes('sal') || n.includes('agua')) return 0;
  if (n.includes('aceite')) return (884 * grams) / 100;
  if (n.includes('manteca') || n.includes('mantequilla')) return (717 * grams) / 100;
  if (
    n.includes('hierba')
    || n.includes('especi')
    || n.includes('orégano')
    || n.includes('oregano')
    || n.includes('perejil')
  ) {
    return (40 * grams) / 100;
  }
  if (n.includes('limón') || n.includes('limon')) return (29 * grams) / 100;
  if (
    n.includes('zucchini')
    || n.includes('zapallito')
    || n.includes('morron')
    || n.includes('morrón')
    || n.includes('cebolla')
    || n.includes('tomate')
    || n.includes('lechuga')
    || n.includes('verdura')
  ) {
    return (25 * grams) / 100;
  }
  if (
    n.includes('pollo')
    || n.includes('carne')
    || n.includes('pescado')
    || n.includes('huevo')
    || n.includes('merluza')
  ) {
    return (150 * grams) / 100;
  }
  if (
    n.includes('quinoa')
    || n.includes('arroz')
    || n.includes('papa')
    || n.includes('fideo')
    || n.includes('choclo')
  ) {
    return (120 * grams) / 100;
  }
  return (100 * grams) / 100;
}

function kcalForEntry(
  ingredientId: string | null,
  grams: number,
  name: string,
): number {
  if (grams <= 0) return 0;
  if (ingredientId) {
    const ing = INGREDIENTS_DB.find((i) => i.id === ingredientId);
    if (ing) return (ing.calories * grams) / 100;
  }
  return estimateUnmatchedKcal(name, grams);
}

function macrosFromIngredients(
  items: Array<{ ingredientId: string | null; name: string; grams: number }>,
): Macros {
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;

  for (const item of items) {
    const kcal = kcalForEntry(item.ingredientId, item.grams, item.name);
    calories += kcal;
    if (item.ingredientId) {
      const ing = INGREDIENTS_DB.find((i) => i.id === item.ingredientId);
      if (ing) {
        const factor = item.grams / 100;
        protein += ing.protein * factor;
        carbs += ing.carbs * factor;
        fat += ing.fat * factor;
      }
    } else {
      protein += 0.15 * kcal / 4;
      carbs += 0.5 * kcal / 4;
      fat += 0.35 * kcal / 9;
    }
  }

  return {
    calories: Math.round(calories),
    protein: Math.round(protein * 10) / 10,
    carbs: Math.round(carbs * 10) / 10,
    fat: Math.round(fat * 10) / 10,
  };
}

function buildHumanIngredients(
  entries: Array<{ ingredientId: string | null; name: string; grams: number }>,
  useGrams: boolean,
): HydratedAiIngredient[] {
  return entries.map((e) => {
    const ingredient = e.ingredientId
      ? INGREDIENTS_DB.find((ing) => ing.id === e.ingredientId)
      : undefined;
    return {
      name: e.name,
      grams: e.grams,
      humanPortion: useGrams
        ? `${Math.round(e.grams)}g`
        : gramsToHumanPortion(e.ingredientId ?? '', e.grams, ingredient),
      ingredientId: e.ingredientId,
    };
  });
}

function totalDishKcal(items: HydratedAiIngredient[]): number {
  return items.reduce(
    (sum, h) => sum + kcalForEntry(h.ingredientId, h.grams, h.name),
    0,
  );
}

function scaleIngredientGrams(grams: number, factor: number): number {
  return Math.max(GRAM_STEP, Math.floor((grams * factor) / GRAM_STEP) * GRAM_STEP);
}

/**
 * Hydrate an AiDishResponse from Gemini into a HydratedAiDish
 * with fuzzy-matched ingredients, macros, and human portions.
 */
export function hydrateAiDish(
  dish: AiDishResponse,
  options?: { useGrams?: boolean },
): HydratedAiDish {
  const useGrams = options?.useGrams ?? false;
  const entries = dish.ingredientes.map((ai) => {
    const matched = fuzzyMatchIngredient(ai.nombre);
    return {
      ingredientId: matched?.id ?? null,
      name: matched?.name ?? ai.nombre,
      grams: ai.gramos,
    };
  });

  const humanIngredients = buildHumanIngredients(entries, useGrams);
  const macros = macrosFromIngredients(entries);

  return {
    name: dish.nombre,
    humanIngredients,
    macros,
    prepMinutes: dish.tiempo_prep,
    preparation: dish.preparacion,
    tip: dish.tip,
  };
}

/**
 * Ajusta gramos hacia arriba o abajo para acercar el plato al presupuesto del slot (±8%).
 */
export function normalizeHydratedAiDishToBudget(
  dish: HydratedAiDish,
  budgetKcal: number,
  options?: { useGrams?: boolean },
): HydratedAiDish {
  const useGrams = options?.useGrams ?? false;
  if (budgetKcal <= 0) return dish;

  const currentKcal = totalDishKcal(dish.humanIngredients);
  if (currentKcal <= 0) return dish;

  const ratio = currentKcal / budgetKcal;
  if (ratio >= 1 - CALORIE_TOLERANCE && ratio <= 1 + CALORIE_TOLERANCE) {
    return dish;
  }

  const factor = budgetKcal / currentKcal;
  const scaledEntries = dish.humanIngredients.map((h) => ({
    ingredientId: h.ingredientId,
    name: h.name,
    grams: scaleIngredientGrams(h.grams, factor),
  }));

  const humanIngredients = buildHumanIngredients(scaledEntries, useGrams);
  const macros = macrosFromIngredients(scaledEntries);

  return { ...dish, humanIngredients, macros };
}

/** @deprecated Use normalizeHydratedAiDishToBudget */
export function trimHydratedAiDishToBudget(
  dish: HydratedAiDish,
  budgetKcal: number,
  options?: { useGrams?: boolean },
): HydratedAiDish {
  return normalizeHydratedAiDishToBudget(dish, budgetKcal, options);
}

/** Convert a hydrated AI dish into AiMeal for week plan / calendar bridge. */
export function hydratedDishToAiMeal(dish: HydratedAiDish): AiMeal {
  const aiIngredients: AiIngredient[] = dish.humanIngredients.map((h) => ({
    name: h.name,
    grams: h.grams,
    kcal: Math.round(kcalForEntry(h.ingredientId, h.grams, h.name)),
  }));

  return {
    name: dish.name,
    ingredients: aiIngredients,
    totalKcal: Math.round(dish.macros.calories),
    prepMinutes: dish.prepMinutes,
    preparation: dish.preparation,
    tip: dish.tip,
  };
}

/** Convert AiMeal (plan semanal) into calendar Meal with recipe fields. */
export function plannedMealToMeal(meal: AiMeal): Meal {
  const entries = meal.ingredients
    .map((ing) => {
      const matched = fuzzyMatchIngredient(ing.name);
      return matched ? { ingredientId: matched.id, grams: ing.grams } : null;
    })
    .filter((e): e is { ingredientId: string; grams: number } => e != null);

  return {
    id: generateId(),
    name: meal.name,
    calories: meal.totalKcal,
    prepMinutes: meal.prepMinutes,
    humanPortion: meal.humanPortion,
    aiIngredients: meal.ingredients,
    entries: entries.length > 0 ? entries : undefined,
    preparation: meal.preparation,
    tip: meal.tip,
  };
}

/** Convert a hydrated AI dish into a calendar Meal. */
export function hydratedDishToMeal(dish: HydratedAiDish): Meal {
  return plannedMealToMeal(hydratedDishToAiMeal(dish));
}
