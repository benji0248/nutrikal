import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  ChatMessage,
  ChatOption,
  EnergyLevel,
  HydratedAiDish,
  MealType,
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
  weekPlanningForApi,
} from '../../services/weekPlanService';
import {
  hydrateAiDish,
  hydratedDishToMeal,
  hydratedDishToAiMeal,
  plannedMealToMeal,
  normalizeHydratedAiDishToBudget,
} from '../../services/dishMatchService';
import { collectDishNamesFromWeekPlan } from '../../services/planRotationMemory';
import { recordMealRejected, recordWeekPlanApplied } from '../../services/signalLogService';
import { usePlanRotationStore } from '../../store/usePlanRotationStore';
import { useIngredientSignalStore } from '../../store/useIngredientSignalStore';
import { computeMetabolism } from '../../services/metabolicService';
import { getMealSlotBudget } from '../../services/portionEngine';
import { useCalendarStore } from '../../store/useCalendarStore';
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
      label: 'Quiero planificar mi semana',
      action: 'week_plan',
      icon: 'CalendarDays',
    },
    {
      id: 'rescue',
      label: 'Comí algo que no debía',
      action: 'rescue_stub',
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
        label: 'Quiero planificar mi semana',
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
      text: 'Quiero planificar mi semana',
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
      const apiResult = await generateWeekPlan({
        weekDates: ctx.weekDates,
        weekPlanning: weekPlanningForApi(activeWeekPlanning),
        weeklyPoolPrompt: ctx.weeklyPoolPrompt,
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

      setMessages((prev) => prev.filter((m) => m.id !== loadingId));
      addMessages({
        id: makeId(),
        type: 'assistant-text',
        text:
          apiResult.text?.trim()
          || 'Armé tu semana según tu rutina. Revisala y aplicá al calendario cuando quieras.',
        timestamp: new Date().toISOString(),
      });
      addMessages({
        id: makeId(),
        type: 'assistant-plan',
        weekPlan: plan,
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

  function showComingSoonStub() {
    addMessages(
      {
        id: makeId(),
        type: 'assistant-text',
        text: 'Eso todavía no está disponible, pero viene pronto. Por ahora probá armar una comida.',
        timestamp: new Date().toISOString(),
      },
      {
        id: makeId(),
        type: 'assistant-options',
        options: buildWelcomeOptions(),
        timestamp: new Date().toISOString(),
      },
    );
  }

  async function sendToAi(
    text: string,
    options?: { variation?: boolean; mealType?: MealType },
  ) {
    if (!profile) return;
    if (sendingLockRef.current) return;
    sendingLockRef.current = true;

    const promptForApi = options?.variation
      ? `${text.trim()}\n\n[Generá otro plato completamente distinto: distinto nombre, técnica y presentación. No repitas platos de esta conversación.]`
      : text.trim();

    if (!options?.variation) {
      lastUserPromptRef.current = text.trim();
    }
    if (options?.mealType) {
      lastMealTypeRef.current = options.mealType;
    }

    const activeMealType = options?.mealType ?? lastMealTypeRef.current ?? undefined;
    const mealBudgetKcal = activeMealType && profile
      ? resolveMealBudget(profile, activeMealType)
      : undefined;

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
        if (mealType && mealBudgetKcal) {
          hydrated = normalizeHydratedAiDishToBudget(hydrated, mealBudgetKcal, { useGrams });
        }

        const swapTarget = swapTargetRef.current;
        if (swapTarget && mealType) {
          swapTargetRef.current = null;
          const newMeal = hydratedDishToAiMeal(
            normalizeHydratedAiDishToBudget(hydrated, mealBudgetKcal ?? hydrated.macros.calories, { useGrams }),
          );
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
            text: `Actualicé ${newMeal.name} en tu plan.`,
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

      if (option.action === 'rescue_stub') {
        addMessages({
          id: makeId(),
          type: 'user-choice',
          text: option.label,
          timestamp: new Date().toISOString(),
        });
        showComingSoonStub();
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
      for (const day of plan.days) {
        for (const mt of MEAL_TYPE_ORDER) {
          const planned = day.meals[mt];
          if (!planned) continue;
          rows.push({ date: day.date, mealType: mt, meal: plannedMealToMeal(planned) });
        }
      }
      if (rows.length > 0) {
        bulkUpsertMeals(rows);
      }
      recordWeekPlanApplied(plan);
      const applied: WeekPlan = { ...plan, applied: true };
      lastWeekPlanRef.current = applied;
      addMessages({
        id: makeId(),
        type: 'assistant-text',
        text: 'Listo, tu semana quedó en el calendario. Podés ver cada comida ahí con su receta.',
        timestamp: new Date().toISOString(),
      });
      appendWelcomeOptions();
    },
    [bulkUpsertMeals],
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
      addMessages({
        id: makeId(),
        type: 'assistant-text',
        text: `Busquemos otra opción para tu ${mealTypeChipLabel(mt)}.`,
        timestamp: new Date().toISOString(),
      });
      void sendToAi(
        `Generá otro plato para mi ${mealTypeToPromptLabel(mt)}. Distinto a "${dish.name}".`,
        { variation: true, mealType: mt },
      );
    },
    [isLoading, profile],
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
      addMessages({
        id: makeId(),
        type: 'assistant-text',
        text: `Cambiemos tu ${label} del ${formatDayFull(parseDate(date))}.`,
        timestamp: new Date().toISOString(),
      });
      void sendToAi(prompt, { variation: true, mealType });
    },
    [isLoading, profile],
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
