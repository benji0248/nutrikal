import { create } from 'zustand';
import type { Ingredient } from '../types';
import * as api from '../services/apiService';

interface IngredientsState {
  customIngredients: Ingredient[];
  addCustomIngredient: (data: Omit<Ingredient, 'id' | 'isCustom'>) => void;
  hydrateIngredients: (ingredients: Ingredient[]) => void;
}

export const useIngredientsStore = create<IngredientsState>()((set) => ({
  customIngredients: [],

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

  hydrateIngredients: (ingredients) => {
    set({ customIngredients: ingredients });
  },
}));
