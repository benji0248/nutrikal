import type {
  AppUser,
  Meal,
  MealType,
  Notification,
  UserProfile,
  CalculatorRecipe,
  Ingredient,
  Dish,
  ShoppingList,
  ShoppingItem,
  IngredientSignalEntry,
  Theme,
} from '../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
const JWT_KEY = 'nutrikal-jwt';

// ── Error class ──

interface ApiError {
  error: string;
  field?: string;
}

export class ApiAuthError extends Error {
  field?: string;
  status: number;

  constructor(message: string, status: number, field?: string) {
    super(message);
    this.name = 'ApiAuthError';
    this.status = status;
    this.field = field;
  }
}

// ── Helpers ──

function getToken(): string | null {
  return localStorage.getItem(JWT_KEY);
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (res.status === 401) {
    // Auto-logout on auth failure
    localStorage.removeItem(JWT_KEY);
    const { useAuthStore } = await import('../store/useAuthStore');
    useAuthStore.getState().logout();
    throw new ApiAuthError('Sesión expirada', 401);
  }
  if (!res.ok) {
    const err = data as ApiError;
    throw new ApiAuthError(err.error || 'Error inesperado', res.status, err.field);
  }
  return data as T;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, { headers: authHeaders() });
  return handleResponse<T>(res);
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

async function put<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

async function patch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PATCH',
    headers: authHeaders(),
  });
  return handleResponse<T>(res);
}

async function del<T>(path: string, body?: unknown): Promise<T> {
  const opts: RequestInit = {
    method: 'DELETE',
    headers: authHeaders(),
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}${path}`, opts);
  return handleResponse<T>(res);
}

// ── Auth ──

interface AuthResponse {
  token: string;
  user: AppUser;
}

export async function register(
  username: string,
  email: string,
  password: string,
  displayName?: string,
): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password, displayName }),
  });
  return handleResponse<AuthResponse>(res);
}

export async function login(
  identifier: string,
  password: string,
): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });
  return handleResponse<AuthResponse>(res);
}

export async function validateSession(token: string): Promise<AppUser> {
  const res = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await handleResponse<{ user: AppUser }>(res);
  return data.user;
}

// ── Migration ──

export async function migrateUser(): Promise<{ migrated: boolean; skipped: boolean }> {
  return post('/api/data/migrate', {});
}

// ── Batch Load ──

export interface BatchLoadResponse {
  meals: Array<{
    id: string; date: string; mealType: MealType; name: string;
    calories: number | null; notes: string | null; linkedRecipeId: string | null;
    entries: unknown[]; aiIngredients: unknown[]; completed: boolean;
  }>;
  dayNotes: Array<{ date: string; notes: string }>;
  profile: UserProfile | null;
  notifications: Notification[];
  calculatorRecipes: CalculatorRecipe[];
  customIngredients: Ingredient[];
  customDishes: Dish[];
  shoppingLists: ShoppingList[];
  settings: { theme: Theme; showCalories: boolean };
  favorites: string[];
  ingredientSignals: IngredientSignalEntry[];
}

export async function batchLoadAllData(): Promise<BatchLoadResponse> {
  return get('/api/data/batch-load');
}

// ── Meals ──

export async function createMeal(date: string, mealType: MealType, meal: Meal): Promise<void> {
  await post('/api/meals', { date, mealType, meal });
}

export async function createMealsBatch(
  meals: Array<{ date: string; mealType: MealType; id: string; name: string; calories?: number; aiIngredients?: unknown[]; entries?: unknown[] }>,
): Promise<void> {
  await post('/api/meals/batch', { meals });
}

export async function updateMeal(id: string, meal: Partial<Meal>): Promise<void> {
  await put(`/api/meals/${encodeURIComponent(id)}`, { meal });
}

export async function deleteMeal(id: string): Promise<void> {
  await del(`/api/meals/${encodeURIComponent(id)}`);
}

export async function toggleMealCompleted(id: string): Promise<{ completed: boolean }> {
  return patch(`/api/meals/${encodeURIComponent(id)}/toggle`);
}

// ── Day Notes ──

export async function setDayNotes(date: string, notes: string): Promise<void> {
  await put(`/api/notes/${encodeURIComponent(date)}`, { notes });
}

// ── Profile ──

export async function saveProfile(profile: UserProfile): Promise<void> {
  await put('/api/profile', { profile });
}

// ── Notifications ──

export async function createNotification(notification: Notification): Promise<void> {
  await post('/api/notifications', { notification });
}

export async function deleteNotification(id: string): Promise<void> {
  await del(`/api/notifications/${encodeURIComponent(id)}`);
}

export async function toggleNotification(id: string): Promise<{ enabled: boolean }> {
  return patch(`/api/notifications/${encodeURIComponent(id)}/toggle`);
}

// ── Calculator Recipes ──

export async function saveCalculatorRecipe(recipe: CalculatorRecipe): Promise<void> {
  await post('/api/recipes/calculator', { recipe });
}

export async function deleteCalculatorRecipe(id: string): Promise<void> {
  await del(`/api/recipes/calculator/${encodeURIComponent(id)}`);
}

// ── Custom Ingredients ──

export async function createCustomIngredient(ingredient: Ingredient): Promise<void> {
  await post('/api/ingredients/custom', { ingredient });
}

export async function updateCustomIngredient(id: string, ingredient: Partial<Ingredient>): Promise<void> {
  await put(`/api/ingredients/custom/${encodeURIComponent(id)}`, { ingredient });
}

export async function deleteCustomIngredient(id: string): Promise<void> {
  await del(`/api/ingredients/custom/${encodeURIComponent(id)}`);
}

// ── Custom Dishes ──

export async function createCustomDish(dish: Dish): Promise<void> {
  await post('/api/dishes/custom', { dish });
}

export async function updateCustomDish(id: string, dish: Partial<Dish>): Promise<void> {
  await put(`/api/dishes/custom/${encodeURIComponent(id)}`, { dish });
}

export async function deleteCustomDish(id: string): Promise<void> {
  await del(`/api/dishes/custom/${encodeURIComponent(id)}`);
}

// ── Shopping ──

export async function createShoppingList(list: ShoppingList): Promise<void> {
  await post('/api/shopping', { list });
}

export async function updateShoppingListItems(listId: string, items: ShoppingItem[]): Promise<void> {
  await put(`/api/shopping/${encodeURIComponent(listId)}`, { items });
}

export async function deleteShoppingList(id: string): Promise<void> {
  await del(`/api/shopping/${encodeURIComponent(id)}`);
}

export async function toggleShoppingItem(listId: string, itemId: string): Promise<{ checked: boolean }> {
  return patch(`/api/shopping/${encodeURIComponent(listId)}/items/${encodeURIComponent(itemId)}/toggle`);
}

export async function clearCheckedItems(listId: string): Promise<void> {
  await del(`/api/shopping/${encodeURIComponent(listId)}/checked`);
}

// ── Settings ──

export async function saveSettings(settings: { theme?: Theme; showCalories?: boolean }): Promise<void> {
  await put('/api/settings', settings);
}

// ── Favorites ──

export async function addFavorite(dishName: string): Promise<void> {
  await post('/api/favorites', { dishName });
}

export async function removeFavorite(dishName: string): Promise<void> {
  await del('/api/favorites', { dishName });
}

// ── Ingredient Signals ──

export async function batchCreateSignals(signals: IngredientSignalEntry[]): Promise<void> {
  await post('/api/signals', { signals });
}
