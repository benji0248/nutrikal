import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DayPlan, Meal, MealType, Notification, ViewMode } from '../types';
import { todayKey, generateId, navigateDay, navigateWeek, navigateMonth } from '../utils/dateHelpers';

export const createEmptyDayPlan = (date: string): DayPlan => ({
  date,
  meals: { desayuno: [], almuerzo: [], cena: [], snack: [] },
  notes: '',
});

const sync = () => {
  import('./useGistSyncStore').then(({ useGistSyncStore }) =>
    useGistSyncStore.getState().schedulePush(),
  );
};

interface CalendarState {
  currentDate: string;
  view: ViewMode;
  dayPlans: Record<string, DayPlan>;
  notifications: Notification[];

  setView: (v: ViewMode) => void;
  setCurrentDate: (d: string) => void;
  navigateDay: (dir: 'prev' | 'next') => void;
  navigateWeek: (dir: 'prev' | 'next') => void;
  navigateMonth: (dir: 'prev' | 'next') => void;
  goToToday: () => void;
  upsertMeal: (date: string, mealType: MealType, meal: Meal) => void;
  deleteMeal: (date: string, mealType: MealType, mealId: string) => void;
  toggleMealCompleted: (date: string, mealType: MealType, mealId: string) => void;
  setNotes: (date: string, notes: string) => void;
  addNotification: (n: Omit<Notification, 'id'>) => void;
  toggleNotification: (id: string) => void;
  deleteNotification: (id: string) => void;
}

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set) => ({
      currentDate: todayKey(),
      view: 'day',
      dayPlans: {},
      notifications: [],

      setView: (v) => set({ view: v }),
      setCurrentDate: (d) => set({ currentDate: d }),

      navigateDay: (dir) =>
        set((s) => ({ currentDate: navigateDay(s.currentDate, dir) })),

      navigateWeek: (dir) =>
        set((s) => ({ currentDate: navigateWeek(s.currentDate, dir) })),

      navigateMonth: (dir) =>
        set((s) => ({ currentDate: navigateMonth(s.currentDate, dir) })),

      goToToday: () => set({ currentDate: todayKey() }),

      upsertMeal: (date, mealType, meal) => {
        set((s) => {
          const existing = s.dayPlans[date] ?? createEmptyDayPlan(date);
          const slotMeals = existing.meals[mealType];
          const idx = slotMeals.findIndex((m) => m.id === meal.id);
          const updated = idx >= 0
            ? slotMeals.map((m) => (m.id === meal.id ? meal : m))
            : [...slotMeals, meal];
          return {
            dayPlans: {
              ...s.dayPlans,
              [date]: {
                ...existing,
                meals: { ...existing.meals, [mealType]: updated },
              },
            },
          };
        });
        sync();
      },

      deleteMeal: (date, mealType, mealId) => {
        set((s) => {
          const existing = s.dayPlans[date];
          if (!existing) return s;
          return {
            dayPlans: {
              ...s.dayPlans,
              [date]: {
                ...existing,
                meals: {
                  ...existing.meals,
                  [mealType]: existing.meals[mealType].filter((m) => m.id !== mealId),
                },
              },
            },
          };
        });
        sync();
      },

      toggleMealCompleted: (date, mealType, mealId) => {
        set((s) => {
          const existing = s.dayPlans[date];
          if (!existing) return s;
          return {
            dayPlans: {
              ...s.dayPlans,
              [date]: {
                ...existing,
                meals: {
                  ...existing.meals,
                  [mealType]: existing.meals[mealType].map((m) =>
                    m.id === mealId ? { ...m, completed: !m.completed } : m,
                  ),
                },
              },
            },
          };
        });
        sync();
      },

      setNotes: (date, notes) => {
        set((s) => {
          const existing = s.dayPlans[date] ?? createEmptyDayPlan(date);
          return {
            dayPlans: { ...s.dayPlans, [date]: { ...existing, notes } },
          };
        });
        sync();
      },

      addNotification: (n) => {
        set((s) => ({
          notifications: [...s.notifications, { ...n, id: generateId() }],
        }));
        sync();
      },

      toggleNotification: (id) => {
        set((s) => ({
          notifications: s.notifications.map((n) =>
            n.id === id ? { ...n, enabled: !n.enabled } : n,
          ),
        }));
        sync();
      },

      deleteNotification: (id) => {
        set((s) => ({
          notifications: s.notifications.filter((n) => n.id !== id),
        }));
        sync();
      },
    }),
    { name: 'nutrikal-calendar' },
  ),
);
