import { RefreshCw, Clock } from 'lucide-react';
import type { Dish, MealType } from '../../types';
import { MEAL_TYPE_LABELS } from '../../types';

interface PlanMealCellProps {
  dish: Dish | undefined;
  mealType: MealType;
  date: string;
  servings: number;
  onSwap: (date: string, mealType: MealType) => void;
}

export const PlanMealCell = ({ dish, mealType, date, servings, onSwap }: PlanMealCellProps) => {
  if (!dish) {
    return (
      <div className="bg-surface2/30 rounded-xl p-3 min-h-[56px] flex items-center">
        <span className="text-xs font-body text-muted">
          {MEAL_TYPE_LABELS[mealType]} — sin plato
        </span>
      </div>
    );
  }

  return (
    <div className="bg-surface2/40 rounded-xl p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-body font-medium text-text-primary">
            {dish.name}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs font-body text-muted">
              {servings > 1 ? `x${servings} · ` : ''}{dish.humanPortion}
            </span>
            {dish.prepMinutes > 0 && (
              <span className="flex items-center gap-0.5 text-xs font-body text-muted">
                <Clock size={11} />
                {dish.prepMinutes}′
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onSwap(date, mealType)}
          className="w-10 h-10 rounded-xl bg-surface2 flex items-center justify-center text-muted hover:text-accent hover:bg-accent/10 transition-colors shrink-0"
          aria-label={`Cambiar ${MEAL_TYPE_LABELS[mealType]}`}
        >
          <RefreshCw size={16} />
        </button>
      </div>
    </div>
  );
};
