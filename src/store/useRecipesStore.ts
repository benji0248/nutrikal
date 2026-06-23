import { create } from 'zustand';
import type { Dish } from '../types';
import { useAuthStore } from './useAuthStore';
import * as api from '../services/apiService';

const getUserId = (): string => useAuthStore.getState().user?.id ?? 'anonymous';

interface RecipesState {
  customDishes: Dish[];
  addDish: (data: Omit<Dish, 'id' | 'isCustom' | 'createdBy'>) => void;
  updateDish: (id: string, partial: Partial<Omit<Dish, 'id' | 'isCustom' | 'createdBy'>>) => void;
  deleteDish: (id: string) => void;
  hydrateDishes: (dishes: Dish[]) => void;
}

export const useRecipesStore = create<RecipesState>()((set) => ({
  customDishes: [],

  addDish: (data) => {
    const dish: Dish = {
      ...data,
      id: `custom_dish_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      isCustom: true,
      createdBy: getUserId(),
    };
    set((state) => ({
      customDishes: [...state.customDishes, dish],
    }));
    api.createCustomDish(dish).catch(console.error);
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
    api.updateCustomDish(id, partial as Partial<Dish>).catch(console.error);
  },

  deleteDish: (id) => {
    const userId = getUserId();
    set((state) => ({
      customDishes: state.customDishes.filter(
        (dish) => !(dish.id === id && dish.createdBy === userId),
      ),
    }));
    api.deleteCustomDish(id).catch(console.error);
  },

  hydrateDishes: (dishes) => {
    set({ customDishes: dishes });
  },
}));
