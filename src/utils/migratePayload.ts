/**
 * migratePayload — normaliza y completa un JSON de backup/server al formato AppPayload actual.
 * Usada al cargar datos del servidor (Supabase) o al importar un backup JSON manual.
 *
 * Es una función pura sin side effects — no depende de ningún SDK externo.
 */

import type { AppPayload } from '../types';

function emptyPayload(): AppPayload {
  return {
    version: 1,
    lastModified: new Date().toISOString(),
    dayPlans: {},
    savedRecipes: [],
    customIngredients: [],
    notifications: [],
    settings: {
      theme: 'dark',
      showCalories: false,
    },
    profile: undefined,
    shoppingLists: [],
    customDishes: [],
    favoriteDishes: [],
    ingredientSignalLog: [],
  };
}

export function migratePayload(data: unknown): AppPayload {
  const base = emptyPayload();
  if (typeof data !== 'object' || data === null) return base;

  const raw = data as Record<string, unknown>;

  return {
    version: typeof raw.version === 'number' ? raw.version : 1,
    lastModified:
      typeof raw.lastModified === 'string' ? raw.lastModified : base.lastModified,
    dayPlans:
      raw.dayPlans && typeof raw.dayPlans === 'object'
        ? (raw.dayPlans as AppPayload['dayPlans'])
        : base.dayPlans,
    savedRecipes: Array.isArray(raw.savedRecipes)
      ? (raw.savedRecipes as AppPayload['savedRecipes'])
      : base.savedRecipes,
    customIngredients: Array.isArray(raw.customIngredients)
      ? (raw.customIngredients as AppPayload['customIngredients'])
      : base.customIngredients,
    notifications: Array.isArray(raw.notifications)
      ? (raw.notifications as AppPayload['notifications'])
      : base.notifications,
    settings: {
      theme:
        raw.settings &&
        ((raw.settings as Record<string, unknown>).theme === 'dark' ||
          (raw.settings as Record<string, unknown>).theme === 'light')
          ? (raw.settings as AppPayload['settings']).theme
          : base.settings.theme,
      showCalories:
        raw.settings &&
        typeof (raw.settings as Record<string, unknown>).showCalories === 'boolean'
          ? (raw.settings as AppPayload['settings']).showCalories
          : base.settings.showCalories,
    },
    profile:
      raw.profile && typeof raw.profile === 'object'
        ? (raw.profile as AppPayload['profile'])
        : base.profile,
    shoppingLists: Array.isArray(raw.shoppingLists)
      ? (raw.shoppingLists as AppPayload['shoppingLists'])
      : base.shoppingLists,
    customDishes: Array.isArray(raw.customDishes)
      ? (raw.customDishes as AppPayload['customDishes'])
      : base.customDishes,
    favoriteDishes: Array.isArray(raw.favoriteDishes)
      ? (raw.favoriteDishes as string[])
      : base.favoriteDishes,
    ingredientSignalLog: Array.isArray(raw.ingredientSignalLog)
      ? (raw.ingredientSignalLog as AppPayload['ingredientSignalLog'])
      : base.ingredientSignalLog,
  };
}
