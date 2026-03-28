import { Minus, Plus, Droplets, Loader2 } from 'lucide-react';
import type { ChatMessage, ChatOption, Dish, EnergyLevel, Ingredient, MealType, WeekPlan } from '../../types';
import { MEAL_TYPE_LABELS } from '../../types';
import { OptionChips } from './OptionChips';
import { DishCard } from './DishCard';
import { RecipeCard } from './RecipeCard';
import { DayEnergyBar } from './DayEnergyBar';
import { WeekPlanner } from '../planner/WeekPlanner';
import { PlanAppliedView } from '../planner/PlanAppliedView';

interface ChatMessageBubbleProps {
  message: ChatMessage;
  onOptionSelect: (option: ChatOption) => void;
  onDishSelect: (dish: Dish) => void;
  onServingsChange: (servings: number) => void;
  onWaterChange: (delta: number) => void;
  onApplyPlan: (plan: WeekPlan) => void;
  onRegeneratePlan: () => void;
  onSwapMeal: (date: string, mealType: MealType) => void;
  energyLevel: EnergyLevel;
  energyRatio: number;
  showCalories: boolean;
  allIngredients: Ingredient[];
  isLast: boolean;
}

export const ChatMessageBubble = ({
  message,
  onOptionSelect,
  onDishSelect,
  onServingsChange,
  onWaterChange,
  onApplyPlan,
  onRegeneratePlan,
  onSwapMeal,
  energyLevel,
  energyRatio,
  showCalories,
  allIngredients,
  isLast,
}: ChatMessageBubbleProps) => {
  switch (message.type) {
    case 'assistant-text':
      return (
        <div className="max-w-[85%] animate-fade-in">
          <div className="bg-surface2/40 rounded-2xl rounded-tl-md px-4 py-3">
            <p className="text-sm font-body text-text-primary whitespace-pre-wrap">{message.text}</p>
          </div>
        </div>
      );

    case 'assistant-loading':
      return (
        <div className="max-w-[85%] animate-fade-in">
          <div className="bg-surface2/40 rounded-2xl rounded-tl-md px-4 py-3 flex items-center gap-2">
            <Loader2 size={16} className="text-accent animate-spin" />
            <span className="text-sm font-body text-muted">Pensando...</span>
          </div>
        </div>
      );

    case 'assistant-energy':
      return (
        <div className="max-w-[85%] space-y-2 animate-fade-in">
          <div className="bg-surface2/40 rounded-2xl rounded-tl-md px-4 py-3">
            <p className="text-sm font-body text-text-primary mb-3">{message.text}</p>
            <DayEnergyBar level={energyLevel} ratio={energyRatio} />
          </div>
        </div>
      );

    case 'user-text':
    case 'user-choice':
      return (
        <div className="flex justify-end animate-fade-in">
          <div className="max-w-[75%] bg-accent/15 rounded-2xl rounded-tr-md px-4 py-3">
            <p className="text-sm font-body font-medium text-accent">{message.text}</p>
          </div>
        </div>
      );

    case 'assistant-options':
      if (!message.options || !isLast) return null;
      return (
        <div className="animate-fade-in">
          <OptionChips options={message.options} onSelect={onOptionSelect} />
        </div>
      );

    case 'assistant-dishes':
      return (
        <div className="space-y-2 animate-fade-in">
          {message.dishSuggestions?.map((dish) => (
            <div key={dish.id}>
              <DishCard dish={dish} onClick={onDishSelect} compact />
              {message.dishReasons?.[dish.id] && (
                <p className="text-xs font-body text-muted mt-1 ml-2">
                  {message.dishReasons[dish.id]}
                </p>
              )}
            </div>
          ))}
        </div>
      );

    case 'assistant-recipe':
      if (!message.selectedDish) return null;
      return (
        <div className="animate-fade-in">
          <RecipeCard
            dish={message.selectedDish}
            servings={message.servings ?? 1}
            onServingsChange={onServingsChange}
            humanIngredients={message.humanIngredients ?? []}
            energyLevel={energyLevel}
            showCalories={showCalories}
            allIngredients={allIngredients}
          />
        </div>
      );

    case 'assistant-plan':
      if (!message.weekPlan) return null;
      return (
        <div className="animate-fade-in w-full">
          <WeekPlanner
            plan={message.weekPlan}
            onApply={onApplyPlan}
            onRegenerate={onRegeneratePlan}
            onSwapMeal={onSwapMeal}
          />
        </div>
      );

    case 'assistant-applied':
      if (!message.weekPlan) return null;
      return (
        <div className="animate-fade-in w-full">
          <PlanAppliedView />
        </div>
      );

    case 'assistant-summary':
      return (
        <div className="max-w-[85%] animate-fade-in">
          <div className="bg-surface2/40 rounded-2xl rounded-tl-md px-4 py-3 space-y-3">
            {message.text && (
              <p className="text-sm font-body text-text-primary">{message.text}</p>
            )}

            {message.daySummary && message.daySummary.meals.length > 0 && (
              <div className="space-y-1.5">
                {message.daySummary.meals.map((m, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm font-body">
                    <span className="text-muted text-xs w-20">
                      {MEAL_TYPE_LABELS[m.mealType]}
                    </span>
                    <span className="text-text-primary">{m.name}</span>
                  </div>
                ))}
              </div>
            )}

            {message.daySummary && (
              <DayEnergyBar
                level={message.daySummary.energyLevel}
                ratio={energyRatio}
              />
            )}

            {message.daySummary && (
              <div className="flex items-center gap-2 text-sm font-body text-muted">
                <Droplets size={14} className="text-pink" />
                <span>
                  {message.daySummary.water} / {message.daySummary.waterGoal} vasos
                </span>
              </div>
            )}
          </div>
        </div>
      );

    case 'assistant-water':
      return (
        <div className="max-w-[85%] animate-fade-in">
          <div className="bg-surface2/40 rounded-2xl rounded-tl-md px-4 py-4 space-y-3">
            <p className="text-sm font-body text-text-primary">{message.text}</p>

            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => onWaterChange(-1)}
                className="w-12 h-12 rounded-2xl bg-surface2 flex items-center justify-center text-text-primary hover:bg-surface2/80 transition-all"
              >
                <Minus size={20} />
              </button>

              <div className="flex items-center gap-2">
                <Droplets size={24} className="text-pink" />
                <span className="text-2xl font-body font-bold text-text-primary">
                  {message.daySummary?.water ?? 0}
                </span>
                <span className="text-sm font-body text-muted">
                  / {message.daySummary?.waterGoal ?? 8}
                </span>
              </div>

              <button
                type="button"
                onClick={() => onWaterChange(1)}
                className="w-12 h-12 rounded-2xl bg-surface2 flex items-center justify-center text-text-primary hover:bg-surface2/80 transition-all"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
};
