import { describe, expect, it } from 'vitest';
import { formatWeeklyPoolForPrompt } from './ingredientSelectionService';
import type { Ingredient, WeeklyIngredientPool } from '../types';

describe('formatWeeklyPoolForPrompt', () => {
  it('presents a flat inventory without usage-priority tiers', () => {
    const pool: WeeklyIngredientPool = {
      weekId: '2026-W32',
      structural: ['ing_001'],
      contextual: ['ing_038'],
      creative: ['ing_076'],
    };
    const ingredients: Ingredient[] = [
      {
        id: 'ing_001',
        name: 'Arroz blanco',
        category: 'cereales',
        calories: 130,
        protein: 2,
        carbs: 28,
        fat: 0,
      },
      {
        id: 'ing_038',
        name: 'Tomate',
        category: 'verduras',
        calories: 18,
        protein: 1,
        carbs: 4,
        fat: 0,
      },
      {
        id: 'ing_076',
        name: 'Aceite de oliva',
        category: 'grasas',
        calories: 884,
        protein: 0,
        carbs: 0,
        fat: 100,
      },
    ];

    const text = formatWeeklyPoolForPrompt(pool, ingredients);
    expect(text).toContain('Disponibles (kcal/100g):');
    expect(text).toContain('ing_001: Arroz blanco');
    expect(text).toContain('ing_038: Tomate');
    expect(text).toContain('ing_076: Aceite de oliva');
    expect(text).not.toMatch(/Protagonistas habituales/i);
    expect(text).not.toMatch(/También disponibles/i);
    expect(text).not.toMatch(/Extras ocasionales/i);
    expect(text).not.toMatch(/priorizá estructurales/i);
    expect(text).not.toMatch(/ESTRUCTURALES:/);
    expect(text).not.toMatch(/CONTEXTUALES:/);
    expect(text).not.toMatch(/criterio culinario manda/);
  });
});
