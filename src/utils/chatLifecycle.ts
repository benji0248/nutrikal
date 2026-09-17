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
 *
 * Persistence note:
 * `activeSurface` is intentionally NOT persisted to the backend today.
 * Persisting it would require a schema/API migration (`chat_conversations`
 * only stores messages + lastWeekPlan + lastMealType). With robust
 * `deriveSurfaceFromMessages` + trailing-options semantics, restore is
 * deterministic for both new and legacy transcripts. Prefer adding an
 * explicit `active_surface` column later if we want to drop inference.
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

function optionKey(o: ChatOption): string {
  return `${o.action}::${o.id}::${o.payload ?? ''}`;
}

function optionsMatchExpected(actual: ChatOption[], expected: ChatOption[]): boolean {
  if (actual.length !== expected.length) return false;
  const expectedKeys = new Set(expected.map(optionKey));
  return actual.every((o) => expectedKeys.has(optionKey(o)));
}

/**
 * Options that are truly "current": the transcript must end with
 * `assistant-options` (ignoring only trailing loading bubbles).
 * Older options buried under later text/dish/plan/applied/user turns
 * are NOT trailing and must not satisfy reconcile.
 */
export function getTrailingOptionsMessage(messages: ChatMessage[]): ChatMessage | null {
  let i = messages.length - 1;
  while (i >= 0 && messages[i]?.type === 'assistant-loading') i -= 1;
  if (i < 0) return null;
  const last = messages[i];
  if (!last || last.type !== 'assistant-options') return null;
  return last;
}

export function getTrailingOptions(messages: ChatMessage[]): ChatOption[] | null {
  const msg = getTrailingOptionsMessage(messages);
  return msg?.options?.length ? msg.options : null;
}

/**
 * Infer surface from a persisted transcript (fallback when `activeSurface`
 * is not persisted). Walks from the end so later transitions win over
 * older option rows.
 *
 * `assistant-applied` is only created by week-plan apply (`handleApplyPlan`);
 * dish apply never emits that type — verified repo-wide. Therefore it maps
 * deterministically to `post_apply_plan`.
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
      if (actions.has('rescue_rebalance') || actions.has('rescue_mark_flex') || actions.has('rescue_continue')) {
        return 'rescue';
      }
      if (actions.has('generate_for_slot') || actions.has('quick_reply')) return 'calendar_slot';
      // Plan post-apply always includes shopping CTA; dish post-apply does not.
      if (actions.has('go_shopping')) return 'post_apply_plan';
      if (actions.has('go_calendar') && actions.has('start_cook_now')) return 'post_apply_dish';
      if (actions.has('week_plan') && actions.has('start_cook_now') && actions.has('rescue')) {
        return 'home';
      }
      if (actions.has('week_plan') && actions.has('start_cook_now')) return 'home_fresh';
      if (actions.has('week_plan')) return 'home_fresh';
      continue;
    }

    if (m.type === 'assistant-dish') return 'review_dish';
    if (m.type === 'assistant-plan') return 'review_plan';
    // Only emitted after applying a week plan — never after a single dish.
    if (m.type === 'assistant-applied') return 'post_apply_plan';

    if (m.type === 'assistant-text' || m.type === 'user-text' || m.type === 'user-choice') {
      return 'home';
    }
  }

  return 'home';
}

/**
 * True when the transcript *ends* with options that already match the
 * expected action set for the surface (order-insensitive by action+id+payload).
 */
export function trailingOptionsMatchSurface(
  messages: ChatMessage[],
  surface: ChatSurface,
  ctx?: { mealType?: MealType; hasExistingMeal?: boolean },
): boolean {
  const trailing = getTrailingOptions(messages);
  if (!trailing) return false;
  return optionsMatchExpected(trailing, buildActionsForSurface(surface, ctx));
}

export type ChatLifecycleEngineMode = 'home' | 'calendar_overlay';

export type ChatLifecyclePlan =
  | { action: 'none' }
  | { action: 'seed'; surface: 'home' | 'no_profile' }
  | {
      action: 'reconcile';
      surface: ChatSurface;
      /** When true, append a fresh options row for `surface`. */
      appendOptions: boolean;
      /** Clear lastMealType / lastMealDate / pendingAction (home promotion). */
      clearMealContext: boolean;
      optionsCtx?: { mealType?: MealType; hasExistingMeal?: boolean };
    };

/**
 * Pure planner for the mount/hydrate/reset reconcile effect in useChatEngine.
 * Keeping this outside React lets us integration-test the real wiring rules
 * without mounting the full app.
 */
export function planChatLifecycle(input: {
  hasHydrated: boolean;
  hasCalendarIntent: boolean;
  hasProfile: boolean;
  messages: ChatMessage[];
  engineMode: ChatLifecycleEngineMode;
  lastMealType: MealType | null;
  alreadyReconciledThisEpoch: boolean;
}): ChatLifecyclePlan {
  if (!input.hasHydrated) return { action: 'none' };
  if (input.hasCalendarIntent) return { action: 'none' };

  if (input.messages.length === 0) {
    return {
      action: 'seed',
      surface: input.hasProfile ? 'home' : 'no_profile',
    };
  }

  if (input.alreadyReconciledThisEpoch) return { action: 'none' };

  const surfaceRaw = deriveSurfaceFromMessages(input.messages, input.hasProfile);
  const surface = resolveSurfaceForEngineMode(surfaceRaw, input.engineMode);
  const clearMealContext = surface === 'home' && surfaceRaw === 'calendar_slot';
  const optionsCtx =
    surface === 'calendar_slot' && input.lastMealType
      ? { mealType: input.lastMealType }
      : undefined;

  return {
    action: 'reconcile',
    surface,
    appendOptions: !trailingOptionsMatchSurface(input.messages, surface, optionsCtx),
    clearMealContext,
    optionsCtx,
  };
}

/** Whether enterSurface should append chips (skip consecutive duplicates). */
export function shouldAppendSurfaceOptions(
  messages: ChatMessage[],
  surface: ChatSurface,
  ctx?: { mealType?: MealType; hasExistingMeal?: boolean },
): boolean {
  return !trailingOptionsMatchSurface(messages, surface, ctx);
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
