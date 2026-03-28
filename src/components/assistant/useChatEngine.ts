import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type {
  ChatMessage,
  ChatStep,
  ChatOption,
  MealType,
  Dish,
  Ingredient,
  EnergyLevel,
} from '../../types';
import { MEAL_TYPE_LABELS, MEAL_TYPE_ORDER } from '../../types';
import { useProfileStore } from '../../store/useProfileStore';
import { useCalendarStore } from '../../store/useCalendarStore';
import { useIngredientsStore } from '../../store/useIngredientsStore';
import { useShoppingStore } from '../../store/useShoppingStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { INGREDIENTS_DB } from '../../data/ingredients';
import { DISHES_DB } from '../../data/dishes';
import {
  matchDishes,
  computeDayConsumed,
  computeRemainingBudget,
  mealTypeToDishCategory,
  computeDishMacros,
} from '../../services/dishMatchService';
import { getEnergyLevel, getEnergyRatio } from '../../services/metabolicService';
import { createShoppingItemsFromDish } from '../../services/shoppingService';
import { getDishHumanIngredients } from '../../utils/portionHelpers';
import { todayKey, generateId } from '../../utils/dateHelpers';

function makeId(): string {
  return generateId();
}

const ENERGY_MESSAGES: Record<EnergyLevel, string> = {
  green: 'Tenés buen margen. Te sugiero estas opciones:',
  amber: 'Te sugiero opciones que van bien con lo que ya comiste:',
  warm_orange: 'Hoy ya comiste bastante, van opciones más livianas:',
};

interface ChatEngineResult {
  messages: ChatMessage[];
  hasProfile: boolean;
  handleOption: (option: ChatOption) => void;
  handleSelectDish: (dish: Dish) => void;
  handleServingsChange: (servings: number) => void;
  handleWaterChange: (delta: number) => void;
  currentServings: number;
  energyLevel: EnergyLevel;
  energyRatio: number;
  showCalories: boolean;
}

