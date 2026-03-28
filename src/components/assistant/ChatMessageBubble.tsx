import { Loader2, Droplets } from 'lucide-react';
import type { ChatMessage, ChatOption, EnergyLevel, Ingredient, MealType, WeekPlan } from '../../types';
import { MEAL_TYPE_LABELS } from '../../types';
import { OptionChips } from './OptionChips';
import { DayEnergyBar } from './DayEnergyBar';
import { WeekPlanner } from '../planner/WeekPlanner';
import { PlanAppliedView } from '../planner/PlanAppliedView';

interface ChatMessageBubbleProps {
  message: ChatMessage;
  onOptionSelect: (option: ChatOption) => void;
  onApplyPlan: (plan: WeekPlan) => void;
  onRegeneratePlan: () => void;
  onSwapMeal: (date: string, mealType: MealType) => void;
  energyLevel: EnergyLevel;
  energyRatio: number;
  showCalories: boolean;
  allIngredients: Ingredient[];
}

export const ChatMessageBubble = ({
  message,
  onOptionSelect,
  onApplyPlan,
  onRegeneratePlan,
  onSwapMeal,
  energyRatio,
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

    case 'user-text':
    case 'user-choice':
      return (
        <div className="flex justify-end animate-fade-in">
          <div className="max-w-[75%] bg-accent/15 rounded-2xl rounded-tr-md px-4 py-3">
            <p className="text-sm font-body font-medium text-accent">{message.text}</p>
          </div>
        </div>
      );

    // Only used for "Create profile" button when no profile exists
    case 'assistant-options':
      if (!message.options) return null;
      return (
        <div className="animate-fade-in">
          <OptionChips options={message.options} onSelect={onOptionSelect} />
        </div>
      );

    case 'assistant-dishes':
      return (
        <div className="space-y-2 animate-fade-in">
          {message.dishSuggestions?.map((dish) => (
            <div key={dish.id} className="bg-surface2/40 rounded-2xl px-4 py-3">
              <p className="text-sm font-body font-medium text-text-primary">{dish.name}</p>
              <p className="text-xs font-body text-muted mt-0.5">
                {dish.humanPortion} · {dish.prepMinutes > 0 ? `${dish.prepMinutes} min` : 'Listo'}
              </p>
              {message.dishReasons?.[dish.id] && (
                <p className="text-xs font-body text-muted mt-1 italic">
                  {message.dishReasons[dish.id]}
                </p>
              )}
            </div>
          ))}
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
              <DayEnergyBar level={message.daySummary.energyLevel} ratio={energyRatio} />
            )}

            {message.daySummary && (
              <div className="flex items-center gap-2 text-sm font-body text-muted">
                <Droplets size={14} className="text-pink" />
                <span>{message.daySummary.water} / {message.daySummary.waterGoal} vasos</span>
              </div>
            )}
          </div>
        </div>
      );

    default:
      return null;
  }
};
