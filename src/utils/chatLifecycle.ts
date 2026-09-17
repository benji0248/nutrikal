import type { ChatMessage, ChatOption, MealType } from '../types';
import { MEAL_TYPE_ORDER } from '../types';
import {
  getCurrentMealType,
  mealTypeChipLabel,
  mealTypeToPromptLabel,
} from './mealTimeHelpers';
import { buildCalendarSlotOptions } from './calendarMealChat';

/**
 * Functional conversational surface — single source of truth for which
 * quick actions belong to the current chat lifecycle stage.
 * Actions are rebuilt from this surface, not from the message sequence.
 */
export type ChatSurface =
  | 'no_profile'
  | 'home'
  | 'home_fresh'
  | 'pick_meal'
  | 'rescue'
  | 'calendar_slot'
  | 'review_dish'
  | 'review_plan'
  | 'post_apply_dish'
  | 'post_apply_plan';

export const WEEK_PLAN_OPTION_ID = 'week_plan';
export const WEEK_PLAN_ACTION = 'week_plan';

export function buildWeekPlanOption(): ChatOption {
  return {
    id: WEEK_PLAN_OPTION_ID,
    label: 'Planificá mi semana',
    action: WEEK_PLAN_ACTION,
    icon: 'CalendarDays',
  };
}

export function buildWelcomeOptions(): ChatOption[] {
  return [
    {
      id: 'cook_now',
      label: 'No sé qué cocinar ahora',
      action: 'start_cook_now',
      icon: 'UtensilsCrossed',
    },
    buildWeekPlanOption(),
    {
      id: 'rescue',
      label: 'Comí algo que no debía',
      action: 'rescue',
      icon: 'AlertCircle',
    },
  ];
}

export function buildFreshProfileWelcomeOptions(): ChatOption[] {
  const current = getCurrentMealType();
  if (current) {
    return [
      {
        id: 'cook_now_meal',
        label: `Armá mi ${mealTypeChipLabel(current)}`,
        action: 'start_cook_now',
        icon: 'UtensilsCrossed',
      },
      buildWeekPlanOption(),
    ];
  }
  return buildWelcomeOptions();
}

export function buildMealTypeOptions(): ChatOption[] {
  const icons: Record<MealType, string> = {
    desayuno: 'Coffee',
    almuerzo: 'UtensilsCrossed',
    cena: 'Moon',
    snack: 'Cookie',
  };

  return MEAL_TYPE_ORDER.map((mt) => ({
    id: `meal_${mt}`,
    label: mealTypeChipLabel(mt),
    action: 'pick_meal_type',
    payload: mt,
    icon: icons[mt],
  }));
}

export function buildRescueOptions(): ChatOption[] {
  return [
    {
      id: 'rescue_rebalance',
      label: 'Ajustá el resto del día',
      action: 'rescue_rebalance',
      icon: 'UtensilsCrossed',
    },
    {
      id: 'rescue_mark_flex',
      label: 'Marcá hoy como flex',
      action: 'rescue_mark_flex',
      icon: 'CalendarDays',
    },
    {
      id: 'rescue_continue',
      label: 'Seguí normal',
      action: 'rescue_continue',
      icon: 'Check',
    },
  ];
}

export function buildPostApplyDishOptions(): ChatOption[] {
  return [
    {
      id: 'go_calendar',
      label: 'Ver en calendario',
      action: 'go_calendar',
      icon: 'CalendarDays',
    },
    {
      id: 'cook_again',
      label: 'Cocinar otra cosa',
      action: 'start_cook_now',
      icon: 'UtensilsCrossed',
    },
    buildWeekPlanOption(),
  ];
}

export function buildPostApplyPlanOptions(): ChatOption[] {
  return [
    {
      id: 'go_shopping',
      label: 'Ver lista de compras',
      action: 'go_shopping',
      icon: 'ShoppingCart',
    },
    {
      id: 'go_calendar',
      label: 'Ver en calendario',
      action: 'go_calendar',
      icon: 'CalendarDays',
    },
    {
      id: 'cook_again',
      label: 'Cocinar otra cosa',
      action: 'start_cook_now',
      icon: 'UtensilsCrossed',
    },
    buildWeekPlanOption(),
  ];
}

export function buildNoProfileOptions(): ChatOption[] {
  return [
    { id: 'create_profile', label: 'Crear perfil', action: 'create_profile', icon: 'UserCircle' },
  ];
}

/**
 * Options for a given functional surface. Same surface ⇒ same actions,
 * regardless of how the user arrived (reset, restore, navigation, etc.).
 */
