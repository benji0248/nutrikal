import { Loader2, Clock } from 'lucide-react';
import type { ChatMessage, ChatOption, EnergyLevel, MealType, WeekPlan } from '../../types';
import { MEAL_TYPE_LABELS } from '../../types';
import { OptionChips } from './OptionChips';
import { DayEnergyBar } from './DayEnergyBar';
import { WeekPlanner } from '../planner/WeekPlanner';
import { PlanAppliedView } from '../planner/PlanAppliedView';
import { JOURNAL } from './journalTokens';

interface ChatMessageBubbleProps {
  message: ChatMessage;
  onOptionSelect: (option: ChatOption) => void;
  onApplyPlan: (plan: WeekPlan) => void;
  onRegeneratePlan: () => void;
  onSwapMeal: (date: string, mealType: MealType) => void;
  energyLevel: EnergyLevel;
  energyRatio: number;
  showCalories: boolean;
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
          <div
            className="rounded-[1.25rem] rounded-tl-md px-4 py-3"
            style={{
              backgroundColor: JOURNAL.surfaceElevated,
              boxShadow: JOURNAL.ambientShadow,
              color: JOURNAL.onSurface,
            }}
          >
            <p className="whitespace-pre-wrap font-body text-sm leading-relaxed">{message.text}</p>
          </div>
        </div>
      );

    case 'assistant-loading':
      return (
        <div className="max-w-[85%] animate-fade-in">
          <div
            className="flex items-center gap-2 rounded-[1.25rem] rounded-tl-md px-4 py-3"
            style={{
              backgroundColor: JOURNAL.surfaceLow,
              color: JOURNAL.muted,
            }}
          >
            <Loader2 size={16} className="animate-spin shrink-0" style={{ color: JOURNAL.primary }} />
            <span className="font-body text-sm">Pensando...</span>
          </div>
        </div>
      );

    case 'user-text':
    case 'user-choice':
      return (
        <div className="flex animate-fade-in justify-end">
          <div
            className="max-w-[75%] rounded-[1.25rem] rounded-tr-md px-4 py-3"
            style={{ backgroundColor: JOURNAL.primary, color: JOURNAL.onPrimary }}
          >
            <p className="font-body text-sm font-medium leading-relaxed">{message.text}</p>
          </div>
        </div>
      );

    case 'assistant-options':
      if (!message.options) return null;
      return (
        <div className="animate-fade-in">
          <OptionChips options={message.options} onSelect={onOptionSelect} />
        </div>
      );

    case 'assistant-meals':
      return (
        <div className="animate-fade-in space-y-2">
          {message.mealSuggestions?.map((meal, idx) => (
            <div
              key={idx}
              className="rounded-[1.25rem] px-4 py-3"
              style={{
                backgroundColor: JOURNAL.surfaceElevated,
                boxShadow: JOURNAL.ambientShadow,
              }}
            >
              <p className="font-body text-sm font-medium" style={{ color: JOURNAL.onSurface }}>
                {meal.name}
              </p>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="font-body text-xs" style={{ color: JOURNAL.muted }}>
                  {meal.ingredients.length} ingredientes
                </span>
                {meal.prepMinutes != null && meal.prepMinutes > 0 && (
                  <span className="flex items-center gap-0.5 font-body text-xs" style={{ color: JOURNAL.muted }}>
                    <Clock size={11} />
                    {meal.prepMinutes} min
                  </span>
                )}
              </div>
              {meal.reason && (
                <p className="mt-1 font-body text-xs italic" style={{ color: JOURNAL.muted }}>
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
        <div className="max-w-[85%] animate-fade-in">
          <div
            className="space-y-3 rounded-[1.25rem] rounded-tl-md px-4 py-3"
            style={{
              backgroundColor: JOURNAL.surfaceElevated,
              boxShadow: JOURNAL.ambientShadow,
            }}
          >
            {message.text && (
              <p className="font-body text-sm leading-relaxed" style={{ color: JOURNAL.onSurface }}>
                {message.text}
              </p>
            )}

            {message.daySummary && message.daySummary.meals.length > 0 && (
              <div className="space-y-1.5">
                {message.daySummary.meals.map((m, idx) => (
                  <div key={idx} className="flex items-center gap-2 font-body text-sm">
                    <span className="w-20 text-xs" style={{ color: JOURNAL.muted }}>
                      {MEAL_TYPE_LABELS[m.mealType]}
                    </span>
                    <span style={{ color: JOURNAL.onSurface }}>{m.name}</span>
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
