export type MealType = 'desayuno' | 'almuerzo' | 'cena' | 'snack';
export type Theme = 'dark' | 'light';
export type ViewMode = 'day' | 'week' | 'month';
export type AppTab = 'calendar' | 'historial' | 'assistant' | 'shopping' | 'settings';

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

// ── AI-generated meal types ──

export interface AiIngredient {
  name: string;
  grams: number;
  kcal: number;
}

export interface AiMeal {
  name: string;
  ingredients: AiIngredient[];
  totalKcal: number;
  prepMinutes?: number;
  humanPortion?: string;
}

export interface Meal {
  id: string;
  name: string;
  calories?: number;
  notes?: string;
  linkedRecipeId?: string;
  entries?: CalculatorEntry[];
  aiIngredients?: AiIngredient[];
  completed?: boolean;
}

export interface DayPlan {
  date: string;
  meals: Record<MealType, Meal[]>;
  notes: string;
}

export interface Notification {
  id: string;
  label: string;
  time: string;
  enabled: boolean;
  type: 'water' | 'meal' | 'custom';
  mealType?: MealType;
}



export interface AppUser {
  id: string;
  username: string;
  email: string;
  displayName: string;
}

export type AuthView = 'login' | 'register';

export type SyncStatus =
  | 'idle'
  | 'syncing'
  | 'success'
  | 'error'
  | 'offline';

/** Payload serializado para guardar/cargar en Supabase (tabla user_data) o exportar como backup JSON */
export interface AppPayload {
  version: number;
  lastModified: string;
  dayPlans: Record<string, DayPlan>;
  savedRecipes: CalculatorRecipe[];
  customIngredients: Ingredient[];
  notifications: Notification[];
  settings: {
    theme: Theme;
    showCalories?: boolean;
  };
  profile?: UserProfile;
  shoppingLists?: ShoppingList[];
  customDishes?: Dish[];
  favoriteDishes?: string[];
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
  dislikedCategories?: string[];
  allowedExceptions?: string[];
  nationality?: string;
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
  isCustom?: boolean;
  createdBy?: string; // user ID of the creator
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
  | 'day_summary';

export type ChatMessageType =
  | 'assistant-text'
  | 'assistant-options'
  | 'assistant-meals'
  | 'assistant-summary'
  | 'assistant-plan'
  | 'assistant-loading'
  | 'assistant-applied'
  | 'user-text'
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
  mealSuggestions?: Array<AiMeal & { reason: string }>;
  daySummary?: {
    meals: Array<{ mealType: MealType; name: string }>;
    energyLevel: EnergyLevel;
  };
  weekPlan?: WeekPlan;
  timestamp: string;
}

// ── AI types ──

export type AiAction =
  | AiAddMealAction
  | AiWeekPlanAction
  | AiSwapMealAction
  | AiSuggestMealsAction
  | AiShowSummaryAction;

export interface AiAddMealAction {
  type: 'add_meal';
  date: string;
  mealType: MealType;
  meal: AiMeal;
}

export interface AiWeekPlanAction {
  type: 'week_plan';
  days: PlannedDay[];
}

export interface AiSwapMealAction {
  type: 'swap_meal';
  date: string;
  mealType: MealType;
  meal: AiMeal;
}

export interface AiSuggestMealsAction {
  type: 'suggest_meals';
  meals: Array<AiMeal & { reason: string }>;
}

export interface AiShowSummaryAction {
  type: 'show_summary';
}

export interface PlannedMeal extends AiMeal {}

export interface PlannedDay {
  date: string;
  meals: Partial<Record<MealType, PlannedMeal>>;
}

export interface WeekPlan {
  days: PlannedDay[];
  applied: boolean;
}

export interface PlanPreferences {
  variety: 'poca' | 'normal' | 'mucha';
  cookingTime: 'rapido' | 'normal' | 'elaborado';
  budget: 'economico' | 'normal' | 'premium';
}

export interface AiChatContext {
  profile: {
    name: string;
    goal: string;
    restrictions: string[];
    dislikedIds: string[];
    dislikedNames: string[];
    dislikedCategories: string[];
    allowedExceptionNames: string[];
    dailyBudget: number;
    nationality?: string;
    sex?: string;
    heightCm?: number;
    weightKg?: number;
    age?: number;
  };
  todayPlan: unknown | null;
  weekSummary: string | null;
  conversationHistory: Array<{ role: 'user' | 'assistant'; text: string }>;
  todayDate: string;
  weekDates: string[] | null;
  preferences: PlanPreferences | null;
  dishHistory?: Array<{ name: string; count: number; lastDate: string; isFavorite: boolean }> | null;
}

export interface AiChatResponse {
  text: string;
  actions: AiAction[];
  quickReplies: string[];
  remaining: number;
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
  lose: 'Sentirme más liviano',
  maintain: 'Mantenerme como estoy',
  gain: 'Ganar fuerza y energía',
};

export const GOAL_DESCRIPTIONS: Record<Goal, string> = {
  lose: 'Porciones balanceadas con más variedad',
  maintain: 'Balance entre lo que comés y tu energía',
  gain: 'Más proteína y comidas más completas',
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
