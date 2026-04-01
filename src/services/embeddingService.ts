import type { AiMeal, MealType } from '../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

interface DishToEmbed {
  dishName: string;
  ingredients: Array<{ name: string; grams: number; kcal: number }>;
  totalKcal: number;
  prepMinutes?: number;
  humanPortion?: string;
  mealType?: string;
  datePlanned?: string;
}

export function aiMealToDishToEmbed(
  meal: AiMeal,
  mealType: MealType,
  date: string,
): DishToEmbed {
  return {
    dishName: meal.name,
    ingredients: meal.ingredients,
    totalKcal: meal.totalKcal,
    prepMinutes: meal.prepMinutes,
    humanPortion: meal.humanPortion,
    mealType,
    datePlanned: date,
  };
}

export function submitDishesForEmbedding(dishes: DishToEmbed[]): void {
  if (dishes.length === 0) return;

  const token = localStorage.getItem('nutrikal-jwt');
  if (!token) return;

  fetch(`${BASE_URL}/api/ai/embed`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ dishes }),
  }).catch((err) => {
    console.warn('[embeddingService] Failed to submit dishes for embedding:', err);
  });
}
