import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type {
  ChatMessage,
  ChatOption,
  MealType,
  Dish,
  Ingredient,
  EnergyLevel,
  AiAction,
  WeekPlan,
  PlanPreferences,
} from '../../types';
import { MEAL_TYPE_LABELS, MEAL_TYPE_ORDER } from '../../types';
import { useProfileStore } from '../../store/useProfileStore';
import { useCalendarStore } from '../../store/useCalendarStore';
import { useIngredientsStore } from '../../store/useIngredientsStore';
import { useRecipesStore } from '../../store/useRecipesStore';
import { useShoppingStore } from '../../store/useShoppingStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { INGREDIENTS_DB } from '../../data/ingredients';
import { DISHES_DB } from '../../data/dishes';
import {
  computeDayConsumed,
  computeDishMacros,
} from '../../services/dishMatchService';
import { getEnergyLevel, getEnergyRatio } from '../../services/metabolicService';
import { createShoppingItemsFromDish } from '../../services/shoppingService';
import { todayKey, generateId } from '../../utils/dateHelpers';
import {
  sendMessage,
  buildContext,
  getNextWeekDates,
} from '../../services/aiService';

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
}

export function useChatEngine(): ChatEngineResult {
  const profile = useProfileStore((s) => s.profile);
  const getMetabolicResult = useProfileStore((s) => s.getMetabolicResult);
  const customIngredients = useIngredientsStore((s) => s.customIngredients);
  const customDishes = useRecipesStore((s) => s.customDishes);
  const dayPlans = useCalendarStore((s) => s.dayPlans);
  const upsertMeal = useCalendarStore((s) => s.upsertMeal);
  const addItemsToActiveList = useShoppingStore((s) => s.addItemsToActiveList);
  const showCalories = useSettingsStore((s) => s.showCalories);

  const allIngredients: Ingredient[] = useMemo(
    () => [...INGREDIENTS_DB, ...customIngredients],
    [customIngredients],
  );

  const allDishes: Dish[] = useMemo(
    () => [...DISHES_DB, ...customDishes],
    [customDishes],
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
  const [planPreferences] = useState<PlanPreferences | null>(null);
  const conversationRef = useRef<Array<{ role: 'user' | 'assistant'; text: string }>>([]);
  const prevProfileRef = useRef(profile);
  const lastPlanRequestRef = useRef<string>('');

  // Reset chat when profile is created
  useEffect(() => {
    if (!prevProfileRef.current && profile) {
      setMessages(buildWelcomeMessages());
      conversationRef.current = [];
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
        text: `¡Hola${profile.name ? `, ${profile.name}` : ''}! Soy tu nutricionista. Contame, ¿qué necesitás?`,
        timestamp: new Date().toISOString(),
      },
    ];
  }

  function addMessages(...msgs: ChatMessage[]) {
    setMessages((prev) => [...prev, ...msgs]);
  }

  function findDish(dishId: string): Dish | undefined {
    return allDishes.find((d) => d.id === dishId);
  }

  function executeActions(actions: AiAction[]) {
    for (const action of actions) {
      switch (action.type) {
        case 'add_meal':
        case 'swap_meal': {
          const dish = findDish(action.dishId);
          if (!dish) break;

          const servings = action.servings || 1;
          const entries = dish.ingredients.map((di) => ({
            ingredientId: di.ingredientId,
            grams: Math.round(di.grams * servings),
          }));
          const macros = computeDishMacros(dish, allIngredients);
          const totalCals = Math.round(macros.calories * servings);

          if (action.type === 'swap_meal') {
            const currentPlan = useCalendarStore.getState().dayPlans[action.date];
            if (currentPlan) {
              const slotMeals = currentPlan.meals[action.mealType];
              for (const m of slotMeals) {
                useCalendarStore.getState().deleteMeal(action.date, action.mealType, m.id);
              }
            }
          }

          upsertMeal(action.date, action.mealType, {
            id: generateId(),
            name: servings === 1 ? dish.name : `${dish.name} (x${servings})`,
            entries,
            calories: totalCals,
            linkedRecipeId: dish.id,
          });

          const shoppingItems = createShoppingItemsFromDish(dish, servings, allIngredients);
          addItemsToActiveList(shoppingItems);
          break;
        }

        case 'week_plan': {
          const weekPlan: WeekPlan = { days: action.days, applied: false };
          addMessages({
            id: makeId(),
            type: 'assistant-plan',
            weekPlan,
            timestamp: new Date().toISOString(),
          });
          break;
        }

        case 'suggest_dishes': {
          const suggestions = action.dishes
            .map((s) => findDish(s.dishId))
            .filter((d): d is Dish => d !== undefined);

          const reasons: Record<string, string> = {};
          for (const s of action.dishes) {
            if (s.reason) reasons[s.dishId] = s.reason;
          }

          if (suggestions.length > 0) {
            addMessages({
              id: makeId(),
              type: 'assistant-dishes',
              dishSuggestions: suggestions,
              dishReasons: reasons,
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
              water: plan?.water ?? 0,
              waterGoal: plan?.waterGoal ?? 8,
            },
            timestamp: new Date().toISOString(),
          });
          break;
        }
      }
    }
  }

  async function sendToAi(
    text: string,
    extraWeekDates?: string[] | null,
    extraPreferences?: PlanPreferences | null,
  ) {
    if (!profile) return;

    setIsLoading(true);

    const loadingId = makeId();
    addMessages({
      id: loadingId,
      type: 'assistant-loading',
      timestamp: new Date().toISOString(),
    });

    try {
      const context = buildContext({
        message: text,
        profile,
        dailyBudget: budget,
        allDishes,
        allIngredients,
        dayPlans: useCalendarStore.getState().dayPlans,
        conversationHistory: conversationRef.current,
        preferences: extraPreferences || planPreferences,
        weekDates: extraWeekDates,
      });

      const response = await sendMessage(text, context);

      setMessages((prev) => prev.filter((m) => m.id !== loadingId));

      conversationRef.current.push(
        { role: 'user', text },
        { role: 'assistant', text: response.text },
      );
      if (conversationRef.current.length > 20) {
        conversationRef.current = conversationRef.current.slice(-20);
      }

      if (response.text) {
        addMessages({
          id: makeId(),
          type: 'assistant-text',
          text: response.text,
          timestamp: new Date().toISOString(),
        });
      }

      if (response.actions && response.actions.length > 0) {
        executeActions(response.actions);
      }

      // Render AI-generated quick reply chips
      if (response.quickReplies && response.quickReplies.length > 0) {
        addMessages({
          id: makeId(),
          type: 'assistant-options',
          options: response.quickReplies.map((label, idx) => ({
            id: `qr_${idx}`,
            label,
            action: 'quick_reply',
            payload: label,
          })),
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== loadingId));

      addMessages({
        id: makeId(),
        type: 'assistant-text',
        text: err instanceof Error && err.message === 'Not authenticated'
          ? 'Necesitás estar conectado para usar el asistente.'
          : 'Algo salió mal. ¿Podés intentar de nuevo?',
        timestamp: new Date().toISOString(),
      });
    } finally {
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
  }, [isLoading, profile, allDishes, allIngredients, budget, planPreferences]);

  const handleOption = useCallback((option: ChatOption) => {
    // Quick reply chips: send the label as a user message
    if (option.action === 'quick_reply' && option.payload) {
      // Remove the quick reply chips from the chat
      setMessages((prev) => prev.filter((m) =>
        !(m.type === 'assistant-options' && m.options?.some((o) => o.action === 'quick_reply')),
      ));

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
  }, [isLoading, profile, allDishes, allIngredients, budget, planPreferences]);

  const handleApplyPlan = useCallback((plan: WeekPlan) => {
    for (const day of plan.days) {
      for (const mt of MEAL_TYPE_ORDER) {
        const planned = day.meals[mt];
        if (!planned) continue;

        const dish = findDish(planned.dishId);
        if (!dish) continue;

        const servings = planned.servings || 1;
        const entries = dish.ingredients.map((di) => ({
          ingredientId: di.ingredientId,
          grams: Math.round(di.grams * servings),
        }));
        const macros = computeDishMacros(dish, allIngredients);
        const totalCals = Math.round(macros.calories * servings);

        upsertMeal(day.date, mt, {
          id: generateId(),
          name: servings === 1 ? dish.name : `${dish.name} (x${servings})`,
          entries,
          calories: totalCals,
          linkedRecipeId: dish.id,
        });

        const shoppingItems = createShoppingItemsFromDish(dish, servings, allIngredients);
        addItemsToActiveList(shoppingItems);
      }
    }

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allIngredients, allDishes, budget]);

  const handleRegeneratePlan = useCallback(() => {
    setMessages((prev) => prev.filter((m) => m.type !== 'assistant-plan'));
    const weekDates = getNextWeekDates();
    const msg = lastPlanRequestRef.current || 'Generame opciones distintas a las anteriores.';
    sendToAi(msg, weekDates, planPreferences);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, allDishes, allIngredients, budget, planPreferences]);

  const handleSwapMeal = useCallback((date: string, mealType: MealType) => {
    const msg = `Cambiame el ${MEAL_TYPE_LABELS[mealType].toLowerCase()} del ${date} por otra opción.`;
    sendToAi(msg);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, allDishes, allIngredients, budget]);

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
  };
}
