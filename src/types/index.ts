export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Desayuno',
  lunch: 'Almuerzo',
  dinner: 'Cena',
  snack: 'Snack',
};

export const MEAL_TYPE_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export interface Meal {
  id: string;
  name: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  notes?: string;
  tags?: string[];
}

export interface DayPlan {
  date: string;
  meals: Record<MealType, Meal[]>;
  water: number;
  notes: string;
}

export interface WeekTemplate {
  id: string;
  name: string;
  days: Partial<Record<string, DayPlan>>;
}

export interface RecipeBankData {
  meals: Meal[];
  favorites: string[];
}

export type ViewMode = 'week' | 'month';

export type AppTab = 'calendar' | 'recipes' | 'templates';

export interface CalendarState {
  currentDate: string;
  viewMode: ViewMode;
  activeTab: AppTab;
  dayPlans: Record<string, DayPlan>;
  recipeBank: RecipeBankData;
  weekTemplates: WeekTemplate[];
  waterGoal: number;
  darkMode: boolean;
  setCurrentDate: (date: string) => void;
  setViewMode: (mode: ViewMode) => void;
  setActiveTab: (tab: AppTab) => void;
  setDarkMode: (dark: boolean) => void;
  getDayPlan: (date: string) => DayPlan;
  addMealToDay: (date: string, mealType: MealType, meal: Meal) => void;
  updateMealInDay: (date: string, mealType: MealType, mealId: string, meal: Partial<Meal>) => void;
  removeMealFromDay: (date: string, mealType: MealType, mealId: string) => void;
  setWater: (date: string, count: number) => void;
  setDayNotes: (date: string, notes: string) => void;
  addRecipe: (meal: Meal) => void;
  removeRecipe: (id: string) => void;
  updateRecipe: (id: string, meal: Partial<Meal>) => void;
  toggleFavorite: (id: string) => void;
  saveWeekTemplate: (name: string, startDate: string) => void;
  applyWeekTemplate: (templateId: string, startDate: string, mode: 'merge' | 'replace') => void;
  deleteWeekTemplate: (id: string) => void;
  setWaterGoal: (goal: number) => void;
}
