export type MealType = 'desayuno' | 'almuerzo' | 'cena' | 'snack';
export type Theme = 'dark' | 'light';
export type ViewMode = 'day' | 'week' | 'month';
export type AppTab = 'calendar' | 'calculator' | 'recipes' | 'settings';

export type IngredientCategory =
  | 'carnes'
  | 'verduras'
  | 'frutas'
  | 'lacteos'
  | 'cereales'
  | 'legumbres'
  | 'grasas'
  | 'bebidas'
  | 'ultraprocesados'
  | 'comidas_preparadas'
  | 'otros';

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  desayuno: 'Desayuno',
  almuerzo: 'Almuerzo',
  cena: 'Cena',
  snack: 'Snack',
};

export const MEAL_TYPE_ORDER: MealType[] = ['desayuno', 'almuerzo', 'cena', 'snack'];

export const CATEGORY_LABELS: Record<IngredientCategory, string> = {
  carnes: 'Carnes',
  verduras: 'Verduras',
  frutas: 'Frutas',
  lacteos: 'Lácteos',
  cereales: 'Cereales',
  legumbres: 'Legumbres',
  grasas: 'Grasas',
  bebidas: 'Bebidas',
  ultraprocesados: 'Ultraprocesados',
  comidas_preparadas: 'Comidas preparadas',
  otros: 'Otros',
};

export const ALL_CATEGORIES: IngredientCategory[] = [
  'carnes',
  'verduras',
  'frutas',
  'lacteos',
  'cereales',
  'legumbres',
  'grasas',
  'bebidas',
  'ultraprocesados',
  'comidas_preparadas',
  'otros',
];

export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Ingredient extends Macros {
  id: string;
  name: string;
  category: IngredientCategory;
  isCustom?: boolean;
}

export interface CalculatorEntry {
  ingredientId: string;
  grams: number;
}

export interface CalculatorRecipe {
  id: string;
  name: string;
  entries: CalculatorEntry[];
  totalMacros: Macros;
  savedAt: string;
}

export interface Meal {
  id: string;
  name: string;
  calories?: number;
  notes?: string;
  linkedRecipeId?: string;
  entries?: CalculatorEntry[];
  completed?: boolean;
}

export interface DayPlan {
  date: string;
  meals: Record<MealType, Meal[]>;
  water: number;
  waterGoal: number;
  notes: string;
}

export interface WeekTemplate {
  id: string;
  name: string;
  createdAt: string;
  days: Partial<Record<string, Pick<DayPlan, 'meals' | 'notes'>>>;
}

export interface Notification {
  id: string;
  label: string;
  time: string;
  enabled: boolean;
  type: 'water' | 'meal' | 'custom';
  mealType?: MealType;
}
