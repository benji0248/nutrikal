import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useGistSyncStore } from './useGistSyncStore';
import { useCalendarStore } from './useCalendarStore';

interface DishFrequency {
  count: number;
  lastDate: string;
}

interface HistorialState {
  favorites: string[];
  toggleFavorite: (dishName: string) => void;
  isFavorite: (dishName: string) => boolean;
  getFrequencyMap: () => Map<string, DishFrequency>;
}

export const useHistorialStore = create<HistorialState>()(
  persist(
    (set, get) => ({
      favorites: [],

      toggleFavorite: (dishName: string) => {
        const current = get().favorites;
        const next = current.includes(dishName)
          ? current.filter((n) => n !== dishName)
          : [...current, dishName];
        set({ favorites: next });
        useGistSyncStore.getState().schedulePush();
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
    }),
    {
      name: 'nutrikal-historial',
      partialize: (state) => ({ favorites: state.favorites }),
    },
  ),
);
