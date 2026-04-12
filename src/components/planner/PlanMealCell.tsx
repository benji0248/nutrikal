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
  swapDisabled?: boolean;
}

export const PlanMealCell = ({
  meal,
  mealType,
  date,
  showCalories,
  onSwap,
  swapDisabled = false,
}: PlanMealCellProps) => {
  const [expanded, setExpanded] = useState(false);

  if (!meal) {
    return (
      <div className="mt-1 flex min-h-[56px] items-center rounded-2xl p-3 bg-[#f8faf1]">
        <span className="font-body text-xs text-[#707a6c]">
          {MEAL_TYPE_LABELS[mealType]} — sin plato
        </span>
      </div>
    );
  }

  return (
    <div className="mt-1 overflow-hidden rounded-2xl bg-[#f8faf1]">
      <div className="p-3">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
          >
            <div className="min-w-0 flex-1">
              <p className="font-body text-sm font-medium text-[#191c17]">
                {meal.name}
              </p>
              <div className="mt-0.5 flex items-center gap-2">
                {meal.humanPortion && (
                  <span className="font-body text-xs text-[#707a6c]">
                    {meal.humanPortion}
                  </span>
                )}
                {meal.prepMinutes != null && meal.prepMinutes > 0 && (
                  <span className="flex items-center gap-0.5 font-body text-xs text-[#707a6c]">
                    <Clock size={11} />
                    {meal.prepMinutes}′
                  </span>
                )}
                {showCalories && (
                  <span className="font-mono text-xs text-[#226046]">
                    {meal.totalKcal} kcal
                  </span>
                )}
              </div>
            </div>
            {expanded ? (
              <ChevronUp size={14} className="shrink-0 text-[#707a6c]" />
            ) : (
              <ChevronDown size={14} className="shrink-0 text-[#707a6c]" />
            )}
          </button>
          <button
            type="button"
            disabled={swapDisabled}
            onClick={() => onSwap(date, mealType)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors bg-[#226046]/10 text-[#226046] hover:bg-[#226046]/20 disabled:opacity-40 disabled:pointer-events-none"
            aria-label={`Cambiar ${MEAL_TYPE_LABELS[mealType]}`}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {expanded && meal.ingredients.length > 0 && (
        <div className="border-t border-black/[0.06] px-3 pb-3 pt-2">
          <ul className="space-y-1">
            {meal.ingredients.map((ing, idx) => (
              <li key={idx} className="flex items-baseline justify-between gap-2 font-body text-xs">
                <span className="text-[#191c17]">{ing.name}</span>
                <span className="flex-shrink-0 text-[#707a6c]">
                  {ing.grams}g
                  {showCalories && (
                    <span className="ml-1.5 font-mono opacity-80">{ing.kcal}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
