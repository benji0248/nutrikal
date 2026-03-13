import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Ingredient } from '../types';

interface IngredientsState {
  customIngredients: Ingredient[];
  addCustomIngredient: (data: Omit<Ingredient, 'id' | 'isCustom'>) => void;
  updateCustomIngredient: (id: string, partial: Partial<Omit<Ingredient, 'id'>>) => void;
  deleteCustomIngredient: (id: string) => void;
}

export const useIngredientsStore = create<IngredientsState>()(
  persist(
    (set) => ({
      customIngredients: [],

      addCustomIngredient: (data) =>
        set((state) => ({
          customIngredients: [
            ...state.customIngredients,
            {
              ...data,
              id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              isCustom: true,
            },
          ],
        })),

      updateCustomIngredient: (id, partial) =>
        set((state) => ({
          customIngredients: state.customIngredients.map((ing) =>
            ing.id === id ? { ...ing, ...partial } : ing,
          ),
        })),

      deleteCustomIngredient: (id) =>
        set((state) => ({
          customIngredients: state.customIngredients.filter((ing) => ing.id !== id),
        })),
    }),
    { name: 'nutrikal-ingredients' },
  ),
);
