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
    <div className="w-full bg-[#ffffff] rounded-lg overflow-hidden shadow-[0px_20px_40px_rgba(25,28,23,0.06)] animate-fade-in">
      <div className="p-6 bg-[#226046]/5">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-heading font-bold text-xl text-[#226046]">Plan Semanal</h3>
          <span className="bg-[#fd9d1a]/20 text-[#663b00] px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">Activo</span>
        </div>

        <PlanReviewGrid plan={plan} onSwapMeal={onSwapMeal} />

        <button
          type="button"
          onClick={() => onApply(plan)}
          className="w-full mt-6 bg-[#226046] text-[#ffffff] font-bold py-4 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
        >
          <CalendarCheck size={18} />
          <span>Aplicar al calendario</span>
        </button>

        <button
          type="button"
          onClick={onRegenerate}
          className="w-full mt-2 bg-[#f3f5eb] text-[#191c17] font-bold py-4 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
        >
          <RefreshCw size={18} />
          <span>Regenerar Plan</span>
        </button>
      </div>
    </div>
  );
};
