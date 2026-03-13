import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CalendarState, DayPlan, MealType } from '../types';
import { todayISO, generateId, getWeekDays } from '../utils/dateHelpers';

const createEmptyDayPlan = (date: string): DayPlan => ({
  date,
  meals: {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
  },
  water: 0,
  notes: '',
});

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set, get) => ({
      currentDate: todayISO(),
      viewMode: 'week',
      activeTab: 'calendar',
      dayPlans: {},
      recipeBank: { meals: [], favorites: [] },
      weekTemplates: [],
      waterGoal: 8,
      darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,

      setCurrentDate: (date) => set({ currentDate: date }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setDarkMode: (dark) => set({ darkMode: dark }),

      getDayPlan: (date) => {
        const state = get();
        return state.dayPlans[date] ?? createEmptyDayPlan(date);
      },

      addMealToDay: (date, mealType, meal) =>
        set((state) => {
          const existing = state.dayPlans[date] ?? createEmptyDayPlan(date);
          return {
            dayPlans: {
              ...state.dayPlans,
              [date]: {
                ...existing,
                meals: {
                  ...existing.meals,
                  [mealType]: [...existing.meals[mealType], meal],
                },
              },
            },
          };
        }),

      updateMealInDay: (date, mealType, mealId, updates) =>
        set((state) => {
          const existing = state.dayPlans[date];
          if (!existing) return state;
          return {
            dayPlans: {
              ...state.dayPlans,
              [date]: {
                ...existing,
                meals: {
                  ...existing.meals,
                  [mealType]: existing.meals[mealType].map((m) =>
                    m.id === mealId ? { ...m, ...updates } : m,
                  ),
                },
              },
            },
          };
        }),

      removeMealFromDay: (date, mealType, mealId) =>
        set((state) => {
          const existing = state.dayPlans[date];
          if (!existing) return state;
          return {
            dayPlans: {
              ...state.dayPlans,
              [date]: {
                ...existing,
                meals: {
                  ...existing.meals,
                  [mealType]: existing.meals[mealType].filter((m) => m.id !== mealId),
                },
              },
            },
          };
        }),

      setWater: (date, count) =>
        set((state) => {
          const existing = state.dayPlans[date] ?? createEmptyDayPlan(date);
          return {
            dayPlans: {
              ...state.dayPlans,
              [date]: { ...existing, water: count },
            },
          };
        }),

      setDayNotes: (date, notes) =>
        set((state) => {
          const existing = state.dayPlans[date] ?? createEmptyDayPlan(date);
          return {
            dayPlans: {
              ...state.dayPlans,
              [date]: { ...existing, notes },
            },
          };
        }),

      addRecipe: (meal) =>
        set((state) => ({
          recipeBank: {
            ...state.recipeBank,
            meals: [...state.recipeBank.meals, meal],
          },
        })),

      removeRecipe: (id) =>
        set((state) => ({
          recipeBank: {
            meals: state.recipeBank.meals.filter((m) => m.id !== id),
            favorites: state.recipeBank.favorites.filter((fid) => fid !== id),
          },
        })),

      updateRecipe: (id, updates) =>
        set((state) => ({
          recipeBank: {
            ...state.recipeBank,
            meals: state.recipeBank.meals.map((m) =>
              m.id === id ? { ...m, ...updates } : m,
            ),
          },
        })),

      toggleFavorite: (id) =>
        set((state) => {
          const isFav = state.recipeBank.favorites.includes(id);
          return {
            recipeBank: {
              ...state.recipeBank,
              favorites: isFav
                ? state.recipeBank.favorites.filter((fid) => fid !== id)
                : [...state.recipeBank.favorites, id],
            },
          };
        }),

      saveWeekTemplate: (name, startDate) =>
        set((state) => {
          const weekDays = getWeekDays(startDate);
          const days: Record<string, DayPlan> = {};
          weekDays.forEach((day, index) => {
            const plan = state.dayPlans[day];
            if (plan) {
              days[String(index)] = plan;
            }
          });
          const template = { id: generateId(), name, days };
          return { weekTemplates: [...state.weekTemplates, template] };
        }),

      applyWeekTemplate: (templateId, startDate, mode) =>
        set((state) => {
          const template = state.weekTemplates.find((t) => t.id === templateId);
          if (!template) return state;

          const weekDays = getWeekDays(startDate);
          const newPlans = { ...state.dayPlans };

          weekDays.forEach((day, index) => {
            const templateDay = template.days[String(index)];
            if (templateDay) {
              if (mode === 'replace') {
                newPlans[day] = { ...templateDay, date: day };
              } else {
                const existing = newPlans[day] ?? createEmptyDayPlan(day);
                const mergedMeals = { ...existing.meals };
                (Object.keys(templateDay.meals) as MealType[]).forEach((mt) => {
                  mergedMeals[mt] = [
                    ...existing.meals[mt],
                    ...templateDay.meals[mt].map((m) => ({ ...m, id: generateId() })),
                  ];
                });
                newPlans[day] = { ...existing, meals: mergedMeals };
              }
            }
          });

          return { dayPlans: newPlans };
        }),

      deleteWeekTemplate: (id) =>
        set((state) => ({
          weekTemplates: state.weekTemplates.filter((t) => t.id !== id),
        })),

      setWaterGoal: (goal) => set({ waterGoal: goal }),
    }),
    {
      name: 'nutrikal-storage',
    },
  ),
);
