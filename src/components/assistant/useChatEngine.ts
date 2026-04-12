import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type {
  ChatMessage,
  ChatOption,
  MealType,
  Ingredient,
  EnergyLevel,
  AiAction,
  AiMeal,
  WeekPlan,
  PlanPreferences,
  PlannedDay,
  PlannedMeal,
} from '../../types';
import { MEAL_TYPE_LABELS, MEAL_TYPE_ORDER } from '../../types';
import { useProfileStore } from '../../store/useProfileStore';
import { useCalendarStore } from '../../store/useCalendarStore';
import { useIngredientsStore } from '../../store/useIngredientsStore';
import { useShoppingStore } from '../../store/useShoppingStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { INGREDIENTS_DB } from '../../data/ingredients';
import {
  computeDayConsumed,
} from '../../services/dishMatchService';
import { getEnergyLevel, getEnergyRatio } from '../../services/metabolicService';
import { createShoppingItemsFromAiMeals } from '../../services/shoppingService';
import { todayKey, generateId } from '../../utils/dateHelpers';
import { format, parseISO, getISOWeek, getISOWeekYear } from 'date-fns';
import {
  sendMessage,
  buildContext,
  getNextWeekDates,
  AI_CONVERSATION_HISTORY_LIMIT,
} from '../../services/aiService';
import { submitDishesForEmbedding, aiMealToDishToEmbed } from '../../services/embeddingService';
import { chatClientLog, chatClientLogError } from '../../utils/chatFlowLog';
import {
  buildPreferencesForChatRequest,
  inferPlanPreferencesFromUserText,
  isWeekPlanHelpChipMessage,
} from '../../services/weekPlanPreferenceMap';

/** Inyecta weekDates en contexto cuando el usuario pide plan semanal (variantes de redacción). */
const WEEK_PLAN_USER_INTENT_REGEX =
  /arm(a|á|e)me\s+(la\s+)?semana|plan(ific|ea|[áa])\s+(la\s+)?semana|plan\s+semanal|semana\s+completa|7\s+d[ií]as|(?:la\s+)?pr[oó]xima\s+semana|organiz(a|á)me\s+la\s+semana|men[uú]\s+semanal|planific[aá]\s+mi\s+semana|quiero\s+(el\s+)?plan\s+(de\s+)?la\s+semana|arm[aá]me\s+la\s+comida\s+de\s+la\s+semana/i;

/** Sale del flujo "plan semanal" si el usuario pide otra cosa (ej. qué comer hoy). */
const PIVOT_FROM_WEEK_PLAN_REGEX =
  /\b(qué|cómo)\s+como\b|\bc[oó]mo\s+vengo\b|qué\s+como\s+hoy/i;

import { useGistSyncStore } from '../../store/useGistSyncStore';
import { useHistorialStore } from '../../store/useHistorialStore';
import {
  hydrateMeal,
  hydratedToAiMeal,
  getMealSlotBudget,
} from '../../services/portionEngine';
import {
  resolveDishContract,
  pickDishContractFromMeal,
} from '../../services/dishResolverService';
import { recordWeekPlanApplied } from '../../services/signalLogService';
import type { AiMealLite, DishContract } from '../../types';
import {
  filterIngredientsForUser,
  buildCatalogForPrompt,
  catalogToPromptString,
} from '../../services/ingredientFilter';
import {
  buildWeeklyIngredientPool,
  formatWeeklyPoolForPrompt,
} from '../../services/ingredientSelectionService';

type WeekPlanPrefsState = 'idle' | 'week_collecting_prefs';

function isoWeekIdFromYmd(ymd: string): string {
  const d = parseISO(`${ymd}T12:00:00`);
  return `${getISOWeekYear(d)}-W${String(getISOWeek(d)).padStart(2, '0')}`;
}

function makeId(): string {
  return generateId();
}

