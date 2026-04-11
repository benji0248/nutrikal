import { CalendarCheck, RefreshCw } from 'lucide-react';
import type { WeekPlan, MealType } from '../../types';
import { PlanReviewGrid } from './PlanReviewGrid';
import { JOURNAL } from '../assistant/journalTokens';

interface WeekPlannerProps {
  plan: WeekPlan;
  onApply: (plan: WeekPlan) => void;
  onRegenerate: () => void;
  onSwapMeal: (date: string, mealType: MealType) => void;
}

export const WeekPlanner = ({ plan, onApply, onRegenerate, onSwapMeal }: WeekPlannerProps) => {
  return (
    <div
      className="overflow-hidden rounded-[2rem]"
      style={{
        backgroundColor: JOURNAL.surfaceElevated,
        boxShadow: JOURNAL.ambientShadow,
      }}
    >
      <div className="space-y-4 p-4">
        <div className="flex items-center gap-2">
          <CalendarCheck size={18} strokeWidth={1.75} style={{ color: JOURNAL.primary }} />
          <h3 className="font-heading text-sm font-bold" style={{ color: JOURNAL.primary }}>
            Tu plan semanal
          </h3>
        </div>

        <PlanReviewGrid plan={plan} onSwapMeal={onSwapMeal} />
      </div>

      <div
        className="sticky bottom-0 flex gap-2 p-4 pt-3 backdrop-blur-md"
        style={{ backgroundColor: 'rgba(255,255,255,0.92)' }}
      >
        <button
          type="button"
          onClick={() => onApply(plan)}
          className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-full px-4 py-3 font-body text-sm font-semibold text-white transition-all active:scale-[0.98]"
          style={{ backgroundColor: JOURNAL.primary }}
        >
          <CalendarCheck size={16} />
          Aplicar al calendario
        </button>
        <button
          type="button"
          onClick={onRegenerate}
          className="flex min-h-[48px] items-center justify-center gap-2 rounded-full px-4 py-3 font-body text-sm font-medium transition-all active:scale-[0.98]"
          style={{
            backgroundColor: JOURNAL.surfaceLow,
            color: JOURNAL.onSurface,
          }}
        >
          <RefreshCw size={16} />
          Regenerar
        </button>
      </div>
    </div>
  );
};
