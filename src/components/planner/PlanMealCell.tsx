import { useState, useMemo } from 'react';
import { RefreshCw, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import type { Dish, Ingredient, MealType } from '../../types';
import { MEAL_TYPE_LABELS } from '../../types';
import { getDishHumanIngredients } from '../../utils/portionHelpers';
import { computeDishMacros } from '../../services/dishMatchService';

interface PlanMealCellProps {
  dish: Dish | undefined;
  mealType: MealType;
  date: string;
  servings: number;
  allIngredients: Ingredient[];
  showCalories: boolean;
  onSwap: (date: string, mealType: MealType) => void;
}

export const PlanMealCell = ({ dish, mealType, date, servings, allIngredients, showCalories, onSwap }: PlanMealCellProps) => {
  const [expanded, setExpanded] = useState(false);

  const details = useMemo(() => {
    if (!dish) return null;
    const macros = computeDishMacros(dish, allIngredients);
    const dishKcal = Math.round(macros.calories * servings);
    const humanIngredients = getDishHumanIngredients(dish, servings, allIngredients);

    // Compute per-ingredient kcal
    const ingredientDetails = dish.ingredients.map((di, idx) => {
      const ing = allIngredients.find((i) => i.id === di.ingredientId);
      const totalGrams = di.grams * servings;
      const kcal = ing ? Math.round((ing.calories / 100) * totalGrams) : 0;
      return {
        name: humanIngredients[idx]?.name ?? di.ingredientId,
        humanPortion: humanIngredients[idx]?.humanPortion ?? `${totalGrams}g`,
        kcal,
      };
    });

    return { dishKcal, ingredientDetails };
  }, [dish, servings, allIngredients]);

  if (!dish || !details) {
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
                {showCalories && (
                  <span className="text-xs font-mono text-accent">{details.dishKcal} kcal</span>
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

      {expanded && details.ingredientDetails.length > 0 && (
        <div className="px-3 pb-3 pt-1 border-t border-border/20">
          <ul className="space-y-1">
            {details.ingredientDetails.map((ing, idx) => (
              <li key={idx} className="flex items-baseline justify-between gap-2 text-xs font-body">
                <span className="text-text-primary">{ing.name}</span>
                <span className="text-muted flex-shrink-0">
                  {ing.humanPortion}
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
