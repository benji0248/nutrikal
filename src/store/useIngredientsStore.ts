import { create } from 'zustand';
import type { Ingredient } from '../types';
import * as api from '../services/apiService';

interface IngredientsState {
  customIngredients: Ingredient[];
  isLoading: boolean;
  addCustomIngredient: (data: Omit<Ingredient, 'id' | 'isCustom'>) => void;
  updateCustomIngredient: (id: string, partial: Partial<Omit<Ingredient, 'id'>>) => void;
  deleteCustomIngredient: (id: string) => void;
  hydrateIngredients: (ingredients: Ingredient[]) => void;
}

export const useIngredientsStore = create<IngredientsState>()((set) => ({
  customIngredients: [],
  isLoading: false,

  addCustomIngredient: (data) => {
    const ingredient: Ingredient = {
      ...data,
      id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      isCustom: true,
    };
    set((state) => ({
      customIngredients: [...state.customIngredients, ingredient],
    }));
    api.createCustomIngredient(ingredient).catch(console.error);
  },

  updateCustomIngredient: (id, partial) => {
    set((state) => ({
      customIngredients: state.customIngredients.map((ing) =>
        ing.id === id ? { ...ing, ...partial } : ing,
      ),
    }));
    api.updateCustomIngredient(id, partial as Partial<Ingredient>).catch(console.error);
  },

  deleteCustomIngredient: (id) => {
    set((state) => ({
      customIngredients: state.customIngredients.filter((ing) => ing.id !== id),
    }));
    api.deleteCustomIngredient(id).catch(console.error);
  },

  hydrateIngredients: (ingredients) => {
    set({ customIngredients: ingredients });
  },
}));