export function buildActionsForSurface(
  surface: ChatSurface,
  ctx?: { mealType?: MealType; hasExistingMeal?: boolean },
): ChatOption[] {
  switch (surface) {
    case 'no_profile':
      return buildNoProfileOptions();
    case 'home':
      return buildWelcomeOptions();
    case 'home_fresh':
      return buildFreshProfileWelcomeOptions();
    case 'pick_meal':
      return buildMealTypeOptions();
    case 'rescue':
      return buildRescueOptions();
    case 'calendar_slot':
      return buildCalendarSlotOptions(
        ctx?.mealType ?? 'almuerzo',
        Boolean(ctx?.hasExistingMeal),
      );
    case 'review_dish':
    case 'review_plan':
      // Dish/plan cards own primary CTA; keep global escape hatch deterministic.
      return buildWelcomeOptions();
    case 'post_apply_dish':
      return buildPostApplyDishOptions();
    case 'post_apply_plan':
      return buildPostApplyPlanOptions();
    default:
      return buildWelcomeOptions();
  }
}

export function optionsIncludeWeekPlan(options: ChatOption[]): boolean {
  return options.some((o) => o.action === WEEK_PLAN_ACTION || o.id === WEEK_PLAN_OPTION_ID);
}

/** Surfaces where planificación semanal must be available. */
export function surfaceExpectsWeekPlan(surface: ChatSurface): boolean {
  return (
    surface === 'home' ||
    surface === 'home_fresh' ||
    surface === 'review_dish' ||
    surface === 'review_plan' ||
    surface === 'post_apply_dish' ||
    surface === 'post_apply_plan'
  );
}

export function resolveSurfaceForEngineMode(
  surface: ChatSurface,
  mode: 'home' | 'calendar_overlay',
): ChatSurface {
  if (mode === 'home' && surface === 'calendar_slot') return 'home';
  return surface;
}

/**
 * Infer surface from a persisted transcript so hydrate/openConversation
 * can rebuild the correct trailing actions without depending on path history.
 */
export function deriveSurfaceFromMessages(
  messages: ChatMessage[],
  hasProfile: boolean,
): ChatSurface {
  if (!hasProfile) return 'no_profile';

  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (!m || m.type === 'assistant-loading') continue;

    if (m.type === 'assistant-options' && m.options?.length) {
      const actions = new Set(m.options.map((o) => o.action));
      if (actions.has('create_profile')) return 'no_profile';
      if (actions.has('pick_meal_type')) return 'pick_meal';
      if (actions.has('rescue_rebalance') || actions.has('rescue_mark_flex')) return 'rescue';
      if (actions.has('generate_for_slot') || actions.has('quick_reply')) return 'calendar_slot';
      if (actions.has('go_shopping')) return 'post_apply_plan';
      if (actions.has('go_calendar') && actions.has('start_cook_now')) {
        return optionsIncludeWeekPlan(m.options) || actions.has('week_plan')
          ? 'post_apply_dish'
          : 'post_apply_dish';
      }
      if (actions.has('week_plan') && actions.has('start_cook_now')) return 'home';
      if (actions.has('week_plan')) return 'home_fresh';
      continue;
    }

    if (m.type === 'assistant-dish') return 'review_dish';
    if (m.type === 'assistant-plan') return 'review_plan';
    if (m.type === 'assistant-applied') return 'post_apply_plan';

    if (m.type === 'assistant-text' || m.type === 'user-text' || m.type === 'user-choice') {
      return 'home';
    }
  }

  return 'home';
}

/**
 * True when the latest trailing options already match the expected action set
 * for the surface (order-insensitive by action+id).
 */
export function trailingOptionsMatchSurface(
  messages: ChatMessage[],
  surface: ChatSurface,
  ctx?: { mealType?: MealType; hasExistingMeal?: boolean },
): boolean {
  const expected = buildActionsForSurface(surface, ctx);
  const last = [...messages].reverse().find((m) => m.type === 'assistant-options');
  if (!last?.options || last.options.length !== expected.length) return false;

  const key = (o: ChatOption) => `${o.action}::${o.id}::${o.payload ?? ''}`;
  const expectedKeys = new Set(expected.map(key));
  return last.options.every((o) => expectedKeys.has(key(o)));
}

export function buildWelcomeText(name?: string): string {
  const greeting = name ? `¡Hola, ${name}!` : '¡Hola!';
  const current = getCurrentMealType();
  if (current) {
    return `${greeting} ¿Qué comemos hoy? Puedo armarte el ${mealTypeToPromptLabel(current)} o planificarte la semana entera — contame qué necesitás.`;
  }
  return `${greeting} ¿Qué comemos hoy? Contame qué necesitás y me ocupo yo.`;
}

export function buildFreshProfileWelcomeText(name?: string): string {
  const greeting = name ? `¡Listo, ${name}!` : '¡Listo!';
  const current = getCurrentMealType();
  if (current) {
    return `${greeting} ¿Armamos tu ${mealTypeToPromptLabel(current)}?`;
  }
  return `${greeting} ¿Qué comemos primero?`;
}

export function buildNoProfileWelcomeText(): string {
  return '¡Bienvenido a NutriKal! Creá tu perfil para empezar.';
}
