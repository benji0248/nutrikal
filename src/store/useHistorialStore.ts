import { create } from 'zustand';
import { useCalendarStore } from './useCalendarStore';
import * as api from '../services/apiService';

interface DishFrequency {
  count: number;
  lastDate: string;
}

interface HistorialState {
  favorites: string[];
  isLoading: boolean;
  toggleFavorite: (dishName: string) => void;
  isFavorite: (dishName: string) => boolean;
  getFrequencyMap: () => Map<string, DishFrequency>;
  hydrateFavorites: (favorites: string[]) => void;
}

export const useHistorialStore = create<HistorialState>()((set, get) => ({
  favorites: [],
  isLoading: false,

  toggleFavorite: (dishName: string) => {
    const current = get().favorites;
    const isFav = current.includes(dishName);
    const next = isFav
      ? current.filter((n) => n !== dishName)
      : [...current, dishName];
    set({ favorites: next });

    if (isFav) {
      api.removeFavorite(dishName).catch(console.error);
    } else {
      api.addFavorite(dishName).catch(console.error);
    }
  },

  isFavorite: (dishName: string) => {
    return get().favorites.includes(dishName);
  },

  getFrequencyMap: () => {
    const { dayPlans } = useCalendarStore.getState();
    const map = new Map<string, DishFrequency>();

    for (const [dateKey, plan] of Object.entries(dayPlans)) {
      for (const meals of Object.values(plan.meals)) {
        for (const meal of meals) {
          if (!meal.name) continue;
          const existing = map.get(meal.name);
          if (existing) {
            existing.count += 1;
            if (dateKey > existing.lastDate) existing.lastDate = dateKey;
          } else {
            map.set(meal.name, { count: 1, lastDate: dateKey });
          }
        }
      }
    }

    return map;
  },

  hydrateFavorites: (favorites) => {
    set({ favorites });
  },
}));
