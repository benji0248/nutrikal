import { useCallback, useRef, useEffect } from 'react';
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
import { useChatStore, AI_CONVERSATION_HISTORY_LIMIT } from '../../store/useChatStore';
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
import { useProgressStore } from '../../store/useProgressStore';
import { formatProgressDetails } from '../../services/progressCopy';
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
import { buildCalendarSlotIntro } from '../../utils/calendarMealChat';
import {
  type ChatSurface,
  buildActionsForSurface,
  buildWelcomeText,
  buildFreshProfileWelcomeText,
  buildNoProfileWelcomeText,
  planChatLifecycle,
  shouldAppendSurfaceOptions,
} from '../../utils/chatLifecycle';

export { AI_CONVERSATION_HISTORY_LIMIT };

function makeId(): string {
  return crypto.randomUUID();
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

function buildWelcomeMessagesForProfile(
  profile: NonNullable<ReturnType<typeof useProfileStore.getState>['profile']>,
  justOnboarded: boolean,
): ChatMessage[] {
  const surface: ChatSurface = justOnboarded ? 'home_fresh' : 'home';
  return [
    {
      id: makeId(),
      type: 'assistant-text',
      text: justOnboarded
        ? buildFreshProfileWelcomeText(profile.name)
        : buildWelcomeText(profile.name),
      timestamp: new Date().toISOString(),
    },
    {
      id: makeId(),
      type: 'assistant-options',
      options: buildActionsForSurface(surface),
      timestamp: new Date().toISOString(),
    },
  ];
}

function buildNoProfileWelcomeMessages(): ChatMessage[] {
  return [
    {
      id: makeId(),
      type: 'assistant-text',
      text: buildNoProfileWelcomeText(),
      timestamp: new Date().toISOString(),
    },
    {
      id: makeId(),
      type: 'assistant-options',
      options: buildActionsForSurface('no_profile'),
      timestamp: new Date().toISOString(),
    },
  ];
}

function optionsMessage(surface: ChatSurface, ctx?: { mealType?: MealType; hasExistingMeal?: boolean }): ChatMessage {
  return {
    id: makeId(),
    type: 'assistant-options',
    options: buildActionsForSurface(surface, ctx),
    timestamp: new Date().toISOString(),
  };
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
}

export type UseChatEngineOptions = {
  /**
   * `home` (default): main assistant tab — promotes leftover calendar_slot
   * surfaces back to home so global actions (incl. week plan) return.
   * `calendar_overlay`: inline Calendario chat — keeps slot-contextual chips.
   */
  mode?: 'home' | 'calendar_overlay';
};

export function useChatEngine(options?: UseChatEngineOptions): ChatEngineResult {
  const engineMode = options?.mode ?? 'home';
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
  const progressCheckIns = useProgressStore((s) => s.checkIns);

  const messages = useChatStore((s) => s.messages);
  const isLoading = useChatStore((s) => s.isLoading);
  const hasHydrated = useChatStore((s) => s.hasHydrated);
  const conversationEpoch = useChatStore((s) => s.conversationEpoch);
  const calendarMealIntent = useChatStore((s) => s.calendarMealIntent);

  const prevProfileRef = useRef(profile);
  const progressSurfaceCheckedRef = useRef(false);
  const reconciledEpochRef = useRef<number | null>(null);

  function addMessages(...msgs: ChatMessage[]) {
    useChatStore.getState().appendMessages(...msgs);
  }

  function enterSurface(
    surface: ChatSurface,
    ctx?: { mealType?: MealType; hasExistingMeal?: boolean },
  ) {
    const chat = useChatStore.getState();
    chat.setActiveSurface(surface);
    if (surface === 'home' || surface === 'home_fresh') {
      chat.setLastMealType(null);
      chat.setLastMealDate(null);
      chat.clearPendingAction();
    }
    // Avoid consecutive duplicate option rows on reconcile / repeated enterSurface.
    if (!shouldAppendSurfaceOptions(chat.messages, surface, ctx)) return;
    addMessages(optionsMessage(surface, ctx));
  }

  /** Seed welcome or reconcile trailing actions after hydrate / reset / new conversation. */
  useEffect(() => {
    if (!hasHydrated) return;
    const chat = useChatStore.getState();

    const plan = planChatLifecycle({
      hasHydrated,
      hasCalendarIntent: Boolean(chat.calendarMealIntent),
      hasProfile: Boolean(profile),
      messages: chat.messages,
      engineMode,
      lastMealType: chat.lastMealType,
      alreadyReconciledThisEpoch: reconciledEpochRef.current === conversationEpoch,
    });

    if (plan.action === 'none') return;

    if (plan.action === 'seed') {
      if (plan.surface === 'no_profile') {
        chat.setActiveSurface('no_profile');
        chat.replaceMessages(buildNoProfileWelcomeMessages(), 'initial');
        return;
      }
      if (!profile) return;
      chat.setActiveSurface('home');
      chat.replaceMessages(buildWelcomeMessagesForProfile(profile, false), 'initial');
      return;
    }

    // reconcile
    reconciledEpochRef.current = conversationEpoch;
    chat.setActiveSurface(plan.surface);
    if (plan.clearMealContext) {
      chat.setLastMealType(null);
      chat.setLastMealDate(null);
      chat.clearPendingAction();
    }
    if (plan.appendOptions) {
      addMessages(optionsMessage(plan.surface, plan.optionsCtx));
    }
  }, [profile, hasHydrated, conversationEpoch, engineMode]);

  /** Open chat from Calendario meal slot with contextual suggestions. */
  useEffect(() => {
    if (!hasHydrated || !calendarMealIntent) return;

    const chat = useChatStore.getState();
    const intent = calendarMealIntent;
    chat.setCalendarMealIntent(null);
    chat.setLastMealType(intent.mealType);
    chat.setLastMealDate(intent.date);
    chat.setActiveSurface('calendar_slot');

    const dateLabel =
      intent.date === todayKey()
        ? 'hoy'
        : formatDayFull(parseDate(intent.date));

    chat.appendMessages(
      {
        id: makeId(),
        type: 'assistant-text',
        text: buildCalendarSlotIntro(
          intent.mealType,
          dateLabel,
          intent.existingMealName,
        ),
        timestamp: new Date().toISOString(),
      },
      optionsMessage('calendar_slot', {
        mealType: intent.mealType,
        hasExistingMeal: Boolean(intent.existingMealName),
      }),
    );
  }, [hasHydrated, calendarMealIntent]);

  useEffect(() => {
    if (!prevProfileRef.current && profile) {
      const chat = useChatStore.getState();
      chat.resetConversation({ sync: true });
      const surface: ChatSurface = justOnboarded ? 'home_fresh' : 'home';
      chat.setActiveSurface(surface);
      chat.replaceMessages(
        buildWelcomeMessagesForProfile(profile, justOnboarded),
        'initial',
      );
      if (justOnboarded) {
        clearJustOnboarded();
      }
    } else if (profile && justOnboarded && prevProfileRef.current) {
      const chat = useChatStore.getState();
      chat.clearConversationHistory();
      chat.setLastWeekPlan(null);
      chat.setLastMealType(null);
      chat.clearPendingAction();
      chat.setActiveSurface('home_fresh');
      chat.replaceMessages(buildWelcomeMessagesForProfile(profile, true), 'initial');
      clearJustOnboarded();
    }
    prevProfileRef.current = profile;
  }, [profile, justOnboarded, clearJustOnboarded]);

  useEffect(() => {
    if (!profile || progressSurfaceCheckedRef.current) return;
    progressSurfaceCheckedRef.current = true;

    const progress = useProgressStore.getState();
    const reading = progress.getReading();
    if (!reading || !progress.shouldSurfaceReading()) return;

    const promptLevel = progress.getPromptLevel();
    const text =
      promptLevel === 'soft'
        ? 'Si sentís que hubo cambios importantes, podés registrar un nuevo peso cuando quieras.'
        : reading.text;
    const option: ChatOption =
      promptLevel === 'soft'
        ? {
            id: `progress-open-${reading.insightId}`,
            label: 'Ir a progreso',
            action: 'go_progress',
            icon: 'ChevronDown',
          }
        : {
            id: `progress-details-${reading.insightId}`,
            label: 'Ver detalles',
            action: 'progress_details',
            icon: 'ChevronDown',
          };

    addMessages(
      {
        id: `progress-${reading.insightId}`,
        type: 'assistant-text',
        text,
        timestamp: new Date().toISOString(),
      },
      {
        id: `progress-options-${reading.insightId}`,
        type: 'assistant-options',
        options: [option],
        timestamp: new Date().toISOString(),
      },
    );
    progress.markReadingSeen(reading.insightId);
  }, [profile, progressCheckIns]);

  function returnToHome() {
    enterSurface('home');
  }

  async function runWeekPlanGeneration() {
    const activeProfile = useProfileStore.getState().profile;
    const activeWeekPlanning = useWeekPlanningStore.getState().weekPlanning;
    if (!activeProfile || !activeWeekPlanning?.completedAt) return;
    const chat = useChatStore.getState();
    const epoch = chat.tryBeginSend();
    if (epoch == null) return;

    addMessages({
      id: makeId(),
      type: 'user-choice',
      text: 'Planificá mi semana',
      timestamp: new Date().toISOString(),
    });

    const loadingId = makeId();
    addMessages({
      id: loadingId,
      type: 'assistant-loading',
      loadingStyle: 'cooking',
      timestamp: new Date().toISOString(),
    });

    try {
      const weekId = getIsoWeekId(todayKey());
      const poolGeneration = usePlanRotationStore.getState().bumpPoolGeneration(weekId);

      const rotation = usePlanRotationStore.getState();
      const ctx = buildWeekPlanningContext(
        activeProfile,
        dayPlans,
        customIngredients,
        todayKey(),
        [],
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
        variationSeed: `${ctx.weekId}-${Date.now()}`,
      });

      if (!useChatStore.getState().isEpochCurrent(epoch)) return;

      const plan = buildFullWeekPlanFromApiResponse({
        skeleton: apiResult.skeleton,
        rawDishes: apiResult.rawDishes,
        weekPlanning: activeWeekPlanning,
        profile: activeProfile,
        useGrams,
      });

      useChatStore.getState().setLastWeekPlan(plan);
      const rot = usePlanRotationStore.getState();
      rot.rememberWeeklyPool(ctx.pool);

      const memoryNote = buildPersonalizationNote({
        mode: 'week_plan',
        dislikedNames,
        dislikedCategoryLabels: resolveDislikedCategoryLabels(activeProfile),
        poolGeneration,
        recentAcceptedIngredient: getRecentAcceptedIngredientHint(
          useIngredientSignalStore.getState().entries,
        ),
      });

      useChatStore.getState().removeMessage(loadingId);
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
      enterSurface('review_plan');
    } catch (err) {
      if (!useChatStore.getState().isEpochCurrent(epoch)) return;
      useChatStore.getState().removeMessage(loadingId);
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
      returnToHome();
    } finally {
      if (useChatStore.getState().isEpochCurrent(epoch)) {
        useChatStore.getState().endSend();
      }
    }
  }

  async function sendToAi(
    text: string,
    options?: { variation?: boolean; mealType?: MealType; mealBudgetKcal?: number },
  ) {
    if (!profile) return;
    const chat = useChatStore.getState();
    const epoch = chat.tryBeginSend();
    if (epoch == null) return;

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

    if (options?.mealType) {
      useChatStore.getState().setLastMealType(options.mealType);
    }
    // Handlers (swap/regenerate) set pendingAction before calling sendToAi.
    if (!useChatStore.getState().pendingAction) {
      useChatStore.getState().setPendingAction({ kind: 'dish' });
    }

    const activeMealType = options?.mealType ?? useChatStore.getState().lastMealType ?? undefined;
    const mealBudgetKcal = options?.mealBudgetKcal
      ?? (activeMealType && profile ? resolveMealBudget(profile, activeMealType) : undefined);

    const loadingId = makeId();
    addMessages({
      id: loadingId,
      type: 'assistant-loading',
      loadingStyle: activeMealType ? 'cooking' : undefined,
      timestamp: new Date().toISOString(),
    });

    try {
      const history = useChatStore.getState().conversationHistory;
      const result: SendMessageResult = await sendMessage(
        promptForApi,
        history,
        {
          mealType: activeMealType,
          mealBudgetKcal,
        },
      );

      if (!useChatStore.getState().isEpochCurrent(epoch)) return;

      useChatStore.getState().removeMessage(loadingId);
      useChatStore.getState().appendConversationTurn(promptForApi, result.text);

      const mealType = activeMealType;
      const pendingAction = useChatStore.getState().pendingAction;

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
            useChatStore.getState().clearPendingAction();
            returnToHome();
            return;
          }
        }

        useChatStore.getState().clearPendingAction();
        const dishNote = buildPersonalizationNote({
          mode: pendingAction?.kind === 'swap'
            ? 'swap'
            : pendingAction?.kind === 'regenerate'
              ? 'regenerate'
              : options?.variation
                ? 'regenerate'
                : 'dish',
          previousDishName: pendingAction && 'previousDishName' in pendingAction
            ? pendingAction.previousDishName
            : undefined,
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

        if (pendingAction?.kind === 'swap' && mealType) {
          const swapTarget = pendingAction;
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
          useChatStore.getState().updateMessages((prev) =>
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
              useChatStore.getState().setLastWeekPlan(updated);
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
          enterSurface('review_plan');
        } else if (pendingAction?.kind === 'regenerate' && pendingAction.messageId) {
          const targetId = pendingAction.messageId;
          useChatStore.getState().updateMessages((prev) =>
            prev.map((m) =>
              m.id === targetId && m.type === 'assistant-dish'
                ? {
                    ...m,
                    text: hydrated.name,
                    dishSuggestion: hydrated,
                    mealType: mealType ?? m.mealType,
                    targetDate: m.targetDate ?? useChatStore.getState().lastMealDate ?? undefined,
                    personalizationNote: combinedNote ?? undefined,
                  }
                : m,
            ),
          );
          enterSurface('review_dish');
        } else {
          addMessages({
            id: makeId(),
            type: 'assistant-dish',
            text: hydrated.name,
            dishSuggestion: hydrated,
            mealType: mealType ?? undefined,
            targetDate: useChatStore.getState().lastMealDate ?? undefined,
            personalizationNote: combinedNote ?? undefined,
            timestamp: new Date().toISOString(),
          });
          enterSurface('review_dish');
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
        returnToHome();
        useChatStore.getState().clearPendingAction();
      }
    } catch (err) {
      if (!useChatStore.getState().isEpochCurrent(epoch)) return;
      useChatStore.getState().removeMessage(loadingId);

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
      useChatStore.getState().clearPendingAction();
      returnToHome();
    } finally {
      if (useChatStore.getState().isEpochCurrent(epoch)) {
        useChatStore.getState().endSend();
      }
    }
  }

  const handleSendMessage = useCallback(
    (text: string) => {
      if (!text.trim() || isLoading) return;
      const mealType = useChatStore.getState().lastMealType ?? undefined;
      addMessages({
        id: makeId(),
        type: 'user-text',
        text: text.trim(),
        timestamp: new Date().toISOString(),
      });
      sendToAi(text.trim(), mealType ? { mealType } : undefined);
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
          useChatStore.getState().setLastMealType(inferred);
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

        addMessages({
          id: makeId(),
          type: 'assistant-text',
          text: buildMealPickPrompt(),
          timestamp: new Date().toISOString(),
        });
        enterSurface('pick_meal');
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
        );
        enterSurface('rescue');
        return;
      }

      if (option.action === 'progress_details') {
        const reading = useProgressStore.getState().getReading();
        if (!reading) return;
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
            text: formatProgressDetails(reading),
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
        returnToHome();
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
        addMessages({
          id: makeId(),
          type: 'assistant-text',
          text: 'Listo: marcamos hoy como flexible. Sin menú estricto por el resto del día; mañana retomamos el ritmo.',
          timestamp: new Date().toISOString(),
        });
        enterSurface('post_apply_dish');
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
          returnToHome();
          return;
        }

        if (!dayPlan) {
          addMessages({
            id: makeId(),
            type: 'assistant-text',
            text: 'Todavía no hay comidas planificadas para más tarde. Cuando armes el resto, pedime opciones más livianas y listo.',
            timestamp: new Date().toISOString(),
          });
          returnToHome();
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
          returnToHome();
          return;
        }

        const adjustedList = result.adjusted
          .map((a) => `${mealTypeChipLabel(a.mealType)}: ${a.name}`)
          .join(' · ');
        addMessages({
          id: makeId(),
          type: 'assistant-text',
          text: `Ajusté el resto del día con porciones más livianas: ${adjustedList}. Así el día queda cómodo sin tirar el plan.`,
          timestamp: new Date().toISOString(),
        });
        enterSurface('post_apply_dish');
        return;
      }

      if (option.action === 'pick_meal_type' && option.payload && isMealType(option.payload)) {
        const mealType = option.payload;
        useChatStore.getState().setLastMealType(mealType);
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

      if (option.action === 'generate_for_slot') {
        const mealType = useChatStore.getState().lastMealType;
        if (!mealType) return;

        const isChange = option.payload === 'change';
        const prompt = profile
          ? buildCookNowPrompt(mealType, computeMetabolism(profile).budget)
          : buildCookNowPrompt(mealType, 2000);

        addMessages({
          id: makeId(),
          type: 'user-choice',
          text: option.label,
          timestamp: new Date().toISOString(),
        });
        void sendToAi(
          isChange
            ? `Cambiame esta comida. Generá otra opción para mi ${mealTypeToPromptLabel(mealType)}.`
            : prompt,
          { mealType, variation: isChange },
        );
        return;
      }

      if (option.action === 'quick_reply' && option.payload) {
        const mealType = useChatStore.getState().lastMealType ?? undefined;
        addMessages({
          id: makeId(),
          type: 'user-choice',
          text: option.label || option.payload,
          timestamp: new Date().toISOString(),
        });
        sendToAi(option.payload, mealType ? { mealType } : undefined);
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

      addMessages({
        id: makeId(),
        type: 'assistant-text',
        text: `Listo, agregué ${dish.name} a tu ${mealTypeToPromptLabel(mealType)} de ${when}.`,
        timestamp: new Date().toISOString(),
      });
      enterSurface('post_apply_dish');
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
      useChatStore.getState().setLastWeekPlan(applied);

      useChatStore.getState().updateMessages((prev) =>
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
      );
      enterSurface('post_apply_plan');
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
      const mt = mealType ?? useChatStore.getState().lastMealType ?? 'almuerzo';
      usePlanRotationStore.getState().rememberRejected(dish.name);
      recordMealRejected(todayKey(), mt, hydratedDishToAiMeal(dish));
      useChatStore.getState().setLastMealType(mt);
      useChatStore.getState().setPendingAction({
        kind: 'regenerate',
        messageId,
        previousDishName: dish.name,
      });
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
      const plan = useChatStore.getState().lastWeekPlan;
      const oldMeal = plan?.days.find((d) => d.date === date)?.meals[mealType];
      if (oldMeal?.name) {
        usePlanRotationStore.getState().rememberRejected(oldMeal.name);
        recordMealRejected(date, mealType, oldMeal);
      }

      useChatStore.getState().setPendingAction({
        kind: 'swap',
        date,
        mealType,
        previousDishName: oldMeal?.name,
      });
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
      useChatStore.getState().setLastMealType(mealType);
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
  };
}