export function useChatEngine(): ChatEngineResult {
  const profile = useProfileStore((s) => s.profile);
  const getMetabolicResult = useProfileStore((s) => s.getMetabolicResult);
  const customIngredients = useIngredientsStore((s) => s.customIngredients);
  const dayPlans = useCalendarStore((s) => s.dayPlans);
  const upsertMeal = useCalendarStore((s) => s.upsertMeal);
  const setWater = useCalendarStore((s) => s.setWater);
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
  const remaining = computeRemainingBudget(todayPlan, budget, allIngredients);
  const energyLevel = getEnergyLevel(consumed, budget);
  const energyRatio = getEnergyRatio(consumed, budget);

  const [messages, setMessages] = useState<ChatMessage[]>(() => buildWelcomeMessages());
  const [, setStep] = useState<ChatStep>('welcome');
  const prevProfileRef = useRef(profile);

  // Reset chat when profile is created (null → value)
  useEffect(() => {
    if (!prevProfileRef.current && profile) {
      setMessages(buildWelcomeMessages());
      setStep('welcome');
    }
    prevProfileRef.current = profile;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);
  const [selectedMealType, setSelectedMealType] = useState<MealType | null>(null);
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [currentServings, setCurrentServings] = useState(1);
  const [suggestionOffset, setSuggestionOffset] = useState(0);

  function buildWelcomeMessages(): ChatMessage[] {
    const welcomeText: ChatMessage = {
      id: makeId(),
      type: 'assistant-text',
      text: profile
        ? `¡Hola${profile.name ? `, ${profile.name}` : ''}! ¿Qué querés comer?`
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

    const mealOptions: ChatOption[] = MEAL_TYPE_ORDER.map((mt) => ({
      id: `meal_${mt}`,
      label: `Quiero ${MEAL_TYPE_LABELS[mt].toLowerCase()}`,
      action: 'select_meal',
      payload: mt,
      icon: getMealIcon(mt),
    }));

    const extraOptions: ChatOption[] = [
      { id: 'day_summary', label: '¿Qué comí hoy?', action: 'day_summary', icon: 'CalendarDays' },
      { id: 'water', label: 'Registrar agua', action: 'water', icon: 'Droplets' },
    ];

    const optionsMsg: ChatMessage = {
      id: makeId(),
      type: 'assistant-options',
      options: [...mealOptions, ...extraOptions],
      timestamp: new Date().toISOString(),
    };

    return [welcomeText, optionsMsg];
  }

  function addMessages(...msgs: ChatMessage[]) {
    setMessages((prev) => [...prev, ...msgs]);
  }

  function getSuggestions(mealType: MealType, offset: number): Dish[] {
    const category = mealTypeToDishCategory(mealType);
    const all = matchDishes(DISHES_DB, allIngredients, {
      category,
      restrictions: profile?.restrictions,
      dislikedIngredientIds: profile?.dislikedIngredientIds,
      maxCalories: remaining > 0 ? remaining : undefined,
    });
    return all.slice(offset, offset + 4);
  }

  const handleOption = useCallback((option: ChatOption) => {
    const userChoice: ChatMessage = {
      id: makeId(),
      type: 'user-choice',
      text: option.label,
      timestamp: new Date().toISOString(),
    };

    switch (option.action) {
      case 'select_meal': {
        const mealType = option.payload as MealType;
        setSelectedMealType(mealType);
        setSuggestionOffset(0);
        setStep('meal_selected');

        const currentEnergyLevel = getEnergyLevel(
          computeDayConsumed(useCalendarStore.getState().dayPlans[todayKey()], allIngredients),
          budget,
        );

        const suggestions = getSuggestions(mealType, 0);

        const energyMsg: ChatMessage = {
          id: makeId(),
          type: 'assistant-energy',
          text: ENERGY_MESSAGES[currentEnergyLevel],
          timestamp: new Date().toISOString(),
        };

        if (suggestions.length === 0) {
          const noResults: ChatMessage = {
            id: makeId(),
            type: 'assistant-text',
            text: currentEnergyLevel === 'warm_orange'
              ? 'Hoy ya comiste bastante. ¡Tomá agua y descansá!'
              : 'No encontré sugerencias con tus filtros. Probá otra comida.',
            timestamp: new Date().toISOString(),
          };
          const backOption: ChatMessage = {
            id: makeId(),
            type: 'assistant-options',
            options: [
              { id: 'back', label: 'Volver', action: 'back_welcome', icon: 'ArrowLeft' },
            ],
            timestamp: new Date().toISOString(),
          };
          addMessages(userChoice, energyMsg, noResults, backOption);
          return;
        }

        const dishesMsg: ChatMessage = {
          id: makeId(),
          type: 'assistant-dishes',
          dishSuggestions: suggestions,
          timestamp: new Date().toISOString(),
        };

        const moreOptions: ChatOption[] = [
          { id: 'more', label: 'Mostrame más', action: 'show_more', icon: 'ChevronDown' },
          { id: 'back', label: 'Volver', action: 'back_welcome', icon: 'ArrowLeft' },
        ];

        const moreMsg: ChatMessage = {
          id: makeId(),
          type: 'assistant-options',
          options: moreOptions,
          timestamp: new Date().toISOString(),
        };

        addMessages(userChoice, energyMsg, dishesMsg, moreMsg);
        break;
      }

      case 'show_more': {
        if (!selectedMealType) return;
        const newOffset = suggestionOffset + 4;
        setSuggestionOffset(newOffset);

        const more = getSuggestions(selectedMealType, newOffset);

        if (more.length === 0) {
          const noMore: ChatMessage = {
            id: makeId(),
            type: 'assistant-text',
            text: 'No hay más sugerencias disponibles.',
            timestamp: new Date().toISOString(),
          };
          const backOpt: ChatMessage = {
            id: makeId(),
            type: 'assistant-options',
            options: [
              { id: 'back', label: 'Volver', action: 'back_welcome', icon: 'ArrowLeft' },
            ],
            timestamp: new Date().toISOString(),
          };
          addMessages(userChoice, noMore, backOpt);
          return;
        }

        const moreDishes: ChatMessage = {
          id: makeId(),
          type: 'assistant-dishes',
          dishSuggestions: more,
          timestamp: new Date().toISOString(),
        };

        const moreOpts: ChatMessage = {
          id: makeId(),
          type: 'assistant-options',
          options: [
            { id: 'more2', label: 'Mostrame más', action: 'show_more', icon: 'ChevronDown' },
            { id: 'back2', label: 'Volver', action: 'back_welcome', icon: 'ArrowLeft' },
          ],
          timestamp: new Date().toISOString(),
        };

        addMessages(userChoice, moreDishes, moreOpts);
        break;
      }

      case 'day_summary': {
        setStep('day_summary');
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
          text: meals.length > 0
            ? 'Así viene tu día:'
            : 'Todavía no registraste ninguna comida hoy.',
          daySummary: {
            meals,
            energyLevel: currentLevel,
            water: plan?.water ?? 0,
            waterGoal: plan?.waterGoal ?? 8,
          },
          timestamp: new Date().toISOString(),
        };

        const summaryOptions: ChatMessage = {
          id: makeId(),
          type: 'assistant-options',
          options: [
            { id: 'add_meal', label: 'Agregar una comida', action: 'back_welcome', icon: 'Plus' },
            { id: 'home', label: 'Inicio', action: 'back_welcome', icon: 'Home' },
          ],
          timestamp: new Date().toISOString(),
        };

        addMessages(userChoice, summaryMsg, summaryOptions);
        break;
      }

      case 'water': {
        setStep('water_tracking');
        const plan = useCalendarStore.getState().dayPlans[todayKey()];
        const waterMsg: ChatMessage = {
          id: makeId(),
          type: 'assistant-water',
          text: `Llevas ${plan?.water ?? 0} vasos de agua hoy.`,
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
        if (!selectedDish || !selectedMealType) return;
        setStep('confirmed');

        const mealType = selectedMealType;
        const dish = selectedDish;
        const servings = currentServings;

        const entries = dish.ingredients.map((di) => ({
          ingredientId: di.ingredientId,
          grams: Math.round(di.grams * servings),
        }));

        const macros = computeDishMacros(dish, allIngredients);
        const totalCals = Math.round(macros.calories * servings);

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

        const nextOptions: ChatMessage = {
          id: makeId(),
          type: 'assistant-options',
          options: [
            { id: 'add_another', label: 'Agregar otra comida', action: 'back_welcome', icon: 'Plus' },
            { id: 'view_day', label: 'Ver mi día', action: 'day_summary', icon: 'CalendarDays' },
            { id: 'home2', label: 'Inicio', action: 'back_welcome', icon: 'Home' },
          ],
          timestamp: new Date().toISOString(),
        };

        addMessages(userChoice, confirmText, nextOptions);

        setSelectedDish(null);
        setSelectedMealType(null);
        break;
      }

      case 'choose_another': {
        if (!selectedMealType) {
          handleOption({ id: 'back', label: 'Volver', action: 'back_welcome' });
          return;
        }
        setStep('meal_selected');
        setSuggestionOffset(0);
        setSelectedDish(null);

        const suggestions = getSuggestions(selectedMealType, 0);

        const textMsg: ChatMessage = {
          id: makeId(),
          type: 'assistant-text',
          text: 'Dale, acá van otras opciones:',
          timestamp: new Date().toISOString(),
        };

        const dishesMsg: ChatMessage = {
          id: makeId(),
          type: 'assistant-dishes',
          dishSuggestions: suggestions,
          timestamp: new Date().toISOString(),
        };

        const moreOpts: ChatMessage = {
          id: makeId(),
          type: 'assistant-options',
          options: [
            { id: 'more3', label: 'Mostrame más', action: 'show_more', icon: 'ChevronDown' },
            { id: 'back3', label: 'Volver', action: 'back_welcome', icon: 'ArrowLeft' },
          ],
          timestamp: new Date().toISOString(),
        };

        addMessages(userChoice, textMsg, dishesMsg, moreOpts);
        break;
      }

      case 'back_welcome': {
        setStep('welcome');
        setSelectedMealType(null);
        setSelectedDish(null);
        setSuggestionOffset(0);

        const welcome = buildWelcomeMessages();
        addMessages(userChoice, ...welcome);
        break;
      }

      default:
        break;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMealType, selectedDish, currentServings, profile, allIngredients, budget, remaining, suggestionOffset]);

  const handleSelectDish = useCallback((dish: Dish) => {
    setSelectedDish(dish);
    setCurrentServings(dish.defaultServings);
    setStep('dish_selected');

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
        { id: 'other', label: 'Elegir otro', action: 'choose_another', icon: 'ArrowLeft' },
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
            updated[i] = {
              ...updated[i],
              servings,
              humanIngredients,
            };
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
            text: `Llevas ${newVal} vasos de agua hoy.`,
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

  return {
    messages,
    hasProfile: !!profile,
    handleOption,
    handleSelectDish,
    handleServingsChange,
    handleWaterChange,
    currentServings,
    energyLevel,
    energyRatio,
    showCalories,
  };
}

function getMealIcon(mealType: MealType): string {
  switch (mealType) {
    case 'desayuno': return 'Coffee';
    case 'almuerzo': return 'UtensilsCrossed';
    case 'cena': return 'Moon';
    case 'snack': return 'Cookie';
  }
}
