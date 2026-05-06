import { create } from 'zustand';
import type { CalculatorEntry, CalculatorRecipe, Ingredient } from '../types';
import { computeTotalMacros } from '../utils/macroHelpers';
import { generateId } from '../utils/dateHelpers';
import * as api from '../services/apiService';

interface CalculatorState {
  entries: CalculatorEntry[];
  savedRecipes: CalculatorRecipe[];
  activeRecipeId: string | null;
  calculatorMode: 'freeform' | 'recipe';
  recipeName: string;

  addEntry: (ingredientId: string, grams: number) => void;
  updateEntryGrams: (ingredientId: string, grams: number) => void;
  removeEntry: (ingredientId: string) => void;
  clearEntries: () => void;
  setMode: (mode: 'freeform' | 'recipe') => void;
  setRecipeName: (name: string) => void;
  saveCurrentAsRecipe: (name: string, allIngredients: Ingredient[]) => void;
  loadRecipe: (id: string) => void;
  hydrateRecipes: (recipes: CalculatorRecipe[]) => void;
}

export const useCalculatorStore = create<CalculatorState>()((set, get) => ({
  entries: [],
  savedRecipes: [],
  activeRecipeId: null,
  calculatorMode: 'freeform',
  recipeName: '',

  addEntry: (ingredientId, grams) =>
    set((state) => {
      const exists = state.entries.find((e) => e.ingredientId === ingredientId);
      if (exists) {
        return {
          entries: state.entries.map((e) =>
            e.ingredientId === ingredientId
              ? { ...e, grams: e.grams + grams }
              : e,
          ),
        };
      }
      return { entries: [...state.entries, { ingredientId, grams }] };
    }),

  updateEntryGrams: (ingredientId, grams) =>
    set((state) => ({
      entries: state.entries.map((e) =>
        e.ingredientId === ingredientId ? { ...e, grams: Math.max(0, grams) } : e,
      ),
    })),

  removeEntry: (ingredientId) =>
    set((state) => ({
      entries: state.entries.filter((e) => e.ingredientId !== ingredientId),
    })),

  clearEntries: () => set({ entries: [], activeRecipeId: null, recipeName: '' }),

  setMode: (mode) => set({ calculatorMode: mode }),
  setRecipeName: (name) => set({ recipeName: name }),

  saveCurrentAsRecipe: (name, allIngredients) => {
    const state = get();
    const totalMacros = computeTotalMacros(state.entries, allIngredients);
    const recipe: CalculatorRecipe = {
      id: generateId(),
      name,
      entries: [...state.entries],
      totalMacros,
      savedAt: new Date().toISOString(),
    };
    set({
      savedRecipes: [...state.savedRecipes, recipe],
      activeRecipeId: recipe.id,
    });
    api.saveCalculatorRecipe(recipe).catch(console.error);
  },

  loadRecipe: (id) =>
    set((state) => {
      const recipe = state.savedRecipes.find((r) => r.id === id);
      if (!recipe) return state;
      return {
        entries: [...recipe.entries],
        activeRecipeId: recipe.id,
        recipeName: recipe.name,
        calculatorMode: 'recipe',
      };
    }),

  hydrateRecipes: (recipes) => {
    set({ savedRecipes: recipes });
  },
}));
