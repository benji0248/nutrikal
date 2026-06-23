import type { MealType } from '../types';
import { MEAL_TYPE_LABELS, MEAL_TYPE_ORDER } from '../types';

export function getCurrentMealType(): MealType | null {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 11) return 'desayuno';
  if (hour >= 11 && hour < 15) return 'almuerzo';
  if (hour >= 15 && hour < 21) return 'cena';
  return null;
}

/** Label for prompts and UI copy ("Merienda" instead of "Snack"). */
export function mealTypeToPromptLabel(mealType: MealType): string {
  if (mealType === 'snack') return 'merienda';
  return MEAL_TYPE_LABELS[mealType].toLowerCase();
}

export function mealTypeChipLabel(mealType: MealType): string {
  if (mealType === 'snack') return 'Merienda';
  return MEAL_TYPE_LABELS[mealType];
}

export function isMealType(value: string): value is MealType {
  return (MEAL_TYPE_ORDER as string[]).includes(value);
}
