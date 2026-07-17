import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  ChatMessage,
  ChatOption,
  EnergyLevel,
  HydratedAiDish,
  MealType,
  AiMeal,
  WeekPlan,
} from '../../types';
import { useProfileStore } from '../../store/useProfileStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useWeekPlanningStore } from '../../store/useWeekPlanningStore';
import { useIngredientsStore } from '../../store/useIngredientsStore';
import { sendMessage, type SendMessageResult } from '../../services/aiService';
import { generateWeekPlan } from '../../services/weekPlanApi';
import {
  buildFullWeekPlanFromApiResponse,
  buildWeekPlanningContext,
  getIsoWeekId,
  getMealBudgetForPlanDay,
  weekPlanningForApi,
} from '../../services/weekPlanService';
import {
  hydrateAiDish,
  hydratedDishToMeal,
  hydratedDishToAiMeal,
  plannedMealToMeal,
  normalizeHydratedAiDishToBudgetDetailed,
  PORTION_ADJUST_COPY,
} from '../../services/dishMatchService';
import { collectDishNamesFromWeekPlan } from '../../services/planRotationMemory';
import { recordMealRejected, recordWeekPlanApplied, recordRescueChoice } from '../../services/signalLogService';
import {
  getRemainingMealTypes,
  rebalanceRemainingMeals,
} from '../../services/rescueService';
import {
  buildPersonalizationNote,
  buildWeekPlanMemoryIntro,
  getRecentAcceptedIngredientHint,
  resolveDislikedCategoryLabels,
  resolveDislikedIngredientNames,
} from '../../services/personalizationCopy';
import { usePlanRotationStore } from '../../store/usePlanRotationStore';
import { useIngredientSignalStore } from '../../store/useIngredientSignalStore';
import { computeMetabolism } from '../../services/metabolicService';
import { getMealSlotBudget } from '../../services/portionEngine';
import { useCalendarStore } from '../../store/useCalendarStore';
import { useShoppingStore } from '../../store/useShoppingStore';
import { createShoppingItemsFromAiMeals } from '../../services/shoppingService';
import { INGREDIENTS_DB } from '../../data/ingredients';
import { MEAL_TYPE_ORDER } from '../../types';
import { todayKey, formatDayFull, parseDate } from '../../utils/dateHelpers';
import {
  getCurrentMealType,
  isMealType,
  mealTypeChipLabel,
  mealTypeToPromptLabel,
} from '../../utils/mealTimeHelpers';

export const AI_CONVERSATION_HISTORY_LIMIT = 10;

function makeId(): string {
  return crypto.randomUUID();
}

function buildWelcomeText(name?: string): string {
  const greeting = name ? `¡Hola, ${name}!` : '¡Hola!';
  const current = getCurrentMealType();
  if (current) {
    return `${greeting} ¿Qué comemos hoy? Puedo armarte el ${mealTypeToPromptLabel(current)} o planificarte la semana entera — contame qué necesitás.`;
  }
  return `${greeting} ¿Qué comemos hoy? Contame qué necesitás y me ocupo yo.`;
}

function buildWelcomeOptions(): ChatOption[] {
  return [
    {
      id: 'cook_now',
      label: 'No sé qué cocinar ahora',
      action: 'start_cook_now',
      icon: 'UtensilsCrossed',
    },
    {
      id: 'week_plan',
      label: 'Planificá mi semana',
      action: 'week_plan',
      icon: 'CalendarDays',
    },
    {
      id: 'rescue',
      label: 'Comí algo que no debía',
      action: 'rescue',
      icon: 'AlertCircle',
    },
  ];
}

