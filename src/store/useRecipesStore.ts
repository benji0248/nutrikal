import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Dish } from '../types';
import { useAuthStore } from './useAuthStore';

const sync = () => {
  import('./useGistSyncStore').then(({ useGistSyncStore }) =>
    useGistSyncStore.getState().schedulePush(),
  );
};

const getUserId = (): string => useAuthStore.getState().user?.id ?? 'anonymous';

interface RecipesState {
  customDishes: Dish[];
  addDish: (data: Omit<Dish, 'id' | 'isCustom' | 'createdBy'>) => void;
  updateDish: (id: string, partial: Partial<Omit<Dish, 'id' | 'isCustom' | 'createdBy'>>) => void;
  deleteDish: (id: string) => void;
}

export const useRecipesStore = create<RecipesState>()(
  persist(
    (set) => ({
      customDishes: [],

      addDish: (data) => {
        set((state) => ({
          customDishes: [
            ...state.customDishes,
            {
              ...data,
              id: `custom_dish_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              isCustom: true,
              createdBy: getUserId(),
            },
          ],
        }));
        sync();
      },

      updateDish: (id, partial) => {
        const userId = getUserId();
        set((state) => ({
          customDishes: state.customDishes.map((dish) =>
            dish.id === id && dish.createdBy === userId
              ? { ...dish, ...partial }
              : dish,
          ),
        }));
        sync();
      },

      deleteDish: (id) => {
        const userId = getUserId();
        set((state) => ({
          customDishes: state.customDishes.filter(
            (dish) => !(dish.id === id && dish.createdBy === userId),
          ),
        }));
        sync();
      },
    }),
    { name: 'nutrikal-recipes' },
  ),
);
