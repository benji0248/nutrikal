import type { Dish, EnergyLevel, Ingredient, IngredientPortion } from '../types';
import { INGREDIENT_PORTIONS, CATEGORY_DEFAULTS } from '../data/ingredientPortions';

export type MealWeightLabel = 'liviano' | 'balanceado' | 'contundente';

const MEAL_WEIGHT_LABELS: Record<MealWeightLabel, string> = {
  liviano: 'Liviano',
  balanceado: 'Balanceado',
  contundente: 'Contundente',
};

const ENERGY_LEVEL_LABELS: Record<EnergyLevel, string> = {
  green: 'Con margen',
  amber: 'Equilibrado',
  warm_orange: 'Día contundente',
};

/** Peso cualitativo del plato vs presupuesto del slot (Modo Simple). */
export function getMealWeightLabel(mealKcal: number, slotBudgetKcal: number): MealWeightLabel {
  if (slotBudgetKcal <= 0) return 'balanceado';
  const ratio = mealKcal / slotBudgetKcal;
  if (ratio < 0.8) return 'liviano';
  if (ratio <= 1.05) return 'balanceado';
  return 'contundente';
}

export function formatMealWeightLabel(label: MealWeightLabel): string {
  return MEAL_WEIGHT_LABELS[label];
}

export function formatEnergyLevelLabel(level: EnergyLevel): string {
  return ENERGY_LEVEL_LABELS[level];
}

/**
 * Format a fractional number into human Spanish.
 * 0.5 → "media", 1 → "1", 1.5 → "1 y media", 2 → "2", 2.5 → "2 y media"
 */
function formatFraction(n: number): string {
  if (n <= 0) return '0';

  const whole = Math.floor(n);
  const decimal = Math.round((n - whole) * 10) / 10;

  if (decimal >= 0.3 && decimal <= 0.7) {
    if (whole === 0) return 'media';
    return `${whole} y media`;
  }

  const rounded = decimal >= 0.7 ? whole + 1 : whole;
  return rounded === 0 ? '1' : String(rounded);
}

/**
 * Get the IngredientPortion for a given ingredient, falling back to category defaults.
 */
function getPortionInfo(ingredientId: string, ingredient: Ingredient | undefined): IngredientPortion | null {
  const specific = INGREDIENT_PORTIONS[ingredientId];
  if (specific) return specific;

  if (ingredient) {
    const categoryDefault = CATEGORY_DEFAULTS[ingredient.category];
    if (categoryDefault) return categoryDefault;
  }

  return null;
}

/**
 * Convert grams to a human-readable portion string.
 * "60g pan lactal" → "2 rebanadas de pan lactal"
 */
export function gramsToHumanPortion(
  ingredientId: string,
  grams: number,
  ingredient: Ingredient | undefined,
): string {
  const portion = getPortionInfo(ingredientId, ingredient);

  if (!portion) {
    return `${Math.round(grams)}g`;
  }

  const units = grams / portion.gramsPerUnit;
  const formatted = formatFraction(units);

  if (formatted === 'media') {
    return `media ${portion.unit}`;
  }

  const num = parseFloat(formatted.replace(' y media', '.5'));
  if (num === 1 || formatted === '1') {
    return `1 ${portion.unit}`;
  }

  return `${formatted} ${portion.unitPlural}`;
}

/** Human portion for AI/plan ingredients matched by name when ID is unknown. */
export function formatNamedIngredientPortion(
  name: string,
  grams: number,
  allIngredients: Ingredient[],
  useGrams: boolean,
): string {
  if (useGrams) return `${Math.round(grams)}g`;
  const normalized = name.toLowerCase().trim();
  const ingredient =
    allIngredients.find((i) => i.name.toLowerCase() === normalized) ??
    allIngredients.find((i) => normalized.includes(i.name.toLowerCase()));
  return gramsToHumanPortion(ingredient?.id ?? '', grams, ingredient);
}

/** Display portion according to user preference (grams vs household measures). */
export function formatPortionDisplay(
  ingredientId: string,
  grams: number,
  ingredient: Ingredient | undefined,
  useGrams: boolean,
): string {
  if (useGrams) return `${Math.round(grams)}g`;
  return gramsToHumanPortion(ingredientId, grams, ingredient);
}

interface HumanIngredient {
  name: string;
  humanPortion: string;
}

/**
 * Get human-readable ingredient list for a dish at given servings.
 */
export function getDishHumanIngredients(
  dish: Dish,
  servings: number,
  allIngredients: Ingredient[],
): HumanIngredient[] {
  return dish.ingredients.map((di) => {
    const ingredient = allIngredients.find((i) => i.id === di.ingredientId);
    const totalGrams = di.grams * servings;
    const name = ingredient?.name ?? di.ingredientId;
    const humanPortion = gramsToHumanPortion(di.ingredientId, totalGrams, ingredient);

    return { name, humanPortion };
  });
}
