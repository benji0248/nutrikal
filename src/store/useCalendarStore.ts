import { create } from 'zustand';
import type { DayPlan, Meal, MealType, Notification, ViewMode } from '../types';
import { todayKey, navigateDay, navigateWeek, navigateMonth } from '../utils/dateHelpers';
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

  setView: (v: ViewMode) => void;
  setCurrentDate: (d: string) => void;
  navigateDay: (dir: 'prev' | 'next') => void;
  navigateWeek: (dir: 'prev' | 'next') => void;
  navigateMonth: (dir: 'prev' | 'next') => void;
  goToToday: () => void;
  upsertMeal: (date: string, mealType: MealType, meal: Meal) => void;
  bulkUpsertMeals: (meals: Array<{ date: string; mealType: MealType; meal: Meal }>) => void;
  deleteMeal: (date: string, mealType: MealType, mealId: string) => void;
  setNotes: (date: string, notes: string) => void;
  hydrateMeals: (meals: Array<{
    id: string; date: string; mealType: MealType; name: string;
    calories: number | null; notes: string | null; linkedRecipeId: string | null;
    entries: unknown[]; aiIngredients: unknown[]; completed: boolean;
    prepMinutes?: number | null; humanPortion?: string | null;
    preparation?: string | null; tip?: string | null;
  }>, dayNotes: Array<{ date: string; notes: string }>) => void;
  hydrateNotifications: (notifications: Notification[]) => void;
}

export const useCalendarStore = create<CalendarState>()((set) => ({
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
    api.createMeal(date, mealType, meal).catch(console.error);
  },

  bulkUpsertMeals: (meals) => {
    set((s) => {
      const newDayPlans = { ...s.dayPlans };
      for (const { date, mealType, meal } of meals) {
        const existing = newDayPlans[date] ?? createEmptyDayPlan(date);
        const slotMeals = existing.meals[mealType];
        const idx = slotMeals.findIndex((m) => m.id === meal.id);
        const updated = idx >= 0
          ? slotMeals.map((m) => (m.id === meal.id ? meal : m))
          : [...slotMeals, meal];
        newDayPlans[date] = {
          ...existing,
          meals: { ...existing.meals, [mealType]: updated },
        };
      }
      return { dayPlans: newDayPlans };
    });
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

  setNotes: (date, notes) => {
    set((s) => {
      const existing = s.dayPlans[date] ?? createEmptyDayPlan(date);
      return {
        dayPlans: { ...s.dayPlans, [date]: { ...existing, notes } },
      };
    });
    api.setDayNotes(date, notes).catch(console.error);
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
        prepMinutes: m.prepMinutes ?? undefined,
        humanPortion: m.humanPortion ?? undefined,
        preparation: m.preparation ?? undefined,
        tip: m.tip ?? undefined,
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
