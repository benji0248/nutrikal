import { Loader2, Clock, Bot } from 'lucide-react';
import type { ChatMessage, ChatOption, EnergyLevel, MealType, WeekPlan } from '../../types';
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
  /** Mientras el modelo responde: desactiva chips y acciones del plan que disparan otro mensaje. */
  chatBusy?: boolean;
}

export const ChatMessageBubble = ({
  message,
  onOptionSelect,
  onApplyPlan,
  onRegeneratePlan,
  onSwapMeal,
  energyRatio,
  chatBusy = false,
}: ChatMessageBubbleProps) => {
  switch (message.type) {
    case 'assistant-text':
      return (
        <div className="flex mr-12 items-start gap-3 animate-fade-in">
          <div className="w-8 h-8 rounded-full bg-[#226046] flex items-center justify-center flex-shrink-0 text-white">
            <Bot size={16} />
          </div>
          <div className="bg-[#f3f5eb] text-[#191c17] rounded-t-xl rounded-br-xl px-5 py-3 shadow-sm">
            <p className="whitespace-pre-wrap font-body text-sm leading-relaxed">{message.text}</p>
          </div>
        </div>
      );

    case 'assistant-loading':
      return (
        <div className="flex mr-12 items-start gap-3 animate-fade-in">
          <div className="w-8 h-8 rounded-full bg-[#226046] flex items-center justify-center flex-shrink-0 text-white">
            <Bot size={16} />
          </div>
          <div className="bg-[#f3f5eb] text-[#191c17] rounded-t-xl rounded-br-xl px-5 py-3 shadow-sm flex items-center gap-2">
            <Loader2 size={16} className="animate-spin shrink-0 text-[#226046]" />
            <span className="font-body text-sm font-medium">Pensando...</span>
          </div>
        </div>
      );

    case 'user-text':
    case 'user-choice':
      return (
        <div className="flex justify-end ml-12 animate-fade-in">
          <div className="bg-[#3d795d] text-[#c1ffdd] rounded-t-xl rounded-bl-xl px-5 py-3 shadow-sm">
            <p className="font-body text-sm font-medium leading-relaxed">{message.text}</p>
          </div>
        </div>
      );

    case 'assistant-options':
      if (!message.options) return null;
      return (
        <div className="animate-fade-in">
          <OptionChips options={message.options} onSelect={onOptionSelect} disabled={chatBusy} />
        </div>
      );

    case 'assistant-meals':
      return (
        <div className="animate-fade-in space-y-2">
          {message.mealSuggestions?.map((meal, idx) => (
            <div
              key={idx}
              className="rounded-2xl px-4 py-3 bg-[#f8faf1] shadow-sm ml-12"
            >
              <p className="font-body text-sm font-medium text-[#191c17]">
                {meal.name}
              </p>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="font-body text-xs text-[#707a6c]">
                  {meal.ingredients.length} ingredientes
                </span>
                {meal.prepMinutes != null && meal.prepMinutes > 0 && (
                  <span className="flex items-center gap-0.5 font-body text-xs text-[#707a6c]">
                    <Clock size={11} />
                    {meal.prepMinutes} min
                  </span>
                )}
              </div>
              {meal.reason && (
                <p className="mt-1 font-body text-xs italic text-[#707a6c]">
                  {meal.reason}
                </p>
              )}
            </div>
          ))}
        </div>
      );

    case 'assistant-plan':
      if (!message.weekPlan) return null;
      return (
        <div className="w-full animate-fade-in">
          <WeekPlanner
            plan={message.weekPlan}
            onApply={onApplyPlan}
            onRegenerate={onRegeneratePlan}
            onSwapMeal={onSwapMeal}
            planAiBusy={chatBusy}
          />
        </div>
      );

    case 'assistant-applied':
      return (
        <div className="w-full animate-fade-in">
          <PlanAppliedView />
        </div>
      );

    case 'assistant-summary':
      return (
        <div className="flex mr-12 items-start gap-3 animate-fade-in">
          <div className="w-8 h-8 rounded-full bg-[#226046] flex flex-shrink-0 items-center justify-center text-[#ffffff]">
            <Bot size={16} />
          </div>
          <div className="space-y-3 rounded-t-xl rounded-br-xl px-5 py-3 shadow-sm bg-[#f3f5eb]">
            {message.text && (
              <p className="font-body text-sm leading-relaxed text-[#191c17]">
                {message.text}
              </p>
            )}

            {message.daySummary && message.daySummary.meals.length > 0 && (
              <div className="space-y-1.5">
                {message.daySummary.meals.map((m, idx) => (
                  <div key={idx} className="flex items-center gap-2 font-body text-sm">
                    <span className="w-20 text-xs text-[#707a6c]">
                      {MEAL_TYPE_LABELS[m.mealType]}
                    </span>
                    <span className="text-[#191c17]">{m.name}</span>
                  </div>
                ))}
              </div>
            )}

            {message.daySummary && (
              <DayEnergyBar level={message.daySummary.energyLevel} ratio={energyRatio} />
            )}
          </div>
        </div>
      );

    default:
      return null;
  }
};
