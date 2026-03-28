import { useState } from 'react';
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
  const [expanded, setExpanded] = useState(false);

  if (!dish) {
    return (
      <div className="bg-surface2/30 rounded-xl p-3 min-h-[60px] flex items-center">
        <span className="text-xs font-body text-muted">
          {MEAL_TYPE_LABELS[mealType]} — sin plato
        </span>
      </div>
    );
  }

  return (
    <div className="bg-surface2/40 rounded-xl p-3 space-y-1.5" title={dish.name}>
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="min-w-0 flex-1 text-left"
        >
          <p className={`text-xs font-body font-medium text-text-primary ${expanded ? '' : 'line-clamp-2'} md:truncate`}>
            {dish.name}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] font-body text-muted">
              {servings > 1 ? `x${servings} · ` : ''}{dish.humanPortion}
            </span>
            {dish.prepMinutes > 0 && (
              <span className="flex items-center gap-0.5 text-[11px] font-body text-muted">
                <Clock size={10} />
                {dish.prepMinutes}′
              </span>
            )}
          </div>
        </button>
        <button
          type="button"
          onClick={() => onSwap(date, mealType)}
          className="w-8 h-8 rounded-xl bg-surface2 flex items-center justify-center text-muted hover:text-accent transition-colors shrink-0"
          aria-label={`Cambiar ${MEAL_TYPE_LABELS[mealType]}`}
        >
          <RefreshCw size={14} />
        </button>
      </div>
    </div>
  );
};
