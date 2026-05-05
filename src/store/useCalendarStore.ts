import { create } from 'zustand';
import type { DayPlan, Meal, MealType, Notification, ViewMode } from '../types';
import { todayKey, generateId, navigateDay, navigateWeek, navigateMonth } from '../utils/dateHelpers';
import * as api from '../services/apiService';

export const createEmptyDayPlan = (date: string): DayPlan => ({
  date,
  meals: { desayuno: [], almuerzo: [], cena: [], snack: [] },
  notes: '',
});

interface CalendarState {
  currentDate: string;
  view: ViewMode;
  dayPlans: Record<string, DayPlan>;
  notifications: Notification[];
  isLoading: boolean;

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
  hydrateMeals: (meals: Array<{
    id: string; date: string; mealType: MealType; name: string;
    calories: number | null; notes: string | null; linkedRecipeId: string | null;
    entries: unknown[]; aiIngredients: unknown[]; completed: boolean;
  }>, dayNotes: Array<{ date: string; notes: string }>) => void;
  hydrateNotifications: (notifications: Notification[]) => void;
}

export const useCalendarStore = create<CalendarState>()((set) => ({
  currentDate: todayKey(),
  view: 'day',
  dayPlans: {},
  notifications: [],
  isLoading: false,

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
    api.createMeal(date, mealType, meal).catch(console.error);
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
    api.deleteMeal(mealId).catch(console.error);
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
    api.toggleMealCompleted(mealId).catch(console.error);
  },

  setNotes: (date, notes) => {
    set((s) => {
      const existing = s.dayPlans[date] ?? createEmptyDayPlan(date);
      return {
        dayPlans: { ...s.dayPlans, [date]: { ...existing, notes } },
      };
    });
    api.setDayNotes(date, notes).catch(console.error);
  },

  addNotification: (n) => {
    const notification: Notification = { ...n, id: generateId() };
    set((s) => ({
      notifications: [...s.notifications, notification],
    }));
    api.createNotification(notification).catch(console.error);
  },

  toggleNotification: (id) => {
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, enabled: !n.enabled } : n,
      ),
    }));
    api.toggleNotification(id).catch(console.error);
  },

  deleteNotification: (id) => {
    set((s) => ({
      notifications: s.notifications.filter((n) => n.id !== id),
    }));
    api.deleteNotification(id).catch(console.error);
  },

  hydrateMeals: (meals, dayNotes) => {
    const dayPlans: Record<string, DayPlan> = {};

    for (const m of meals) {
      if (!dayPlans[m.date]) {
        dayPlans[m.date] = createEmptyDayPlan(m.date);
      }
      const calMeal: Meal = {
        id: m.id,
        name: m.name,
        calories: m.calories ?? undefined,
        notes: m.notes ?? undefined,
        linkedRecipeId: m.linkedRecipeId ?? undefined,
        entries: m.entries as Meal['entries'],
        aiIngredients: m.aiIngredients as Meal['aiIngredients'],
        completed: m.completed,
      };
      dayPlans[m.date].meals[m.mealType].push(calMeal);
    }

    for (const n of dayNotes) {
      if (!dayPlans[n.date]) {
        dayPlans[n.date] = createEmptyDayPlan(n.date);
      }
      dayPlans[n.date].notes = n.notes;
    }

    set({ dayPlans });
  },

  hydrateNotifications: (notifications) => {
    set({ notifications });
  },
}));