interface ChatEngineResult {
  messages: ChatMessage[];
  hasProfile: boolean;
  handleOption: (option: ChatOption) => void;
  handleSendMessage: (text: string) => void;
  handleApplyPlan: (plan: WeekPlan) => void;
  handleRegeneratePlan: () => void;
  handleSwapMeal: (date: string, mealType: MealType) => void;
  energyLevel: EnergyLevel;
  energyRatio: number;
  showCalories: boolean;
  isLoading: boolean;
  /** Remaining AI messages for today (null until first response). */
  remainingMessages: number | null;
}

export function useChatEngine(): ChatEngineResult {
  const profile = useProfileStore((s) => s.profile);
  const getMetabolicResult = useProfileStore((s) => s.getMetabolicResult);
  const customIngredients = useIngredientsStore((s) => s.customIngredients);
  const dayPlans = useCalendarStore((s) => s.dayPlans);
  const upsertMeal = useCalendarStore((s) => s.upsertMeal);
  const addItemsToActiveList = useShoppingStore((s) => s.addItemsToActiveList);
  const showCalories = useSettingsStore((s) => s.showCalories);

  const allIngredients: Ingredient[] = useMemo(
    () => [...INGREDIENTS_DB, ...customIngredients],
    [customIngredients],
  );

  const today = todayKey();
  const todayPlan = dayPlans[today];
  const metabolic = getMetabolicResult();
  const budget = metabolic?.budget ?? 2000;
  const consumed = computeDayConsumed(todayPlan, allIngredients);
  const energyLevel = getEnergyLevel(consumed, budget);
  const energyRatio = getEnergyRatio(consumed, budget);

  const [messages, setMessages] = useState<ChatMessage[]>(() => buildWelcomeMessages());
  const [isLoading, setIsLoading] = useState(false);
  const [planPreferences, setPlanPreferences] = useState<PlanPreferences | null>(null);
  const [remainingMessages, setRemainingMessages] = useState<number | null>(null);
  const conversationRef = useRef<Array<{ role: 'user' | 'assistant'; text: string }>>([]);
  const prevProfileRef = useRef(profile);
  const lastPlanRequestRef = useRef<string>('');
  /** Synchronous lock to prevent double-sends (useState is async, ref is immediate). */
  const sendingLockRef = useRef(false);
  /** Tras "armame la semana": una elección de plan (o chip de ayuda) antes de inyectar fechas y permitir week_plan. */
  const weekPlanPrefsRef = useRef<WeekPlanPrefsState>('idle');

  // Reset chat when profile is created
  useEffect(() => {
    if (!prevProfileRef.current && profile) {
      setMessages(buildWelcomeMessages());
      conversationRef.current = [];
      weekPlanPrefsRef.current = 'idle';
      setPlanPreferences(null);
    }
    prevProfileRef.current = profile;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

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

    return [
      {
        id: makeId(),
        type: 'assistant-text',
        text: `¡Hola${profile.name ? `, ${profile.name}` : ''}! Soy tu nutricionista. ¿En qué te ayudo?`,
        timestamp: new Date().toISOString(),
      },
      {
        id: makeId(),
        type: 'assistant-options',
        options: [
          { id: 'qr_0', label: 'Armame la semana', action: 'quick_reply', payload: 'Armame la semana' },
          { id: 'qr_1', label: '¿Qué como hoy?', action: 'quick_reply', payload: '¿Qué como hoy?' },
          { id: 'qr_2', label: '¿Cómo vengo hoy?', action: 'quick_reply', payload: '¿Cómo vengo hoy?' },
        ],
        timestamp: new Date().toISOString(),
      },
    ];
  }

  function addMessages(...msgs: ChatMessage[]) {
    setMessages((prev) => [...prev, ...msgs]);
  }

  /**
   * Formato lite con IDs (motor de porciones por rol nutricional).
   */
  function isLiteFormat(meal: unknown): meal is AiMealLite {
    return (
      typeof meal === 'object' &&
      meal !== null &&
      Array.isArray((meal as AiMealLite).ingredientIds) &&
      (meal as AiMealLite).ingredientIds!.length > 0
    );
  }

  /**
   * Rehydrate a raw meal from Gemini into the legacy AiMeal format.
   * If already in legacy format, pass through unchanged.
   * If in lite format, use portionEngine to compute exact portions.
   */
  function rehydrateRawMeal(
    raw: unknown,
    mealType: MealType,
    dailyBudgetOverride?: number,
  ): AiMeal | null {
    if (!raw || typeof raw !== 'object') return null;

    const effectiveBudget = dailyBudgetOverride ?? budget;
    const slotBudget = getMealSlotBudget(effectiveBudget, mealType);
    const allowedIds = new Set(allIngredients.map((i) => i.id));

    const dc = pickDishContractFromMeal(raw);
    if (dc) {
      const nameTop =
        typeof (raw as { name?: string }).name === 'string'
          ? (raw as { name: string }).name.trim()
          : '';
      const mergedContract: DishContract = {
        ...dc,
        nombre: dc.nombre.trim() || nameTop || 'Comida',
      };
      const resolved = resolveDishContract(
        mergedContract,
        slotBudget,
        allIngredients,
        allowedIds,
      );
      if (resolved.ok) {
        const prep = (raw as { prepMinutes?: number }).prepMinutes;
        const portion = (raw as { humanPortion?: string }).humanPortion;
        return hydratedToAiMeal({
          ...resolved.hydrated,
          prepMinutes: prep,
          humanPortion: portion,
        });
      }
    }

    if (isLiteFormat(raw)) {
      const hydrated = hydrateMeal(raw, slotBudget, allIngredients);
      return hydratedToAiMeal(hydrated);
    }

    // Legacy format — validate required fields before casting
    const legacy = raw as Record<string, unknown>;
    if (
      typeof legacy.name === 'string' &&
      Array.isArray(legacy.ingredients) &&
      typeof legacy.totalKcal === 'number'
    ) {
      return raw as AiMeal;
    }

    chatClientLog('rehydrate_unknown_format', {
      keys: Object.keys(legacy).join(','),
    });
    return null;
  }

  function aiMealToCalendarMeal(aiMeal: AiMeal) {
    return {
      id: generateId(),
      name: aiMeal.name,
      calories: aiMeal.totalKcal,
      aiIngredients: aiMeal.ingredients,
    };
  }

  function executeActions(actions: AiAction[]) {
    if (!Array.isArray(actions)) {
      chatClientLog('executeActions_skip', { reason: 'not_array' });
      return;
    }

    chatClientLog('executeActions_start', { count: actions.length });

    try {
    for (const action of actions) {
      chatClientLog('executeAction', { type: action.type });
      switch (action.type) {
        case 'add_meal':
        case 'swap_meal': {
          const rawMeal = action.meal;
          if (!rawMeal) break;

          // Rehydrate: lite format → full AiMeal with exact portions
          const aiMeal = rehydrateRawMeal(rawMeal, action.mealType);
          if (!aiMeal) break;

          if (action.type === 'swap_meal') {
            const currentPlan = useCalendarStore.getState().dayPlans[action.date];
            if (currentPlan) {
              const slotMeals = currentPlan.meals[action.mealType];
              for (const m of slotMeals) {
                useCalendarStore.getState().deleteMeal(action.date, action.mealType, m.id);
              }
            }
          }

          upsertMeal(action.date, action.mealType, aiMealToCalendarMeal(aiMeal));

          submitDishesForEmbedding([
            aiMealToDishToEmbed(aiMeal, action.mealType, action.date),
          ]);

          const shoppingItems = createShoppingItemsFromAiMeals([aiMeal], allIngredients);
          addItemsToActiveList(shoppingItems);
          break;
        }

        case 'week_plan': {
          const rawDays = (action as { days?: unknown }).days;
          if (!Array.isArray(rawDays) || rawDays.length === 0) {
            chatClientLog('week_plan_skip', { reason: 'bad_days' });
            break;
          }

          const validDays = rawDays.filter(
            (d): d is { date: string; meals?: PlannedDay['meals'] } =>
              typeof d === 'object' &&
              d !== null &&
              typeof (d as { date?: unknown }).date === 'string',
          );
          if (validDays.length === 0) {
            chatClientLog('week_plan_skip', { reason: 'no_valid_days' });
            break;
          }

          chatClientLog('week_plan_build', { dayCount: validDays.length });

          // Rehydrate all meals in the week plan before displaying
          const rehydratedDays: PlannedDay[] = validDays.map((day) => {
            const rehydratedMeals: Partial<Record<MealType, PlannedMeal>> = {};
            // Determine if this is a cheat day (Sunday)
            const dayDate = new Date(day.date + 'T12:00:00');
            const isSunday = dayDate.getDay() === 0;
            const dayBudget = isSunday ? budget + 1000 : budget;

            const mealsBlock = day.meals ?? {};
            for (const mt of MEAL_TYPE_ORDER) {
              const rawMeal = mealsBlock[mt];
              if (!rawMeal) continue;
              const aiMeal = rehydrateRawMeal(rawMeal, mt, dayBudget);
              if (aiMeal) {
                rehydratedMeals[mt] = aiMeal;
              }
            }
            return { date: day.date, meals: rehydratedMeals };
          });

          const weekPlan: WeekPlan = { days: rehydratedDays, applied: false };

          if (import.meta.env.DEV) {
            console.log('DEBUG: Generated Week Plan JSON:\n', JSON.stringify(weekPlan, null, 2));
          }

          addMessages({
            id: makeId(),
            type: 'assistant-plan',
            weekPlan,
            timestamp: new Date().toISOString(),
          });
          break;
        }

        case 'suggest_meals': {
          if (action.meals && action.meals.length > 0) {
            // Rehydrate suggested meals (default to 'almuerzo' slot budget)
            const rehydratedSuggestions = action.meals.map((rawMeal) => {
              const aiMeal = rehydrateRawMeal(rawMeal, 'almuerzo');
              const reason = 'reason' in rawMeal ? (rawMeal as AiMeal & { reason: string }).reason : '';
              return aiMeal ? { ...aiMeal, reason } : { ...rawMeal as AiMeal, reason };
            });

            addMessages({
              id: makeId(),
              type: 'assistant-meals',
              mealSuggestions: rehydratedSuggestions,
              timestamp: new Date().toISOString(),
            });
          }
          break;
        }

        case 'show_summary': {
          const plan = useCalendarStore.getState().dayPlans[todayKey()];
          const meals: Array<{ mealType: MealType; name: string }> = [];

          if (plan) {
            for (const mt of MEAL_TYPE_ORDER) {
              for (const meal of plan.meals[mt]) {
                meals.push({ mealType: mt, name: meal.name });
              }
            }
          }

          const currentLevel = getEnergyLevel(
            computeDayConsumed(plan, allIngredients),
            budget,
          );

          addMessages({
            id: makeId(),
            type: 'assistant-summary',
            daySummary: {
              meals,
              energyLevel: currentLevel,
            },
            timestamp: new Date().toISOString(),
          });
          break;
        }
      }
    }
    } catch (e) {
      chatClientLogError('executeActions_catch', e, {});
      addMessages({
        id: makeId(),
        type: 'assistant-text',
        text: 'No pude mostrar bien esa sugerencia en la app. Si era un plan, pedímelo de nuevo.',
        timestamp: new Date().toISOString(),
      });
    }
  }

  async function sendToAi(
    text: string,
    extraWeekDates?: string[] | null,
    extraPreferences?: PlanPreferences | null,
  ) {
    if (!profile) return;
    if (sendingLockRef.current) return;
    sendingLockRef.current = true;

    const isWeekIntent = WEEK_PLAN_USER_INTENT_REGEX.test(text);

    if (PIVOT_FROM_WEEK_PLAN_REGEX.test(text)) {
      if (weekPlanPrefsRef.current !== 'idle') {
        chatClientLog('weekPlanFlow_reset', { reason: 'pivot_away' });
      }
      weekPlanPrefsRef.current = 'idle';
      setPlanPreferences(null);
    }

    let weekDates: string[] | null = null;
    if (extraWeekDates && extraWeekDates.length > 0) {
      weekDates = extraWeekDates;
    } else {
      const st = weekPlanPrefsRef.current;
      if (st === 'idle') {
        if (isWeekIntent) {
          weekDates = null;
          weekPlanPrefsRef.current = 'week_collecting_prefs';
        } else {
          weekDates = null;
        }
      } else if (st === 'week_collecting_prefs') {
        const mode = inferPlanPreferencesFromUserText(text)?.weekRepetitionMode;
        if (isWeekPlanHelpChipMessage(text)) {
          weekDates = null;
        } else if (mode) {
          weekDates = getNextWeekDates();
          weekPlanPrefsRef.current = 'idle';
        } else {
          weekDates = null;
        }
      }
    }

    /**
     * Snapshot síncrono: tras await el ref puede no coincidir (remount / carreras).
     * `isWeekIntent` como respaldo: el primer "armame la semana" debe mostrar chips fijas aunque el ref falle.
     */
    const useCanonicalWeekPlanChips =
      (!weekDates || weekDates.length === 0) &&
      (weekPlanPrefsRef.current === 'week_collecting_prefs' || isWeekIntent);

    if (isWeekIntent) {
      lastPlanRequestRef.current = text;
    }

    chatClientLog('sendToAi_start', {
      textLen: text.length,
      weekIntent: isWeekIntent,
      weekPlanPrefs: weekPlanPrefsRef.current,
      weekDatesInjected: weekDates?.length ?? 0,
      hasExtraWeekDates: Boolean(extraWeekDates?.length),
      canonicalWeekChips: useCanonicalWeekPlanChips,
    });

    setIsLoading(true);

    const loadingId = makeId();
    addMessages({
      id: loadingId,
      type: 'assistant-loading',
      timestamp: new Date().toISOString(),
    });

    try {
      const prefsForChat = buildPreferencesForChatRequest({
        stored: planPreferences,
        lastUserMessage: text,
        extra: extraPreferences ?? null,
      });

      const context = buildContext({
        profile,
        dailyBudget: budget,
        dayPlans: useCalendarStore.getState().dayPlans,
        allIngredients,
        conversationHistory: conversationRef.current,
        preferences: prefsForChat,
        weekDates,
        favorites: useHistorialStore.getState().favorites,
      });

      // Only build and send catalogs when Gemini might need to generate food
      const needsCatalog =
        isWeekIntent ||
        weekPlanPrefsRef.current === 'week_collecting_prefs' ||
        Boolean(weekDates?.length) ||
        /cambi(a|á)me|swap|sugeri|recomen|qué\s+(como|ceno|desayuno|meriendo)|almuerzo|cena|desayuno|merienda|snack|comida|plato|receta/i.test(text);

      let catalogFull = '';
      let catalogAnchor = '';
      if (needsCatalog) {
        const anchorWeekId =
          weekDates && weekDates.length > 0
            ? isoWeekIdFromYmd(weekDates[0])
            : isoWeekIdFromYmd(format(new Date(), 'yyyy-MM-dd'));

        const filtered = filterIngredientsForUser(allIngredients, profile);
        catalogFull = catalogToPromptString(buildCatalogForPrompt(filtered));
        const weeklyPool = buildWeeklyIngredientPool(allIngredients, profile, {
          weekId: anchorWeekId,
        });
        catalogAnchor = formatWeeklyPoolForPrompt(weeklyPool, allIngredients);
      }

      const response = await sendMessage(
        text,
        context,
        {
          catalog: catalogFull,
          catalogAnchor,
        },
        { weekPlanPhase1QuickReplies: useCanonicalWeekPlanChips },
      );

      setMessages((prev) => prev.filter((m) => m.id !== loadingId));
      setRemainingMessages(response.remaining);

      const allowWeekPlanAction = Boolean(weekDates?.length);
      const actionsToRun = allowWeekPlanAction
        ? response.actions
        : response.actions.filter((a) => a.type !== 'week_plan');
      if (!allowWeekPlanAction && response.actions.some((a) => a.type === 'week_plan')) {
        chatClientLog('strip_week_plan', { reason: 'no_week_dates_in_request' });
      }

      const actionTypes = actionsToRun.map((a) => a.type);
      const selfContainedVisual = actionTypes.some((t) =>
        t === 'week_plan' ||
        t === 'suggest_meals' ||
        t === 'show_summary' ||
        t === 'add_meal' ||
        t === 'swap_meal',
      );

      const quickRepliesToShow: string[] = [...(response.quickReplies ?? [])];

      const trimmedAssistant = (response.text ?? '').trim();
      const qrLen = quickRepliesToShow.length;

      let assistantDisplay = trimmedAssistant;
      if (!assistantDisplay && qrLen > 0 && !selfContainedVisual) {
        assistantDisplay =
          'Seguimos. Podés tocar una opción abajo o contarme con tus palabras.';
      }
      if (
        !assistantDisplay &&
        !selfContainedVisual &&
        qrLen === 0 &&
        actionTypes.length === 0
      ) {
        assistantDisplay =
          'No recibí una respuesta del asistente. ¿Podés intentar de nuevo?';
        chatClientLog('sendToAi_empty_response', { rawTextLen: (response.text ?? '').length });
      }

      conversationRef.current.push(
        { role: 'user', text },
        { role: 'assistant', text: assistantDisplay },
      );
      if (conversationRef.current.length > AI_CONVERSATION_HISTORY_LIMIT) {
        conversationRef.current = conversationRef.current.slice(-AI_CONVERSATION_HISTORY_LIMIT);
      }

      chatClientLog('sendToAi_after_store', {
        historyEntries: conversationRef.current.length,
        actionsIncoming: response.actions.length,
        hasText: assistantDisplay.length > 0,
        weekRepetitionMode: prefsForChat?.weekRepetitionMode ?? null,
      });

      if (prefsForChat) {
        setPlanPreferences(prefsForChat);
      }

      if (assistantDisplay) {
        addMessages({
          id: makeId(),
          type: 'assistant-text',
          text: assistantDisplay,
          timestamp: new Date().toISOString(),
        });
      }

      if (actionsToRun.length > 0) {
        executeActions(actionsToRun);
      }

      if (quickRepliesToShow.length > 0) {
        addMessages({
          id: makeId(),
          type: 'assistant-options',
          options: quickRepliesToShow.map((label, idx) => ({
            id: `qr_${idx}`,
            label,
            action: 'quick_reply',
            payload: label,
          })),
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err) {
      chatClientLogError('sendToAi_catch', err, { loadingId });

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
    } finally {
      sendingLockRef.current = false;
      setIsLoading(false);
    }
  }

  const handleSendMessage = useCallback((text: string) => {
    if (!text.trim() || isLoading) return;

    addMessages({
      id: makeId(),
      type: 'user-text',
      text: text.trim(),
      timestamp: new Date().toISOString(),
    });

    sendToAi(text.trim());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, profile, budget, planPreferences]);

  const handleOption = useCallback((option: ChatOption) => {
    if (isLoading) return;

    // Quick reply chips: send the label as a user message
    if (option.action === 'quick_reply' && option.payload) {
      chatClientLog('quick_reply', { payloadLen: option.payload.length });
      // Quita solo el último bloque de chips (quick replies), no todos los históricos
      setMessages((prev) => {
        const next = [...prev];
        for (let i = next.length - 1; i >= 0; i--) {
          const m = next[i]!;
          if (m.type === 'assistant-options' && m.options?.some((o) => o.action === 'quick_reply')) {
            next.splice(i, 1);
            break;
          }
        }
        return next;
      });

      addMessages({
        id: makeId(),
        type: 'user-choice',
        text: option.payload,
        timestamp: new Date().toISOString(),
      });

      sendToAi(option.payload);
      return;
    }
    // create_profile, go_calendar, go_shopping handled in ChatAssistant
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, profile, budget, planPreferences]);

  const handleApplyPlan = useCallback((plan: WeekPlan) => {
    weekPlanPrefsRef.current = 'idle';
    // Accedemos via getState() para evitar closures stale y asegurar el state más reciente
    const calendarStore = useCalendarStore.getState();
    const shoppingStore = useShoppingStore.getState();
    const allAiMeals: AiMeal[] = [];

    for (const day of plan.days) {
      for (const mt of MEAL_TYPE_ORDER) {
        const planned = day.meals[mt];
        if (!planned) continue;

        calendarStore.upsertMeal(day.date, mt, aiMealToCalendarMeal(planned));
        allAiMeals.push(planned);
      }
    }

    // Add all ingredients to shopping list
    const allIngs = [...INGREDIENTS_DB, ...useIngredientsStore.getState().customIngredients];
    const shoppingItems = createShoppingItemsFromAiMeals(allAiMeals, allIngs);
    shoppingStore.addItemsToActiveList(shoppingItems);

    // Fire-and-forget: embed all dishes for semantic search
    const dishesToEmbed = plan.days.flatMap((day) =>
      MEAL_TYPE_ORDER
        .filter((mt) => day.meals[mt])
        .map((mt) => aiMealToDishToEmbed(day.meals[mt]!, mt, day.date)),
    );
    submitDishesForEmbedding(dishesToEmbed);

    recordWeekPlanApplied(plan);

    // Garantizar persistencia en Supabase: llamamos schedulePush() UNA SOLA VEZ,
    // después de que todos los upsertMeal se aplicaron al state.
    // Esto evita el race condition del dynamic import en sync() y asegura
    // que buildPayload() capture el estado completo y final del calendario.
    useGistSyncStore.getState().schedulePush();

    setMessages((prev) => {
      const updated = [...prev];
      for (let i = updated.length - 1; i >= 0; i--) {
        if (updated[i].type === 'assistant-plan' && updated[i].weekPlan) {
          updated[i] = {
            ...updated[i],
            type: 'assistant-applied',
            weekPlan: { ...updated[i].weekPlan!, applied: true },
          };
          break;
        }
      }
      return updated;
    });

    addMessages({
      id: makeId(),
      type: 'assistant-text',
      text: '¡Listo! Ya apliqué el plan a tu calendario y agregué todo a la lista de compras.',
      timestamp: new Date().toISOString(),
    });
  }, []);

  const handleRegeneratePlan = useCallback(() => {
    if (isLoading) return;
    chatClientLog('ui_regenerate_plan', {});
    weekPlanPrefsRef.current = 'idle';
    setMessages((prev) => prev.filter((m) => m.type !== 'assistant-plan'));
    const weekDates = getNextWeekDates();
    const msg = lastPlanRequestRef.current || 'Generame opciones distintas a las anteriores.';
    sendToAi(msg, weekDates, planPreferences);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, profile, budget, planPreferences]);

  const handleSwapMeal = useCallback((date: string, mealType: MealType) => {
    if (isLoading) return;
    chatClientLog('ui_swap_meal', { date, mealType });
    const msg = `Cambiame el ${MEAL_TYPE_LABELS[mealType].toLowerCase()} del ${date} por otra opción.`;
    sendToAi(msg);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, profile, budget]);

  return {
    messages,
    hasProfile: !!profile,
    handleOption,
    handleSendMessage,
    handleApplyPlan,
    handleRegeneratePlan,
    handleSwapMeal,
    energyLevel,
    energyRatio,
    showCalories,
    isLoading,
    remainingMessages,
  };
}
