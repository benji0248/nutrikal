import type {
  Ingredient,
  UserProfile,
  DietaryRestriction,
  IngredientCategory,
  CatalogEntry,
} from '../types';

/**
 * Categories excluded by each dietary restriction.
 */
const RESTRICTION_EXCLUSIONS: Record<DietaryRestriction, IngredientCategory[]> = {
  vegetarian: ['carnes'],
  vegan: ['carnes', 'lacteos'],
  gluten_free: [],  // handled per-ingredient, not per-category
  lactose_free: ['lacteos'],
  low_sodium: [],
  diabetic: [],
};

/**
 * Specific ingredient IDs to exclude for gluten-free users.
 * Covers wheat-based products but not the entire category.
 */
const GLUTEN_INGREDIENT_IDS = new Set([
  'ing_124', // Fideos secos
  'ing_125', // Fideos integrales secos
  'ing_126', // Pan blanco
  'ing_127', // Pan integral
  'ing_128', // Pan lactal
  'ing_129', // Pan rallado
  'ing_130', // Harina 000
  'ing_131', // Harina integral
  'ing_133', // Granola
  'ing_137', // Galletitas de agua
  'ing_138', // Galletitas integrales
  'ing_140', // Copos de maíz (may contain)
  'ing_142', // Trigo burgol
  'ing_144', // Pan de centeno
  'ing_145', // Germen de trigo
  'ing_186', // Galletitas dulces rellenas
  'ing_187', // Galletitas obleas
  'ing_188', // Alfajor de chocolate
  'ing_189', // Alfajor de maicena
  'ing_198', // Medialunas
  'ing_199', // Facturas surtidas
  'ing_200', // Churros
  'ing_201', // Donas
  'ing_222', // Fideos instantáneos
  'ing_225', // Galletitas saladas saborizadas
]);

/**
 * High-sugar ingredient IDs to limit for diabetic users.
 */
const DIABETIC_EXCLUDE_IDS = new Set([
  'ing_116', // Dulce de leche
  'ing_118', // Leche condensada
  'ing_174', // Gaseosa regular
  'ing_193', // Caramelos
  'ing_194', // Gomitas
  'ing_197', // Cereales azucarados
  'ing_210', // Mermelada
  'ing_211', // Dulce de membrillo
  'ing_263', // Azúcar
  'ing_262', // Panqueques con dulce de leche
]);

/**
 * Filter the INGREDIENTS_DB based on user preferences and restrictions.
 * Returns only the ingredients that Gemini is allowed to use.
 */
export function filterIngredientsForUser(
  allIngredients: Ingredient[],
  profile: UserProfile,
): Ingredient[] {
  const dislikedSet = new Set(profile.dislikedIngredientIds);
  const dislikedCats = new Set(profile.dislikedCategories ?? []);
  const allowedExceptions = new Set(profile.allowedExceptions ?? []);

  // Build set of excluded categories from dietary restrictions
  const excludedCategories = new Set<IngredientCategory>();
  for (const restriction of profile.restrictions) {
    const cats = RESTRICTION_EXCLUSIONS[restriction];
    for (const cat of cats) {
      excludedCategories.add(cat);
    }
  }

  const hasGlutenFree = profile.restrictions.includes('gluten_free');
  const hasDiabetic = profile.restrictions.includes('diabetic');

  return allIngredients.filter((ing) => {
    // Skip disliked individual ingredients
    if (dislikedSet.has(ing.id)) return false;

    // Skip disliked categories (unless ingredient is an allowed exception)
    if (dislikedCats.has(ing.category) && !allowedExceptions.has(ing.id)) {
      return false;
    }

    // Skip categories excluded by dietary restrictions
    if (excludedCategories.has(ing.category)) return false;

    // Gluten-free: skip specific wheat-based items
    if (hasGlutenFree && GLUTEN_INGREDIENT_IDS.has(ing.id)) return false;

    // Diabetic: skip high-sugar items
    if (hasDiabetic && DIABETIC_EXCLUDE_IDS.has(ing.id)) return false;

    return true;
  });
}

/**
 * Build a compact catalog for injection into the Gemini prompt.
 * Only id + name, to minimize token usage.
 */
export function buildCatalogForPrompt(
  filteredIngredients: Ingredient[],
): CatalogEntry[] {
  return filteredIngredients.map((ing) => ({
    id: ing.id,
    name: ing.name,
  }));
}

/**
 * Serialize catalog entries to a compact string for the system prompt.
 * Format: "ing_001: Pechuga de pollo\ning_005: Bife de chorizo\n..."
 */
export function catalogToPromptString(catalog: CatalogEntry[]): string {
  return catalog.map((c) => `${c.id}: ${c.name}`).join('\n');
}
