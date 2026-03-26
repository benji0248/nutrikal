import type {
  Dish,
  DayPlan,
  MealType,
  Ingredient,
  ShoppingItem,
  ShoppingList,
  ShoppingSection,
  IngredientCategory,
} from '../types';
import { SHOPPING_SECTION_LABELS } from '../types';
import { generateId } from '../utils/dateHelpers';

const CATEGORY_TO_SECTION: Record<IngredientCategory, ShoppingSection> = {
  carnes: 'carniceria',
  verduras: 'frutas_verduras',
  frutas: 'frutas_verduras',
  lacteos: 'lacteos_fiambres',
  cereales: 'almacen',
  legumbres: 'almacen',
  grasas: 'almacen',
  bebidas: 'bebidas',
  ultraprocesados: 'almacen',
  comidas_preparadas: 'congelados',
  otros: 'otros',
};

/**
 * Humanize grams into readable quantities.
 */
function humanizeQuantity(grams: number): string {
  if (grams >= 1000) {
    const kg = grams / 1000;
    return kg === Math.floor(kg) ? `${kg} kg` : `${kg.toFixed(1)} kg`;
  }
  return `${Math.round(grams)} g`;
}

/**
 * Generate a consolidated shopping list from day plans within a date range.
 */
export function generateShoppingList(
  dayPlans: Record<string, DayPlan>,
  dishes: Dish[],
  allIngredients: Ingredient[],
  dateFrom: string,
  dateTo: string,
  listName: string,
): ShoppingList {
  const aggregated = new Map<string, number>();

  // Collect ingredient grams from day plans in the range
  const sortedDates = Object.keys(dayPlans)
    .filter((d) => d >= dateFrom && d <= dateTo)
    .sort();

  for (const dateKey of sortedDates) {
    const dayPlan = dayPlans[dateKey];
    for (const mealType of Object.keys(dayPlan.meals) as MealType[]) {
      for (const meal of dayPlan.meals[mealType]) {
        // If meal has entries (from calculator), aggregate those
        if (meal.entries && meal.entries.length > 0) {
          for (const entry of meal.entries) {
            aggregated.set(
              entry.ingredientId,
              (aggregated.get(entry.ingredientId) || 0) + entry.grams,
            );
          }
        }
        // If meal is linked to a recipe/dish, find that dish
        if (meal.linkedRecipeId) {
          const dish = dishes.find((d) => d.id === meal.linkedRecipeId);
          if (dish) {
            for (const di of dish.ingredients) {
              aggregated.set(
                di.ingredientId,
                (aggregated.get(di.ingredientId) || 0) + di.grams,
              );
            }
          }
        }
      }
    }
  }

  // Convert to shopping items
  const items: ShoppingItem[] = [];
  for (const [ingredientId, totalGrams] of aggregated) {
    const ingredient = allIngredients.find((i) => i.id === ingredientId);
    if (!ingredient) continue;

    const section = CATEGORY_TO_SECTION[ingredient.category] || 'otros';

    items.push({
      id: generateId(),
      ingredientId,
      name: ingredient.name,
      quantity: humanizeQuantity(totalGrams),
      section,
      checked: false,
    });
  }

  // Sort by section then name
  const sectionOrder: ShoppingSection[] = [
    'frutas_verduras',
    'carniceria',
    'lacteos_fiambres',
    'almacen',
    'panaderia',
    'bebidas',
    'congelados',
    'otros',
  ];
  items.sort((a, b) => {
    const sa = sectionOrder.indexOf(a.section);
    const sb = sectionOrder.indexOf(b.section);
    if (sa !== sb) return sa - sb;
    return a.name.localeCompare(b.name, 'es');
  });

  return {
    id: generateId(),
    name: listName,
    createdAt: new Date().toISOString(),
    dateRange: { from: dateFrom, to: dateTo },
    items,
  };
}

/**
 * Create shopping items from a dish at given servings.
 */
export function createShoppingItemsFromDish(
  dish: Dish,
  servings: number,
  allIngredients: Ingredient[],
): ShoppingItem[] {
  const items: ShoppingItem[] = [];

  for (const di of dish.ingredients) {
    const ingredient = allIngredients.find((i) => i.id === di.ingredientId);
    if (!ingredient) continue;

    const totalGrams = Math.round(di.grams * servings);
    const section = CATEGORY_TO_SECTION[ingredient.category] || 'otros';

    items.push({
      id: generateId(),
      ingredientId: di.ingredientId,
      name: ingredient.name,
      quantity: humanizeQuantity(totalGrams),
      section,
      checked: false,
    });
  }

  return items;
}

/**
 * Format shopping list for WhatsApp sharing.
 */
export function formatForWhatsApp(list: ShoppingList): string {
  const lines: string[] = [`*${list.name}*`, ''];

  const grouped = new Map<ShoppingSection, ShoppingItem[]>();
  for (const item of list.items) {
    const section = grouped.get(item.section) || [];
    section.push(item);
    grouped.set(item.section, section);
  }

  for (const [section, sectionItems] of grouped) {
    lines.push(`*${SHOPPING_SECTION_LABELS[section]}*`);
    for (const item of sectionItems) {
      const check = item.checked ? '~' : '';
      lines.push(`${check}${item.checked ? '✅' : '⬜'} ${item.name} — ${item.quantity}${check}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
