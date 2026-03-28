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
import { getDishHumanIngredients } from '../../utils/portionHelpers';
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
  handleSelectDish: (dish: Dish) => void;
  handleServingsChange: (servings: number) => void;
  handleWaterChange: (delta: number) => void;
  handleSendMessage: (text: string) => void;
  handleApplyPlan: (plan: WeekPlan) => void;
  handleRegeneratePlan: () => void;
  handleSwapMeal: (date: string, mealType: MealType) => void;
  currentServings: number;
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
  const setWater = useCalendarStore((s) => s.setWater);
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
  const [currentServings, setCurrentServings] = useState(1);
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
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
    const welcomeText: ChatMessage = {
      id: makeId(),
      type: 'assistant-text',
      text: profile
        ? `¡Hola${profile.name ? `, ${profile.name}` : ''}! Soy tu nutricionista personal. ¿En qué te puedo ayudar?`
        : '¡Bienvenido a NutriKal! Creá tu perfil para recibir sugerencias personalizadas.',
      timestamp: new Date().toISOString(),
    };

    if (!profile) {
      const profileOption: ChatMessage = {
        id: makeId(),
        type: 'assistant-options',
        options: [
          { id: 'create_profile', label: 'Crear perfil', action: 'create_profile', icon: 'UserCircle' },
        ],
        timestamp: new Date().toISOString(),
      };
      return [welcomeText, profileOption];
    }

    const quickActions: ChatOption[] = [
      { id: 'plan_week', label: 'Planificar mi semana', action: 'plan_week', icon: 'CalendarRange' },
      { id: 'what_eat', label: '¿Qué como hoy?', action: 'send_text', payload: '¿Qué puedo comer hoy?' },
      { id: 'day_summary', label: '¿Cómo vengo hoy?', action: 'send_text', payload: '¿Cómo vengo hoy?' },
      { id: 'water', label: 'Registrar agua', action: 'water', icon: 'Droplets' },
    ];

    const optionsMsg: ChatMessage = {
      id: makeId(),
      type: 'assistant-options',
      options: quickActions,
      timestamp: new Date().toISOString(),
    };

    return [welcomeText, optionsMsg];
  }

  function addMessages(...msgs: ChatMessage[]) {
    setMessages((prev) => [...prev, ...msgs]);
  }

  function findDish(dishId: string): Dish | undefined {
    return allDishes.find((d) => d.id === dishId);
  }

  /**
   * Execute actions returned by the AI.
   */
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

          // For swap, first delete existing meals in that slot
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
          // Show the plan for review instead of applying directly
          const weekPlan: WeekPlan = {
            days: action.days,
            applied: false,
          };

          const planMsg: ChatMessage = {
            id: makeId(),
            type: 'assistant-plan',
            weekPlan,
            timestamp: new Date().toISOString(),
          };

          addMessages(planMsg);
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
            const dishesMsg: ChatMessage = {
              id: makeId(),
              type: 'assistant-dishes',
              dishSuggestions: suggestions,
              dishReasons: reasons,
              timestamp: new Date().toISOString(),
            };
            addMessages(dishesMsg);
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

          const summaryMsg: ChatMessage = {
            id: makeId(),
            type: 'assistant-summary',
            daySummary: {
              meals,
              energyLevel: currentLevel,
              water: plan?.water ?? 0,
              waterGoal: plan?.waterGoal ?? 8,
            },
            timestamp: new Date().toISOString(),
          };
          addMessages(summaryMsg);
          break;
        }
      }
    }
  }

  /**
   * Send a text message to the AI.
   */
  async function sendToAi(
    text: string,
    extraWeekDates?: string[] | null,
    extraPreferences?: PlanPreferences | null,
  ) {
    if (!profile) return;

    setIsLoading(true);

    // Add loading indicator
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

      // Remove loading message
      setMessages((prev) => prev.filter((m) => m.id !== loadingId));

      // Add conversation history
      conversationRef.current.push(
        { role: 'user', text },
        { role: 'assistant', text: response.text },
      );
      // Keep only last 10
      if (conversationRef.current.length > 20) {
        conversationRef.current = conversationRef.current.slice(-20);
      }

      // Add AI text response
      if (response.text) {
        const textMsg: ChatMessage = {
          id: makeId(),
          type: 'assistant-text',
          text: response.text,
          timestamp: new Date().toISOString(),
        };
        addMessages(textMsg);
      }

      // Execute actions
      if (response.actions && response.actions.length > 0) {
        executeActions(response.actions);
      }

      // Add quick actions after response
      const quickOptions: ChatOption[] = [
        { id: 'qa_1', label: 'Planificar mi semana', action: 'plan_week', icon: 'CalendarRange' },
        { id: 'qa_2', label: '¿Qué como hoy?', action: 'send_text', payload: '¿Qué puedo comer hoy?' },
        { id: 'qa_3', label: 'Registrar agua', action: 'water', icon: 'Droplets' },
      ];

      addMessages({
        id: makeId(),
        type: 'assistant-options',
        options: quickOptions,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      // Remove loading message
      setMessages((prev) => prev.filter((m) => m.id !== loadingId));

      const errorMsg: ChatMessage = {
        id: makeId(),
        type: 'assistant-text',
        text: err instanceof Error && err.message === 'Not authenticated'
          ? 'Necesitás estar conectado para usar el asistente.'
          : 'Algo salió mal. ¿Podés intentar de nuevo?',
        timestamp: new Date().toISOString(),
      };
      addMessages(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }

  const handleSendMessage = useCallback((text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: makeId(),
      type: 'user-text',
      text: text.trim(),
      timestamp: new Date().toISOString(),
    };
    addMessages(userMsg);

    sendToAi(text.trim());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, profile, allDishes, allIngredients, budget, planPreferences]);

  const handleOption = useCallback((option: ChatOption) => {
    // Add user choice message
    const userChoice: ChatMessage = {
      id: makeId(),
      type: 'user-choice',
      text: option.label,
      timestamp: new Date().toISOString(),
    };

    switch (option.action) {
      case 'send_text': {
        const text = option.payload || option.label;
        addMessages(userChoice);
        sendToAi(text);
        break;
      }

      case 'plan_week': {
        addMessages(userChoice);
        const weekDates = getNextWeekDates();
        lastPlanRequestRef.current = 'Planificame la semana completa con desayuno, almuerzo, cena y snack para cada día.';
        sendToAi(
          lastPlanRequestRef.current,
          weekDates,
          planPreferences,
        );
        break;
      }

      case 'water': {
        const plan = useCalendarStore.getState().dayPlans[todayKey()];
        const waterMsg: ChatMessage = {
          id: makeId(),
          type: 'assistant-water',
          text: `Llevás ${plan?.water ?? 0} vasos de agua hoy.`,
          daySummary: {
            meals: [],
            energyLevel: 'green',
            water: plan?.water ?? 0,
            waterGoal: plan?.waterGoal ?? 8,
          },
          timestamp: new Date().toISOString(),
        };

        const doneOption: ChatMessage = {
          id: makeId(),
          type: 'assistant-options',
          options: [
            { id: 'done_water', label: 'Listo', action: 'back_welcome', icon: 'Check' },
          ],
          timestamp: new Date().toISOString(),
        };

        addMessages(userChoice, waterMsg, doneOption);
        break;
      }

      case 'confirm_dish': {
        if (!selectedDish) return;
        const dish = selectedDish;
        const servings = currentServings;

        const entries = dish.ingredients.map((di) => ({
          ingredientId: di.ingredientId,
          grams: Math.round(di.grams * servings),
        }));
        const macros = computeDishMacros(dish, allIngredients);
        const totalCals = Math.round(macros.calories * servings);

        const mealType = guessMealType(dish);

        upsertMeal(todayKey(), mealType, {
          id: generateId(),
          name: servings === 1 ? dish.name : `${dish.name} (x${servings})`,
          entries,
          calories: totalCals,
          linkedRecipeId: dish.id,
        });

        const shoppingItems = createShoppingItemsFromDish(dish, servings, allIngredients);
        addItemsToActiveList(shoppingItems);

        const confirmText: ChatMessage = {
          id: makeId(),
          type: 'assistant-text',
          text: `¡Listo! Agregué "${dish.name}" a tu ${MEAL_TYPE_LABELS[mealType].toLowerCase()} y los ingredientes a tu lista de compras.`,
          timestamp: new Date().toISOString(),
        };

        addMessages(userChoice, confirmText);
        setSelectedDish(null);
        break;
      }

      case 'back_welcome': {
        const welcome = buildWelcomeMessages();
        addMessages(userChoice, ...welcome);
        break;
      }

      default:
        break;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDish, currentServings, profile, allIngredients, allDishes, budget, planPreferences, isLoading]);

  const handleSelectDish = useCallback((dish: Dish) => {
    setSelectedDish(dish);
    setCurrentServings(dish.defaultServings);

    const humanIngredients = getDishHumanIngredients(dish, dish.defaultServings, allIngredients);

    const userChoice: ChatMessage = {
      id: makeId(),
      type: 'user-choice',
      text: dish.name,
      timestamp: new Date().toISOString(),
    };

    const recipeMsg: ChatMessage = {
      id: makeId(),
      type: 'assistant-recipe',
      selectedDish: dish,
      servings: dish.defaultServings,
      humanIngredients,
      timestamp: new Date().toISOString(),
    };

    const recipeOptions: ChatMessage = {
      id: makeId(),
      type: 'assistant-options',
      options: [
        { id: 'confirm', label: 'Agregar al día', action: 'confirm_dish', icon: 'Plus' },
        { id: 'back', label: 'Volver', action: 'back_welcome', icon: 'ArrowLeft' },
      ],
      timestamp: new Date().toISOString(),
    };

    addMessages(userChoice, recipeMsg, recipeOptions);
  }, [allIngredients]);

  const handleServingsChange = useCallback((servings: number) => {
    setCurrentServings(servings);

    if (selectedDish) {
      const humanIngredients = getDishHumanIngredients(selectedDish, servings, allIngredients);

      setMessages((prev) => {
        const updated = [...prev];
        for (let i = updated.length - 1; i >= 0; i--) {
          if (updated[i].type === 'assistant-recipe') {
            updated[i] = { ...updated[i], servings, humanIngredients };
            break;
          }
        }
        return updated;
      });
    }
  }, [selectedDish, allIngredients]);

  const handleWaterChange = useCallback((delta: number) => {
    const plan = useCalendarStore.getState().dayPlans[todayKey()];
    const current = plan?.water ?? 0;
    const newVal = Math.max(0, current + delta);
    setWater(todayKey(), newVal);

    setMessages((prev) => {
      const updated = [...prev];
      for (let i = updated.length - 1; i >= 0; i--) {
        if (updated[i].type === 'assistant-water') {
          updated[i] = {
            ...updated[i],
            text: `Llevás ${newVal} vasos de agua hoy.`,
            daySummary: {
              ...updated[i].daySummary!,
              water: newVal,
            },
          };
          break;
        }
      }
      return updated;
    });
  }, [setWater]);

  const handleApplyPlan = useCallback((plan: WeekPlan) => {
    // Apply all meals from the plan to the calendar
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

    // Update the plan message to show applied state
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

    // Add confirmation message
    const confirmMsg: ChatMessage = {
      id: makeId(),
      type: 'assistant-text',
      text: '¡Listo! Ya apliqué el plan a tu calendario y agregué todo a la lista de compras.',
      timestamp: new Date().toISOString(),
    };

    const nextOptions: ChatMessage = {
      id: makeId(),
      type: 'assistant-options',
      options: [
        { id: 'view_cal', label: 'Ver calendario', action: 'go_calendar', icon: 'Calendar' },
        { id: 'view_shop', label: 'Ver compras', action: 'go_shopping', icon: 'ShoppingCart' },
      ],
      timestamp: new Date().toISOString(),
    };

    addMessages(confirmMsg, nextOptions);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allIngredients, allDishes, budget]);

  const handleRegeneratePlan = useCallback(() => {
    // Remove the previous plan message
    setMessages((prev) => prev.filter((m) => m.type !== 'assistant-plan'));

    const weekDates = getNextWeekDates();
    const msg = lastPlanRequestRef.current || 'Planificame la semana completa con desayuno, almuerzo, cena y snack para cada día. Armame opciones distintas a las anteriores.';
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
    handleSelectDish,
    handleServingsChange,
    handleWaterChange,
    handleSendMessage,
    handleApplyPlan,
    handleRegeneratePlan,
    handleSwapMeal,
    currentServings,
    energyLevel,
    energyRatio,
    showCalories,
    isLoading,
  };
}

function guessMealType(dish: Dish): MealType {
  if (dish.category === 'desayuno') return 'desayuno';
  if (dish.category === 'almuerzo') return 'almuerzo';
  if (dish.category === 'cena') return 'cena';
  if (dish.category === 'snack' || dish.category === 'postre') return 'snack';
  return 'almuerzo';
}
