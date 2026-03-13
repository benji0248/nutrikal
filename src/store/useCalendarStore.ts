import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DayPlan, Meal, MealType, Notification, ViewMode, WeekTemplate } from '../types';
import { todayKey, generateId, getWeekDayKeys, navigateDay, navigateWeek, navigateMonth } from '../utils/dateHelpers';

export const createEmptyDayPlan = (date: string): DayPlan => ({
  date,
  meals: { desayuno: [], almuerzo: [], cena: [], snack: [] },
  water: 0,
  waterGoal: 8,
  notes: '',
});

interface CalendarState {
  currentDate: string;
  view: ViewMode;
  dayPlans: Record<string, DayPlan>;
  weekTemplates: WeekTemplate[];
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
  setWater: (date: string, glasses: number) => void;
  setNotes: (date: string, notes: string) => void;
  saveWeekAsTemplate: (name: string) => void;
  applyTemplate: (templateId: string, targetMonday: string, mode: 'merge' | 'replace') => void;
  deleteTemplate: (id: string) => void;
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
      weekTemplates: [],
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

      upsertMeal: (date, mealType, meal) =>
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
        }),

      deleteMeal: (date, mealType, mealId) =>
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
        }),

      toggleMealCompleted: (date, mealType, mealId) =>
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
        }),

      setWater: (date, glasses) =>
        set((s) => {
          const existing = s.dayPlans[date] ?? createEmptyDayPlan(date);
          return {
            dayPlans: { ...s.dayPlans, [date]: { ...existing, water: glasses } },
          };
        }),

      setNotes: (date, notes) =>
        set((s) => {
          const existing = s.dayPlans[date] ?? createEmptyDayPlan(date);
          return {
            dayPlans: { ...s.dayPlans, [date]: { ...existing, notes } },
          };
        }),

      saveWeekAsTemplate: (name) =>
        set((s) => {
          const keys = getWeekDayKeys(s.currentDate);
          const days: WeekTemplate['days'] = {};
          keys.forEach((key, idx) => {
            const plan = s.dayPlans[key];
            if (plan) {
              days[String(idx)] = { meals: plan.meals, notes: plan.notes };
            }
          });
          return {
            weekTemplates: [
              ...s.weekTemplates,
              { id: generateId(), name, createdAt: new Date().toISOString(), days },
            ],
          };
        }),

      applyTemplate: (templateId, targetMonday, mode) =>
        set((s) => {
          const tpl = s.weekTemplates.find((t) => t.id === templateId);
          if (!tpl) return s;
          const keys = getWeekDayKeys(targetMonday);
          const newPlans = { ...s.dayPlans };
          keys.forEach((key, idx) => {
            const tplDay = tpl.days[String(idx)];
            if (!tplDay) return;
            if (mode === 'replace') {
              newPlans[key] = { ...createEmptyDayPlan(key), ...tplDay, date: key };
            } else {
              const existing = newPlans[key] ?? createEmptyDayPlan(key);
              const merged = { ...existing.meals };
              for (const mt of Object.keys(tplDay.meals) as MealType[]) {
                merged[mt] = [
                  ...existing.meals[mt],
                  ...tplDay.meals[mt].map((m) => ({ ...m, id: generateId() })),
                ];
              }
              newPlans[key] = { ...existing, meals: merged, notes: existing.notes || tplDay.notes };
            }
          });
          return { dayPlans: newPlans };
        }),

      deleteTemplate: (id) =>
        set((s) => ({
          weekTemplates: s.weekTemplates.filter((t) => t.id !== id),
        })),

      addNotification: (n) =>
        set((s) => ({
          notifications: [...s.notifications, { ...n, id: generateId() }],
        })),

      toggleNotification: (id) =>
        set((s) => ({
          notifications: s.notifications.map((n) =>
            n.id === id ? { ...n, enabled: !n.enabled } : n,
          ),
        })),

      deleteNotification: (id) =>
        set((s) => ({
          notifications: s.notifications.filter((n) => n.id !== id),
        })),
    }),
    { name: 'nutrikal-calendar' },
  ),
);
