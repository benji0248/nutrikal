import type { Ingredient } from '../types';
import { INGREDIENTS_DB } from '../data/ingredients.js';

export interface FoodPreferences {
  dislikedIngredientIds?: string[];
  dislikedCategories?: string[];
  allowedExceptions?: string[];
}

const FISH_IDS = new Set(['ing_013', 'ing_014', 'ing_015', 'ing_016', 'ing_017', 'ing_018', 'ing_035']);
const normalize = (value: string): string => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const FISH_NAMES = /\b(pescad[oa]s?|merluzas?|salmon(?:es)?|atun(?:es)?|truchas?|lenguados?|caballas?|tilapias?|sardinas?|anchoas?|bacalao|corvina|abadejo|hake|tuna|fish|salmon|trout)\b/;

/** Preference groups can span catalog categories (fish is catalogued under meats). */
export function belongsToFoodCategory(ingredient: Ingredient, category: string): boolean {
  return category === 'pescado'
    ? FISH_IDS.has(ingredient.id) || FISH_NAMES.test(normalize(ingredient.name))
    : ingredient.category === category;
}

export function isIngredientDisliked(ingredient: Ingredient, preferences: FoodPreferences): boolean {
  if (preferences.dislikedIngredientIds?.includes(ingredient.id)) return true;
  if (preferences.allowedExceptions?.includes(ingredient.id)) return false;
  return (preferences.dislikedCategories ?? []).some((category) => belongsToFoodCategory(ingredient, category));
}

export function buildFoodPreferencesPrompt(preferences: FoodPreferences): string {
  const names = (ids: string[] = []) => ids
    .map((id) => INGREDIENTS_DB.find((ingredient) => ingredient.id === id)?.name)
    .filter(Boolean);
  const categories = (preferences.dislikedCategories ?? []).map((category) => category === 'pescado'
    ? 'pescado y todas sus variedades (incluye merluza, salmón, atún, trucha, lenguado, caballa y tilapia), también en salsas o productos preparados'
    : category);
  const disliked = names(preferences.dislikedIngredientIds);
  const exceptions = names((preferences.allowedExceptions ?? []).filter((id) => !preferences.dislikedIngredientIds?.includes(id)));
  if (!categories.length && !disliked.length) return '';
  return [
    '# Alimentos que el usuario no quiere (obligatorio)',
    categories.length ? `No uses estos grupos ni sus variedades: ${categories.join('; ')}.` : '',
    disliked.length ? `No uses estos ingredientes, tampoco como parte de otro producto: ${disliked.join(', ')}.` : '',
    exceptions.length ? `Únicas excepciones permitidas a los grupos excluidos: ${exceptions.join(', ')}. Esto no habilita otras variedades del grupo.` : '',
    'Estas preferencias tienen prioridad sobre el inventario, la variedad y el historial. Si un plato no las cumple, elegí otro.',
  ].filter(Boolean).join('\n');
}

/** Check generated ingredient names as well as the filtered inventory. */
export function findDislikedIngredientNames(names: string[], preferences: FoodPreferences): string[] {
  const containsName = (value: string, name: string) => ` ${normalize(value).replace(/[^a-z0-9]+/g, ' ')} `
    .includes(` ${normalize(name).replace(/[^a-z0-9]+/g, ' ')} `);
  return names.filter((name) => {
    const matches = INGREDIENTS_DB.filter((ingredient) => containsName(name, ingredient.name));
    if (matches.some((ingredient) => preferences.dislikedIngredientIds?.includes(ingredient.id))) return true;
    if (preferences.dislikedCategories?.includes('pescado') && FISH_NAMES.test(normalize(name))) {
      const allowedFish = matches.some((ingredient) => belongsToFoodCategory(ingredient, 'pescado')
        && preferences.allowedExceptions?.includes(ingredient.id));
      if (!allowedFish) return true;
      const specificFish = normalize(name).match(new RegExp(FISH_NAMES.source, 'g')) ?? [];
      const allowedNames = matches.filter((ingredient) => preferences.allowedExceptions?.includes(ingredient.id))
        .map((ingredient) => normalize(ingredient.name));
      if (specificFish.some((fish) => !/^pescad|^fish$/.test(fish) && !allowedNames.some((allowed) => allowed.includes(fish)))) return true;
      // An allowed fish must not make another, explicitly excluded variety acceptable.
      if (matches.some((ingredient) => belongsToFoodCategory(ingredient, 'pescado') && isIngredientDisliked(ingredient, preferences))) return true;
    }
    return matches.some((ingredient) => isIngredientDisliked(ingredient, preferences));
  });
}
