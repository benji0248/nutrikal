import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CalculatorEntry, CalculatorRecipe, Ingredient, Macros } from '../types';
import { computeTotalMacros } from '../utils/macroHelpers';
import { generateId } from '../utils/dateHelpers';

const sync = () => {
  import('./useGistSyncStore').then(({ useGistSyncStore }) =>
    useGistSyncStore.getState().schedulePush(),
  );
};

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
  deleteRecipe: (id: string) => void;
  getTotals: (allIngredients: Ingredient[]) => Macros;
}

export const useCalculatorStore = create<CalculatorState>()(
  persist(
    (set, get) => ({
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
        set((state) => {
          const totalMacros = computeTotalMacros(state.entries, allIngredients);
          const recipe: CalculatorRecipe = {
            id: generateId(),
            name,
            entries: [...state.entries],
            totalMacros,
            savedAt: new Date().toISOString(),
          };
          return {
            savedRecipes: [...state.savedRecipes, recipe],
            activeRecipeId: recipe.id,
          };
        });
        sync();
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

      deleteRecipe: (id) => {
        set((state) => ({
          savedRecipes: state.savedRecipes.filter((r) => r.id !== id),
          activeRecipeId: state.activeRecipeId === id ? null : state.activeRecipeId,
        }));
        sync();
      },

      getTotals: (allIngredients) => {
        const state = get();
        return computeTotalMacros(state.entries, allIngredients);
      },
    }),
    {
      name: 'nutrikal-calculator',
      partialize: (state) => ({
        savedRecipes: state.savedRecipes,
      }),
    },
  ),
);
