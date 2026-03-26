export type MealType = 'desayuno' | 'almuerzo' | 'cena' | 'snack';
export type Theme = 'dark' | 'light';
export type ViewMode = 'day' | 'week' | 'month';
export type AppTab = 'calendar' | 'calculator' | 'recipes' | 'assistant' | 'shopping' | 'settings';

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

export interface GistUser {
  login: string;
  name: string;
  avatarUrl: string;
  token: string;
  gistId: string | null;
}

export type SyncStatus =
  | 'idle'
  | 'syncing'
  | 'success'
  | 'error'
  | 'offline';

export interface GistPayload {
  version: number;
  lastModified: string;
  dayPlans: Record<string, DayPlan>;
  weekTemplates: WeekTemplate[];
  savedRecipes: CalculatorRecipe[];
  customIngredients: Ingredient[];
  notifications: Notification[];
  settings: {
    waterGoalDefault: number;
    theme: Theme;
    showCalories?: boolean;
  };
  profile?: UserProfile;
  shoppingLists?: ShoppingList[];
  activityLog?: ActivityEntry[];
}

export type AuthState =
  | 'unauthenticated'
  | 'authenticating'
  | 'authenticated'
  | 'error';

// ── Profile types ──

export type Sex = 'male' | 'female';

export type Goal = 'lose' | 'maintain' | 'gain';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export type DietaryRestriction =
  | 'vegetarian'
  | 'vegan'
  | 'gluten_free'
  | 'lactose_free'
  | 'low_sodium'
  | 'diabetic';

export interface UserProfile {
  id: string;
  name: string;
  birthDate: string; // yyyy-MM-dd
  sex: Sex;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: Goal;
  restrictions: DietaryRestriction[];
  dislikedIngredientIds: string[];
  createdAt: string;
  updatedAt: string;
  lastRecalibration: string;
}

export interface MetabolicResult {
  bmr: number;
  tdee: number;
  budget: number; // adjusted by goal
  macroSplit: { protein: number; carbs: number; fat: number }; // grams
}

// ── Dish types ──

export type DishCategory = 'desayuno' | 'almuerzo' | 'cena' | 'snack' | 'postre';

export type DishTag =
  | 'rapido'
  | 'economico'
  | 'alto_proteina'
  | 'bajo_carb'
  | 'vegetariano'
  | 'vegano'
  | 'sin_gluten'
  | 'sin_lactosa'
  | 'comfort'
  | 'liviano';

export interface DishIngredient {
  ingredientId: string;
  grams: number;
}

export interface Dish {
  id: string;
  name: string;
  category: DishCategory;
  tags: DishTag[];
  ingredients: DishIngredient[];
  defaultServings: number;
  prepMinutes: number;
  humanPortion: string; // e.g. "1 plato", "2 tostadas"
}

// ── Energy level ──

export type EnergyLevel = 'green' | 'amber' | 'warm_orange';

// ── Shopping types ──

export type ShoppingSection =
  | 'frutas_verduras'
  | 'carniceria'
  | 'lacteos_fiambres'
  | 'almacen'
  | 'panaderia'
  | 'bebidas'
  | 'congelados'
  | 'otros';

export interface ShoppingItem {
  id: string;
  ingredientId: string;
  name: string;
  quantity: string; // humanized, e.g. "500g", "1 docena"
  section: ShoppingSection;
  checked: boolean;
}

export interface ShoppingList {
  id: string;
  name: string;
  createdAt: string;
  dateRange: { from: string; to: string };
  items: ShoppingItem[];
}

// ── Activity types ──

export interface ActivityEntry {
  id: string;
  date: string;
  description: string;
  durationMinutes: number;
  caloriesBurned: number; // internal only, never displayed
}

// ── Ingredient portion types ──

export interface IngredientPortion {
  unit: string;
  unitPlural: string;
  gramsPerUnit: number;
}

// ── Chat types ──

export type ChatStep =
  | 'welcome'
  | 'meal_selected'
  | 'dish_selected'
  | 'confirmed'
  | 'day_summary'
  | 'water_tracking';

export type ChatMessageType =
  | 'assistant-text'
  | 'assistant-options'
  | 'assistant-dishes'
  | 'assistant-recipe'
  | 'assistant-summary'
  | 'assistant-water'
  | 'assistant-energy'
  | 'user-choice';

export interface ChatOption {
  id: string;
  label: string;
  icon?: string;
  action: string;
  payload?: string;
}

export interface ChatMessage {
  id: string;
  type: ChatMessageType;
  text?: string;
  options?: ChatOption[];
  dishSuggestions?: Dish[];
  selectedDish?: Dish;
  servings?: number;
  humanIngredients?: Array<{ name: string; humanPortion: string }>;
  daySummary?: {
    meals: Array<{ mealType: MealType; name: string }>;
    energyLevel: EnergyLevel;
    water: number;
    waterGoal: number;
  };
  timestamp: string;
}

// ── Label maps ──

export const ACTIVITY_LEVEL_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sedentario',
  light: 'Ligero',
  moderate: 'Moderado',
  active: 'Activo',
  very_active: 'Muy activo',
};

export const GOAL_LABELS: Record<Goal, string> = {
  lose: 'Bajar de peso',
  maintain: 'Mantener',
  gain: 'Subir de peso',
};

export const DISH_CATEGORY_LABELS: Record<DishCategory, string> = {
  desayuno: 'Desayuno',
  almuerzo: 'Almuerzo',
  cena: 'Cena',
  snack: 'Snack',
  postre: 'Postre',
};

export const SHOPPING_SECTION_LABELS: Record<ShoppingSection, string> = {
  frutas_verduras: 'Frutas y Verduras',
  carniceria: 'Carnicería',
  lacteos_fiambres: 'Lácteos y Fiambres',
  almacen: 'Almacén',
  panaderia: 'Panadería',
  bebidas: 'Bebidas',
  congelados: 'Congelados',
  otros: 'Otros',
};