function buildMealTypeOptions(): ChatOption[] {
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

function buildCookNowPrompt(mealType: MealType, dailyBudget: number): string {
  const label = mealTypeToPromptLabel(mealType);
  const slotKcal = getMealSlotBudget(dailyBudget, mealType);
  return `Generá mi ${label} de hoy. Plato completo para UNA sola comida (~${slotKcal} kcal en total, no el día entero).`;
}

function resolveMealBudget(profile: NonNullable<ReturnType<typeof useProfileStore.getState>['profile']>, mealType: MealType): number {
  return getMealSlotBudget(computeMetabolism(profile).budget, mealType);
}

function buildMealPickPrompt(): string {
  return '¿Qué comida querés armar?';
}

function buildCookNowInferPrompt(mealType: MealType): string {
  return `Te armo tu ${mealTypeToPromptLabel(mealType)} de hoy.`;
}

function buildFreshProfileWelcomeText(name?: string): string {
  const greeting = name ? `¡Listo, ${name}!` : '¡Listo!';
  const current = getCurrentMealType();
  if (current) {
    return `${greeting} ¿Armamos tu ${mealTypeToPromptLabel(current)}?`;
  }
  return `${greeting} ¿Qué comemos primero?`;
}

function buildFreshProfileWelcomeOptions(): ChatOption[] {
  const current = getCurrentMealType();
  if (current) {
    return [
      {
        id: 'cook_now_meal',
        label: `Armá mi ${mealTypeChipLabel(current)}`,
        action: 'start_cook_now',
        icon: 'UtensilsCrossed',
      },
      {
        id: 'week_plan',
        label: 'Planificá mi semana',
        action: 'week_plan',
        icon: 'CalendarDays',
      },
    ];
  }
  return buildWelcomeOptions();
}

function buildWelcomeMessagesForProfile(
  profile: NonNullable<ReturnType<typeof useProfileStore.getState>['profile']>,
  justOnboarded: boolean,
): ChatMessage[] {
  if (justOnboarded) {
    return [
      {
        id: makeId(),
        type: 'assistant-text',
        text: buildFreshProfileWelcomeText(profile.name),
        timestamp: new Date().toISOString(),
      },
      {
        id: makeId(),
        type: 'assistant-options',
        options: buildFreshProfileWelcomeOptions(),
        timestamp: new Date().toISOString(),
      },
    ];
  }

  return [
    {
      id: makeId(),
      type: 'assistant-text',
      text: buildWelcomeText(profile.name),
      timestamp: new Date().toISOString(),
    },
    {
      id: makeId(),
      type: 'assistant-options',
      options: buildWelcomeOptions(),
      timestamp: new Date().toISOString(),
    },
  ];
}

function buildRescueOptions(): ChatOption[] {
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

function buildPostApplyPlanOptions(): ChatOption[] {
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
  ];
}

function buildPostApplyOptions(): ChatOption[] {
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
  ];
}

interface ChatEngineResult {
  messages: ChatMessage[];
  hasProfile: boolean;
  hasWeekPlanningProfile: boolean;
  handleOption: (option: ChatOption) => void;
  handleSendMessage: (text: string) => void;
  handleApplyDish: (dish: HydratedAiDish, date: string, mealType: MealType) => void;
  handleApplyPlan: (plan: WeekPlan) => void;
  handleRegeneratePlan: () => void;
  handleRegenerateDish: (messageId: string, dish: HydratedAiDish, mealType?: MealType) => void;
  handleSwapMeal: (date: string, mealType: MealType) => void;
  runWeekPlanGeneration: () => void;
  energyLevel: EnergyLevel;
  energyRatio: number;
  showCalories: boolean;
  isLoading: boolean;
  remainingMessages: number | null;
}

