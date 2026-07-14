import { useState, useMemo } from 'react';
import { RefreshCw, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import type { PlannedMeal, MealType } from '../../types';
import { MEAL_TYPE_LABELS } from '../../types';
import { INGREDIENTS_DB } from '../../data/ingredients';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useIngredientsStore } from '../../store/useIngredientsStore';
import {
  formatNamedIngredientPortion,
  getMealWeightLabel,
  formatMealWeightLabel,
} from '../../utils/portionHelpers';
import { MEAL_WEIGHT_BADGE } from '../assistant/journalTokens';

interface PlanMealCellProps {
  meal: PlannedMeal | undefined;
  mealType: MealType;
  date: string;
  showCalories: boolean;
  mealSlotBudgetKcal?: number;
  onSwap: (date: string, mealType: MealType) => void;
  swapDisabled?: boolean;
}

export const PlanMealCell = ({
  meal,
  mealType,
  date,
  showCalories,
  mealSlotBudgetKcal,
  onSwap,
  swapDisabled = false,
}: PlanMealCellProps) => {
  const [expanded, setExpanded] = useState(false);
  const useGrams = useSettingsStore((s) => s.useGrams);
  const customIngredients = useIngredientsStore((s) => s.customIngredients);
  const allIngredients = useMemo(
    () => [...INGREDIENTS_DB, ...customIngredients],
    [customIngredients],
  );

  if (!meal) {
    return (
      <div className="mt-1 flex min-h-[56px] items-center rounded-2xl bg-[#f8faf1] p-3">
        <span className="font-body text-xs text-[#707a6c]">
          {MEAL_TYPE_LABELS[mealType]} — sin plato
        </span>
      </div>
    );
  }

  const weightKey =
    mealSlotBudgetKcal && meal.totalKcal > 0
      ? getMealWeightLabel(meal.totalKcal, mealSlotBudgetKcal)
      : null;
  const weightBadge = weightKey ? MEAL_WEIGHT_BADGE[weightKey] : null;

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
              <p className="font-body text-sm font-medium text-[#191c17]">{meal.name}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                {meal.humanPortion && (
                  <span className="font-body text-xs text-[#707a6c]">{meal.humanPortion}</span>
                )}
                {!showCalories && weightBadge && (
                  <span
                    className="rounded-full px-2 py-0.5 font-body text-[10px] font-semibold"
                    style={{ backgroundColor: weightBadge.bg, color: weightBadge.text }}
                  >
                    {formatMealWeightLabel(weightKey!)}
                  </span>
                )}
                {meal.prepMinutes != null && meal.prepMinutes > 0 && (
                  <span className="flex items-center gap-0.5 font-body text-xs text-[#707a6c]">
                    <Clock size={11} />
                    {meal.prepMinutes}′
                  </span>
                )}
                {showCalories && (
                  <span className="font-mono text-xs text-[#226046]">{meal.totalKcal} kcal</span>
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
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#226046]/10 text-[#226046] transition-colors hover:bg-[#226046]/20 disabled:pointer-events-none disabled:opacity-40"
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
                  {formatNamedIngredientPortion(ing.name, ing.grams, allIngredients, useGrams)}
                  {showCalories && (
                    <span className="ml-1.5 font-mono opacity-80">{ing.kcal} kcal</span>
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
