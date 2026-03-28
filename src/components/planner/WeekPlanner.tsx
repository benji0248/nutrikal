import { CalendarCheck, RefreshCw } from 'lucide-react';
import type { WeekPlan, MealType } from '../../types';
import { PlanReviewGrid } from './PlanReviewGrid';

interface WeekPlannerProps {
  plan: WeekPlan;
  onApply: (plan: WeekPlan) => void;
  onRegenerate: () => void;
  onSwapMeal: (date: string, mealType: MealType) => void;
}

export const WeekPlanner = ({ plan, onApply, onRegenerate, onSwapMeal }: WeekPlannerProps) => {
  return (
    <div className="bg-surface2/30 rounded-2xl overflow-hidden">
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <CalendarCheck size={18} className="text-accent" />
          <h3 className="text-sm font-heading font-bold text-text-primary">
            Tu plan semanal
          </h3>
        </div>

        <PlanReviewGrid plan={plan} onSwapMeal={onSwapMeal} />
      </div>

      <div className="sticky bottom-0 flex gap-2 p-4 pt-3 bg-surface2/60 backdrop-blur-sm border-t border-border/30">
        <button
          type="button"
          onClick={() => onApply(plan)}
          className="flex-1 flex items-center justify-center gap-2 bg-accent text-white rounded-2xl px-4 py-3 text-sm font-body font-medium transition-all active:scale-95 min-h-[48px]"
        >
          <CalendarCheck size={16} />
          Aplicar al calendario
        </button>
        <button
          type="button"
          onClick={onRegenerate}
          className="flex items-center justify-center gap-2 bg-surface2 text-text-primary rounded-2xl px-4 py-3 text-sm font-body font-medium transition-all active:scale-95 min-h-[48px]"
        >
          <RefreshCw size={16} />
          Regenerar
        </button>
      </div>
    </div>
  );
};