export function useChatEngine(): ChatEngineResult {
  const profile = useProfileStore((s) => s.profile);
  const justOnboarded = useProfileStore((s) => s.justOnboarded);
  const clearJustOnboarded = useProfileStore((s) => s.clearJustOnboarded);
  const hasWeekPlanningProfile = useWeekPlanningStore((s) => !!s.weekPlanning?.completedAt);
  const dayPlans = useCalendarStore((s) => s.dayPlans);
  const bulkUpsertMeals = useCalendarStore((s) => s.bulkUpsertMeals);
  const upsertMeal = useCalendarStore((s) => s.upsertMeal);
  const customIngredients = useIngredientsStore((s) => s.customIngredients);
  const showCalories = useSettingsStore((s) => s.showCalories);
  const useGrams = useSettingsStore((s) => s.useGrams);

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const p = useProfileStore.getState().profile;
    if (!p) {
      return [
        {
          id: makeId(),
          type: 'assistant-text',
          text: '¡Bienvenido a NutriKal! Creá tu perfil para empezar.',
          timestamp: new Date().toISOString(),
        },
        {
          id: makeId(),
          type: 'assistant-options',
          options: [
            { id: 'create_profile', label: 'Crear perfil', action: 'create_profile', icon: 'UserCircle' },
          ],
          timestamp: new Date().toISOString(),
        },
      ];
    }
    return buildWelcomeMessagesForProfile(p, useProfileStore.getState().justOnboarded);
  });
  const [isLoading, setIsLoading] = useState(false);
  const [remainingMessages, setRemainingMessages] = useState<number | null>(null);

  const conversationRef = useRef<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const lastUserPromptRef = useRef<string | null>(null);
  const lastMealTypeRef = useRef<MealType | null>(null);
  const lastWeekPlanRef = useRef<WeekPlan | null>(null);
  const swapTargetRef = useRef<{ date: string; mealType: MealType } | null>(null);
  const regenerateDishMessageIdRef = useRef<string | null>(null);
  const dishPersonalizationRef = useRef<{
    mode: 'dish' | 'regenerate' | 'swap';
    previousDishName?: string;
  } | null>(null);
  const prevProfileRef = useRef(profile);
  const sendingLockRef = useRef(false);

  function buildWelcomeMessages(): ChatMessage[] {
    if (!profile) {
      return [
        {
          id: makeId(),
          type: 'assistant-text',
          text: '¡Bienvenido a NutriKal! Creá tu perfil para empezar.',
          timestamp: new Date().toISOString(),
        },
        {
          id: makeId(),
          type: 'assistant-options',
          options: [
            { id: 'create_profile', label: 'Crear perfil', action: 'create_profile', icon: 'UserCircle' },
          ],
          timestamp: new Date().toISOString(),
        },
      ];
    }

    return buildWelcomeMessagesForProfile(profile, justOnboarded);
  }

  useEffect(() => {
    if (!prevProfileRef.current && profile) {
      setMessages(buildWelcomeMessages());
      conversationRef.current = [];
      if (justOnboarded) {
        clearJustOnboarded();
      }
    } else if (profile && justOnboarded) {
      setMessages(buildWelcomeMessagesForProfile(profile, true));
      clearJustOnboarded();
    }
    prevProfileRef.current = profile;
  }, [profile, justOnboarded, clearJustOnboarded]);

  function addMessages(...msgs: ChatMessage[]) {
    setMessages((prev) => [...prev, ...msgs]);
  }

  function appendWelcomeOptions() {
    addMessages({
      id: makeId(),
      type: 'assistant-options',
      options: buildWelcomeOptions(),
      timestamp: new Date().toISOString(),
    });
  }

  async function runWeekPlanGeneration() {
    const activeProfile = useProfileStore.getState().profile;
    const activeWeekPlanning = useWeekPlanningStore.getState().weekPlanning;
    if (!activeProfile || !activeWeekPlanning?.completedAt) return;
    if (sendingLockRef.current) return;
    sendingLockRef.current = true;

    addMessages({
      id: makeId(),
      type: 'user-choice',
      text: 'Planificá mi semana',
      timestamp: new Date().toISOString(),
    });

    setIsLoading(true);
    const loadingId = makeId();
    addMessages({
      id: loadingId,
      type: 'assistant-loading',
      loadingStyle: 'cooking',
      timestamp: new Date().toISOString(),
    });

    try {
      const priorPlan = lastWeekPlanRef.current;
      if (priorPlan) {
        usePlanRotationStore.getState().rememberPlan(priorPlan);
      }

      const weekId = getIsoWeekId(todayKey());
      const poolGeneration = usePlanRotationStore.getState().bumpPoolGeneration(weekId);

      const rotation = usePlanRotationStore.getState();
      const memoryAvoid = rotation.getAvoidDishNames();
      const ctx = buildWeekPlanningContext(
        activeProfile,
        dayPlans,
        customIngredients,
        todayKey(),
        memoryAvoid,
        poolGeneration,
        {
          signals: useIngredientSignalStore.getState().entries,
          recentPoolHistory: rotation.getRecentPoolHistory(),
        },
      );
      const dislikedNames = resolveDislikedIngredientNames(activeProfile, customIngredients);
      const dislikeLine = dislikedNames.length
        ? `\nEVITÁ estos ingredientes (el usuario no los quiere): ${dislikedNames.slice(0, 8).join(', ')}.`
        : '';
      const apiResult = await generateWeekPlan({
        weekDates: ctx.weekDates,
        weekPlanning: weekPlanningForApi(activeWeekPlanning),
        weeklyPoolPrompt: `${ctx.weeklyPoolPrompt}${dislikeLine}`,
        forbiddenDishNames: ctx.forbiddenDishNames,
        variationSeed: `${ctx.weekId}-${Date.now()}`,
      });

      setRemainingMessages(apiResult.remaining);

      const plan = buildFullWeekPlanFromApiResponse({
        skeleton: apiResult.skeleton,
        rawDishes: apiResult.rawDishes,
        weekPlanning: activeWeekPlanning,
        profile: activeProfile,
        useGrams,
      });

      lastWeekPlanRef.current = plan;
      const rot = usePlanRotationStore.getState();
      rot.rememberPlan(plan);
      rot.rememberWeeklyPool(ctx.pool);

      const memoryNote = buildPersonalizationNote({
        mode: 'week_plan',
        avoidDishNames: ctx.forbiddenDishNames,
        dislikedNames,
        dislikedCategoryLabels: resolveDislikedCategoryLabels(activeProfile),
        poolGeneration,
        recentAcceptedIngredient: getRecentAcceptedIngredientHint(
          useIngredientSignalStore.getState().entries,
        ),
      });

      setMessages((prev) => prev.filter((m) => m.id !== loadingId));
      addMessages({
        id: makeId(),
        type: 'assistant-text',
        text: buildWeekPlanMemoryIntro(memoryNote),
        personalizationNote: memoryNote ?? undefined,
        timestamp: new Date().toISOString(),
      });
      addMessages({
        id: makeId(),
        type: 'assistant-plan',
        weekPlan: plan,
        personalizationNote: memoryNote ?? undefined,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== loadingId));
      const fallback =
        err instanceof Error && err.message.trim()
          ? err.message
          : 'No pude armar tu semana. Probá de nuevo.';
      addMessages({
        id: makeId(),
        type: 'assistant-text',
        text: fallback,
        timestamp: new Date().toISOString(),
      });
      appendWelcomeOptions();
    } finally {
      sendingLockRef.current = false;
      setIsLoading(false);
    }
  }

  async function sendToAi(
    text: string,
    options?: { variation?: boolean; mealType?: MealType; mealBudgetKcal?: number },
  ) {
    if (!profile) return;
    if (sendingLockRef.current) return;
    sendingLockRef.current = true;

    const dislikedNames = resolveDislikedIngredientNames(profile, customIngredients);
    const avoidNames = usePlanRotationStore.getState().getAvoidDishNames();
    const memoryPromptBits: string[] = [];
    if (dislikedNames.length > 0) {
      memoryPromptBits.push(
        `No uses estos ingredientes (no le gustan): ${dislikedNames.slice(0, 8).join(', ')}.`,
      );
    }
    if (options?.variation && avoidNames.length > 0) {
      memoryPromptBits.push(
        `No repitas estos platos recientes: ${avoidNames.slice(-12).join(' · ')}.`,
      );
    }
    const memorySuffix = memoryPromptBits.length
      ? `\n\n[${memoryPromptBits.join(' ')}]`
      : '';

    const promptForApi = options?.variation
      ? `${text.trim()}\n\n[Generá otro plato completamente distinto: distinto nombre, técnica y presentación. No repitas platos de esta conversación.]${memorySuffix}`
      : `${text.trim()}${memorySuffix}`;

    if (!options?.variation) {
      lastUserPromptRef.current = text.trim();
    }
    if (options?.mealType) {
      lastMealTypeRef.current = options.mealType;
    }
    if (!dishPersonalizationRef.current) {
      dishPersonalizationRef.current = { mode: options?.variation ? 'regenerate' : 'dish' };
    }

    const activeMealType = options?.mealType ?? lastMealTypeRef.current ?? undefined;
    const mealBudgetKcal = options?.mealBudgetKcal
      ?? (activeMealType && profile ? resolveMealBudget(profile, activeMealType) : undefined);

    setIsLoading(true);
    const loadingId = makeId();
    addMessages({
      id: loadingId,
      type: 'assistant-loading',
      loadingStyle: activeMealType ? 'cooking' : undefined,
      timestamp: new Date().toISOString(),
    });

    try {
      const result: SendMessageResult = await sendMessage(
        promptForApi,
        conversationRef.current,
        {
          mealType: activeMealType,
          mealBudgetKcal,
        },
      );

      setMessages((prev) => prev.filter((m) => m.id !== loadingId));
      setRemainingMessages(result.remaining);

      conversationRef.current.push(
        { role: 'user', content: promptForApi },
        { role: 'assistant', content: result.text },
      );
      if (conversationRef.current.length > AI_CONVERSATION_HISTORY_LIMIT * 2) {
        conversationRef.current = conversationRef.current.slice(-AI_CONVERSATION_HISTORY_LIMIT * 2);
      }

      const mealType = activeMealType;

      if (result.dish) {
        let hydrated = hydrateAiDish(result.dish, { useGrams });
        let portionScaled = false;
        if (mealType && mealBudgetKcal) {
          const norm = normalizeHydratedAiDishToBudgetDetailed(hydrated, mealBudgetKcal, { useGrams });
          hydrated = norm.dish;
          portionScaled = norm.scaled;
          if (norm.emptyOrZero) {
            addMessages({
              id: makeId(),
              type: 'assistant-text',
              text: 'No pude armar bien las porciones de ese plato. Regeneralo y lo intento de nuevo.',
              timestamp: new Date().toISOString(),
            });
            dishPersonalizationRef.current = null;
            return;
          }
        }

        const persCtx = dishPersonalizationRef.current;
        dishPersonalizationRef.current = null;
        const dishNote = buildPersonalizationNote({
          mode: persCtx?.mode ?? (options?.variation ? 'regenerate' : 'dish'),
          previousDishName: persCtx?.previousDishName,
          avoidDishNames: usePlanRotationStore.getState().getAvoidDishNames(),
          dislikedNames: resolveDislikedIngredientNames(profile, customIngredients),
          dislikedCategoryLabels: resolveDislikedCategoryLabels(profile),
          dishIngredientNames: hydrated.humanIngredients.map((h) => h.name),
          recentAcceptedIngredient: getRecentAcceptedIngredientHint(
            useIngredientSignalStore.getState().entries,
          ),
        });
        const combinedNote = [portionScaled ? PORTION_ADJUST_COPY : null, dishNote]
          .filter(Boolean)
          .join(' ') || null;

        const swapTarget = swapTargetRef.current;
        if (swapTarget && mealType) {
          swapTargetRef.current = null;
          const swapNorm = normalizeHydratedAiDishToBudgetDetailed(
            hydrated,
            mealBudgetKcal ?? hydrated.macros.calories,
            { useGrams },
          );
          const newMeal = hydratedDishToAiMeal(swapNorm.dish);
          const swapNote = [
            swapNorm.scaled ? PORTION_ADJUST_COPY : null,
            dishNote,
          ].filter(Boolean).join(' ') || null;
          setMessages((prev) =>
            prev.map((m) => {
              if (m.type !== 'assistant-plan' || !m.weekPlan) return m;
              const days = m.weekPlan.days.map((d) => {
                if (d.date !== swapTarget.date) return d;
                return {
                  ...d,
                  meals: { ...d.meals, [swapTarget.mealType]: newMeal },
                };
              });
              const updated = { ...m.weekPlan, days };
              lastWeekPlanRef.current = updated;
              usePlanRotationStore.getState().rememberPlan(updated);
              return { ...m, weekPlan: updated };
            }),
          );
          addMessages({
            id: makeId(),
            type: 'assistant-text',
            text: swapNote
              ? `Actualicé ${newMeal.name} en tu plan. ${swapNote}`
              : `Actualicé ${newMeal.name} en tu plan.`,
            personalizationNote: swapNote ?? undefined,
            timestamp: new Date().toISOString(),
          });
        } else if (regenerateDishMessageIdRef.current) {
          const targetId = regenerateDishMessageIdRef.current;
          regenerateDishMessageIdRef.current = null;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === targetId && m.type === 'assistant-dish'
                ? {
                    ...m,
                    text: hydrated.name,
                    dishSuggestion: hydrated,
                    mealType: mealType ?? m.mealType,
                    personalizationNote: combinedNote ?? undefined,
                  }
                : m,
            ),
          );
        } else {
          addMessages({
            id: makeId(),
            type: 'assistant-dish',
            text: hydrated.name,
            dishSuggestion: hydrated,
            mealType: mealType ?? undefined,
            personalizationNote: combinedNote ?? undefined,
            timestamp: new Date().toISOString(),
          });
        }
      } else {
        const displayText = result.text.trim()
          || 'No recibí una respuesta del asistente. ¿Podés intentar de nuevo?';

        addMessages({
          id: makeId(),
          type: 'assistant-text',
          text: displayText,
          timestamp: new Date().toISOString(),
        });
        if (mealType) {
          appendWelcomeOptions();
        }
      }
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== loadingId));

      const fallback =
        err instanceof Error && err.message === 'Not authenticated'
          ? 'Necesitás estar conectado para usar el asistente.'
          : err instanceof Error && err.message.trim()
            ? err.message
            : 'Algo salió mal. ¿Podés intentar de nuevo?';

      addMessages({
        id: makeId(),
        type: 'assistant-text',
        text: fallback,
        timestamp: new Date().toISOString(),
      });
      dishPersonalizationRef.current = null;
      if (activeMealType) {
        appendWelcomeOptions();
      }
    } finally {
      sendingLockRef.current = false;
      setIsLoading(false);
    }
  }

  const handleSendMessage = useCallback(
    (text: string) => {
      if (!text.trim() || isLoading) return;
      addMessages({
        id: makeId(),
        type: 'user-text',
        text: text.trim(),
        timestamp: new Date().toISOString(),
      });
      sendToAi(text.trim());
    },
    [isLoading, profile],
  );

  const handleOption = useCallback(
    (option: ChatOption) => {
      if (isLoading) return;

      if (option.action === 'start_cook_now') {
        addMessages({
          id: makeId(),
          type: 'user-choice',
          text: option.label,
          timestamp: new Date().toISOString(),
        });

        const inferred = getCurrentMealType();
        if (inferred && profile) {
          lastMealTypeRef.current = inferred;
          addMessages({
            id: makeId(),
            type: 'assistant-text',
            text: buildCookNowInferPrompt(inferred),
            timestamp: new Date().toISOString(),
          });
          const prompt = buildCookNowPrompt(inferred, computeMetabolism(profile).budget);
          void sendToAi(prompt, { mealType: inferred });
          return;
        }

        addMessages(
          {
            id: makeId(),
            type: 'assistant-text',
            text: buildMealPickPrompt(),
            timestamp: new Date().toISOString(),
          },
          {
            id: makeId(),
            type: 'assistant-options',
            options: buildMealTypeOptions(),
            timestamp: new Date().toISOString(),
          },
        );
        return;
      }

      if (option.action === 'week_plan') {
        const wp = useWeekPlanningStore.getState().weekPlanning;
        if (!wp?.completedAt) {
          return;
        }
        if (!useProfileStore.getState().profile) {
          addMessages({
            id: makeId(),
            type: 'assistant-text',
            text: 'Primero completá tu perfil para poder planificar la semana.',
            timestamp: new Date().toISOString(),
          });
          return;
        }
        void runWeekPlanGeneration();
        return;
      }

      if (option.action === 'rescue') {
        addMessages(
          {
            id: makeId(),
            type: 'user-choice',
            text: option.label,
            timestamp: new Date().toISOString(),
          },
          {
            id: makeId(),
            type: 'assistant-text',
            text: 'Tranqui, pasa. El plan está para acompañarte, no para juzgarte. ¿Cómo seguimos hoy?',
            timestamp: new Date().toISOString(),
          },
          {
            id: makeId(),
            type: 'assistant-options',
            options: buildRescueOptions(),
            timestamp: new Date().toISOString(),
          },
        );
        return;
      }

      if (option.action === 'rescue_continue') {
        addMessages({
          id: makeId(),
          type: 'user-choice',
          text: option.label,
          timestamp: new Date().toISOString(),
        });
        recordRescueChoice(todayKey(), 'continue', getCurrentMealType() ?? 'almuerzo');
        addMessages({
          id: makeId(),
          type: 'assistant-text',
          text: 'Perfecto. Seguimos como veníamos — cuando quieras, seguimos con el plan.',
          timestamp: new Date().toISOString(),
        });
        appendWelcomeOptions();
        return;
      }

      if (option.action === 'rescue_mark_flex') {
        addMessages({
          id: makeId(),
          type: 'user-choice',
          text: option.label,
          timestamp: new Date().toISOString(),
        });
        const date = todayKey();
        const remaining = getRemainingMealTypes();
        useCalendarStore.getState().setDayFlex(date, 'full_free', 'Hoy flexible');
        if (remaining.length > 0) {
          useCalendarStore.getState().clearRemainingMeals(date, remaining);
        }
        recordRescueChoice(date, 'mark_flex', getCurrentMealType() ?? 'almuerzo');
        addMessages(
          {
            id: makeId(),
            type: 'assistant-text',
            text: 'Listo: marcamos hoy como flexible. Sin menú estricto por el resto del día; mañana retomamos el ritmo.',
            timestamp: new Date().toISOString(),
          },
          {
            id: makeId(),
            type: 'assistant-options',
            options: [
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
            ],
            timestamp: new Date().toISOString(),
          },
        );
        return;
      }

      if (option.action === 'rescue_rebalance') {
        addMessages({
          id: makeId(),
          type: 'user-choice',
          text: option.label,
          timestamp: new Date().toISOString(),
        });
        const date = todayKey();
        const remaining = getRemainingMealTypes();
        const dayPlan = useCalendarStore.getState().dayPlans[date];
        recordRescueChoice(date, 'rebalance', getCurrentMealType() ?? 'almuerzo');

        if (remaining.length === 0) {
          addMessages({
            id: makeId(),
            type: 'assistant-text',
            text: 'Ya casi terminó el día, no hay comidas por ajustar. Mañana arrancamos de nuevo sin drama.',
            timestamp: new Date().toISOString(),
          });
          appendWelcomeOptions();
          return;
        }

        if (!dayPlan) {
          addMessages({
            id: makeId(),
            type: 'assistant-text',
            text: 'Todavía no hay comidas planificadas para más tarde. Cuando armes el resto, pedime opciones más livianas y listo.',
            timestamp: new Date().toISOString(),
          });
          appendWelcomeOptions();
          return;
        }

        const { nextMeals, result } = rebalanceRemainingMeals(dayPlan.meals, remaining);
        for (const [mt, meals] of Object.entries(nextMeals) as Array<[MealType, typeof dayPlan.meals[MealType]]>) {
          if (meals) {
            useCalendarStore.getState().replaceSlotMeals(date, mt, meals);
          }
        }

        if (result.adjusted.length === 0) {
          const labels = remaining.map(mealTypeChipLabel).join(', ');
          addMessages({
            id: makeId(),
            type: 'assistant-text',
            text: `Las próximas comidas (${labels}) todavía están vacías. Cuando las armes, pedime algo más liviano y absorbemos el día.`,
            timestamp: new Date().toISOString(),
          });
          appendWelcomeOptions();
          return;
        }

        const adjustedList = result.adjusted
          .map((a) => `${mealTypeChipLabel(a.mealType)}: ${a.name}`)
          .join(' · ');
        addMessages(
          {
            id: makeId(),
            type: 'assistant-text',
            text: `Ajusté el resto del día con porciones más livianas: ${adjustedList}. Así el día queda cómodo sin tirar el plan.`,
            timestamp: new Date().toISOString(),
          },
          {
            id: makeId(),
            type: 'assistant-options',
            options: [
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
            ],
            timestamp: new Date().toISOString(),
          },
        );
        return;
      }

      if (option.action === 'pick_meal_type' && option.payload && isMealType(option.payload)) {
        const mealType = option.payload;
        lastMealTypeRef.current = mealType;
        const label = mealTypeChipLabel(mealType);
        const prompt = profile
          ? buildCookNowPrompt(mealType, computeMetabolism(profile).budget)
          : buildCookNowPrompt(mealType, 2000);

        addMessages({
          id: makeId(),
          type: 'user-choice',
          text: label,
          timestamp: new Date().toISOString(),
        });
        sendToAi(prompt, { mealType });
        return;
      }

      if (option.action === 'quick_reply' && option.payload) {
        addMessages({
          id: makeId(),
          type: 'user-choice',
          text: option.payload,
          timestamp: new Date().toISOString(),
        });
        sendToAi(option.payload);
      }
    },
    [isLoading],
  );

  const handleApplyDish = useCallback(
    (dish: HydratedAiDish, date: string, mealType: MealType) => {
      const meal = hydratedDishToMeal(dish);
      upsertMeal(date, mealType, meal);

      const when =
        date === todayKey()
          ? 'hoy'
          : formatDayFull(parseDate(date));

      addMessages(
        {
          id: makeId(),
          type: 'assistant-text',
          text: `Listo, agregué ${dish.name} a tu ${mealTypeToPromptLabel(mealType)} de ${when}.`,
          timestamp: new Date().toISOString(),
        },
        {
          id: makeId(),
          type: 'assistant-options',
          options: buildPostApplyOptions(),
          timestamp: new Date().toISOString(),
        },
      );
    },
    [upsertMeal],
  );

  const handleApplyPlan = useCallback(
    (plan: WeekPlan) => {
      const rows: Array<{ date: string; mealType: MealType; meal: ReturnType<typeof plannedMealToMeal> }> = [];
      const aiMeals: AiMeal[] = [];
      for (const day of plan.days) {
        for (const mt of MEAL_TYPE_ORDER) {
          const planned = day.meals[mt];
          if (!planned) continue;
          rows.push({ date: day.date, mealType: mt, meal: plannedMealToMeal(planned) });
          aiMeals.push(planned);
        }
      }
      if (rows.length > 0) {
        bulkUpsertMeals(rows);
      }

      if (aiMeals.length > 0) {
        const allIngredients = [...INGREDIENTS_DB, ...customIngredients];
        const shoppingItems = createShoppingItemsFromAiMeals(aiMeals, allIngredients);
        if (shoppingItems.length > 0) {
          useShoppingStore.getState().addItemsToActiveList(shoppingItems);
        }
      }

      recordWeekPlanApplied(plan);
      const applied: WeekPlan = { ...plan, applied: true };
      lastWeekPlanRef.current = applied;

      setMessages((prev) =>
        prev.map((m) =>
          m.type === 'assistant-plan' && m.weekPlan && !m.weekPlan.applied
            ? { ...m, weekPlan: applied }
            : m,
        ),
      );

      addMessages(
        {
          id: makeId(),
          type: 'assistant-text',
          text: 'Tu semana está lista. Ya quedó en tu calendario y actualicé tu lista de compras.',
          timestamp: new Date().toISOString(),
        },
        {
          id: makeId(),
          type: 'assistant-applied',
          timestamp: new Date().toISOString(),
        },
        {
          id: makeId(),
          type: 'assistant-options',
          options: buildPostApplyPlanOptions(),
          timestamp: new Date().toISOString(),
        },
      );
    },
    [bulkUpsertMeals, customIngredients],
  );

  const handleRegeneratePlan = useCallback(() => {
    if (isLoading) return;
    void runWeekPlanGeneration();
  }, [isLoading]);

  const handleRegenerateDish = useCallback(
    (messageId: string, dish: HydratedAiDish, mealType?: MealType) => {
      if (isLoading || !profile) return;
      const mt = mealType ?? lastMealTypeRef.current ?? 'almuerzo';
      usePlanRotationStore.getState().rememberRejected(dish.name);
      recordMealRejected(todayKey(), mt, hydratedDishToAiMeal(dish));
      regenerateDishMessageIdRef.current = messageId;
      lastMealTypeRef.current = mt;
      dishPersonalizationRef.current = { mode: 'regenerate', previousDishName: dish.name };
      const preview = buildPersonalizationNote({
        mode: 'regenerate',
        previousDishName: dish.name,
        avoidDishNames: usePlanRotationStore.getState().getAvoidDishNames(),
        dislikedNames: resolveDislikedIngredientNames(profile, customIngredients),
      });
      addMessages({
        id: makeId(),
        type: 'assistant-text',
        text: preview
          ? `${preview} Busquemos otra opción para tu ${mealTypeChipLabel(mt)}.`
          : `Busquemos otra opción para tu ${mealTypeChipLabel(mt)} — distinta a «${dish.name}».`,
        timestamp: new Date().toISOString(),
      });
      void sendToAi(
        `Generá otro plato para mi ${mealTypeToPromptLabel(mt)}. Distinto a "${dish.name}".`,
        { variation: true, mealType: mt },
      );
    },
    [isLoading, profile, customIngredients],
  );

  const handleSwapMeal = useCallback(
    (date: string, mealType: MealType) => {
      if (isLoading || !profile) return;
      const plan = lastWeekPlanRef.current;
      const oldMeal = plan?.days.find((d) => d.date === date)?.meals[mealType];
      if (oldMeal?.name) {
        usePlanRotationStore.getState().rememberRejected(oldMeal.name);
        recordMealRejected(date, mealType, oldMeal);
      }

      swapTargetRef.current = { date, mealType };
      dishPersonalizationRef.current = {
        mode: 'swap',
        previousDishName: oldMeal?.name,
      };
      const label = mealTypeChipLabel(mealType);
      const weekNames = collectDishNamesFromWeekPlan(plan);
      const avoid = usePlanRotationStore.getState().getAvoidDishNames();
      const distinct = [...new Set([...weekNames, ...avoid])].filter(
        (n) => n !== oldMeal?.name?.trim(),
      );
      const avoidLine =
        distinct.length > 0
          ? ` No repitas estos platos: ${distinct.slice(0, 24).join(' · ')}.`
          : '';
      const prompt = `Generá otro plato para mi ${mealTypeToPromptLabel(mealType)} del ${date}.${avoidLine}`;
      lastMealTypeRef.current = mealType;
      const weekPlanning = useWeekPlanningStore.getState().weekPlanning;
      const slotBudget = weekPlanning
        ? getMealBudgetForPlanDay(date, mealType, profile, weekPlanning)
        : resolveMealBudget(profile, mealType);
      const swapPreview = buildPersonalizationNote({
        mode: 'swap',
        previousDishName: oldMeal?.name,
        avoidDishNames: avoid,
        dislikedNames: resolveDislikedIngredientNames(profile, customIngredients),
      });
      addMessages({
        id: makeId(),
        type: 'assistant-text',
        text: swapPreview
          ? `Cambiemos tu ${label} del ${formatDayFull(parseDate(date))}. ${swapPreview}`
          : `Cambiemos tu ${label} del ${formatDayFull(parseDate(date))}.`,
        timestamp: new Date().toISOString(),
      });
      void sendToAi(prompt, { variation: true, mealType, mealBudgetKcal: slotBudget });
    },
    [isLoading, profile, customIngredients],
  );

  return {
    messages,
    hasProfile: !!profile,
    hasWeekPlanningProfile,
    handleOption,
    handleSendMessage,
    handleApplyDish,
    handleApplyPlan,
    handleRegeneratePlan,
    handleRegenerateDish,
    handleSwapMeal,
    runWeekPlanGeneration,
    energyLevel: 'green',
    energyRatio: 0.5,
    showCalories,
    isLoading,
    remainingMessages,
  };
}
