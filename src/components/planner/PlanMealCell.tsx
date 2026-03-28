import { useState } from 'react';
import { RefreshCw, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import type { PlannedMeal, MealType } from '../../types';
import { MEAL_TYPE_LABELS } from '../../types';

interface PlanMealCellProps {
  meal: PlannedMeal | undefined;
  mealType: MealType;
  date: string;
  showCalories: boolean;
  onSwap: (date: string, mealType: MealType) => void;
}

export const PlanMealCell = ({ meal, mealType, date, showCalories, onSwap }: PlanMealCellProps) => {
  const [expanded, setExpanded] = useState(false);

  if (!meal) {
    return (
      <div className="bg-surface2/30 rounded-xl p-3 min-h-[56px] flex items-center">
        <span className="text-xs font-body text-muted">
          {MEAL_TYPE_LABELS[mealType]} — sin plato
        </span>
      </div>
    );
  }

  return (
    <div className="bg-surface2/40 rounded-xl overflow-hidden">
      <div className="p-3">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="min-w-0 flex-1 text-left flex items-center gap-2"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-body font-medium text-text-primary">
                {meal.name}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                {meal.humanPortion && (
                  <span className="text-xs font-body text-muted">
                    {meal.humanPortion}
                  </span>
                )}
                {meal.prepMinutes != null && meal.prepMinutes > 0 && (
                  <span className="flex items-center gap-0.5 text-xs font-body text-muted">
                    <Clock size={11} />
                    {meal.prepMinutes}′
                  </span>
                )}
                {showCalories && (
                  <span className="text-xs font-mono text-accent">{meal.totalKcal} kcal</span>
                )}
              </div>
            </div>
            {expanded ? (
              <ChevronUp size={14} className="text-muted shrink-0" />
            ) : (
              <ChevronDown size={14} className="text-muted shrink-0" />
            )}
          </button>
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

      {expanded && meal.ingredients.length > 0 && (
        <div className="px-3 pb-3 pt-1 border-t border-border/20">
          <ul className="space-y-1">
            {meal.ingredients.map((ing, idx) => (
              <li key={idx} className="flex items-baseline justify-between gap-2 text-xs font-body">
                <span className="text-text-primary">{ing.name}</span>
                <span className="text-muted flex-shrink-0">
                  {ing.grams}g
                  {showCalories && <span className="font-mono ml-1.5 text-muted/70">{ing.kcal}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
