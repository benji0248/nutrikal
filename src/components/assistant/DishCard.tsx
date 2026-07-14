import { useState } from 'react';
import { Clock, ChefHat, RefreshCw, PlusCircle } from 'lucide-react';
import type { HydratedAiDish, MealType } from '../../types';
import { todayKey } from '../../utils/dateHelpers';
import { getMealWeightLabel, formatMealWeightLabel } from '../../utils/portionHelpers';
import { MEAL_WEIGHT_BADGE } from './journalTokens';
import { ScheduleMealPicker } from '../meals/ScheduleMealPicker';
import { ScheduleMealSheet } from '../meals/ScheduleMealSheet';

interface DishCardProps {
  dish: HydratedAiDish;
  showCalories?: boolean;
  mealSlotBudgetKcal?: number;
  defaultMealType?: MealType;
  personalizationNote?: string;
  onApply?: (dish: HydratedAiDish, date: string, mealType: MealType) => void;
  onRegenerate?: () => void;
  chatBusy?: boolean;
}

export const DishCard = ({
  dish,
  showCalories = false,
  mealSlotBudgetKcal,
  defaultMealType,
  personalizationNote,
  onApply,
  onRegenerate,
  chatBusy = false,
}: DishCardProps) => {
  const [showPicker, setShowPicker] = useState(false);
  const totalKcal = Math.round(dish.macros.calories);
  const weightKey = mealSlotBudgetKcal
    ? getMealWeightLabel(totalKcal, mealSlotBudgetKcal)
    : null;
  const weightBadge = weightKey ? MEAL_WEIGHT_BADGE[weightKey] : null;

  const handleApplyClick = () => {
    if (defaultMealType && onApply) {
      onApply(dish, todayKey(), defaultMealType);
      return;
    }
    setShowPicker(true);
  };

  const handleConfirm = (date: string, mealType: MealType) => {
    onApply?.(dish, date, mealType);
    setShowPicker(false);
  };

  return (
    <>
      <div className="flex mr-8 items-start gap-3 animate-fade-in">
        <div className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center flex-shrink-0 text-white">
          <ChefHat size={16} />
        </div>
        <div className="rounded-2xl bg-[var(--surface2)] border border-[var(--border)] shadow-sm overflow-hidden flex-1">
          <div className="px-5 py-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-sans text-base font-bold text-[var(--text-primary)]">
                {dish.name}
              </h3>
              <div className="flex shrink-0 flex-col items-end gap-1">
                {!showCalories && weightBadge && (
                  <span
                    className="rounded-full px-2 py-0.5 font-body text-[10px] font-semibold"
                    style={{ backgroundColor: weightBadge.bg, color: weightBadge.text }}
                  >
                    {formatMealWeightLabel(weightKey!)}
                  </span>
                )}
                {showCalories && totalKcal > 0 && (
                  <span className="font-body text-xs font-semibold text-[var(--text-muted)]">
                    {totalKcal} kcal
                  </span>
                )}
              </div>
            </div>

            {personalizationNote && (
              <p className="font-body text-xs italic leading-relaxed text-[var(--text-muted)]">
                {personalizationNote}
              </p>
            )}

            <div className="space-y-1">
              <p className="font-sans text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                Porciones
              </p>
              <ul className="space-y-0.5">
                {dish.humanIngredients.map((ing, idx) => (
                  <li
                    key={idx}
                    className="font-body text-sm text-[var(--text-primary)] flex justify-between"
                  >
                    <span>{ing.name}</span>
                    <span className="text-[var(--text-muted)] ml-3 shrink-0">
                      {ing.humanPortion}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {dish.preparation && (
              <div className="space-y-1">
                <p className="font-sans text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                  Preparación
                </p>
                <p className="font-body text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
                  {dish.preparation}
                </p>
              </div>
            )}

            {dish.tip && (
              <div className="bg-[var(--amber)]/10 border border-[var(--amber)]/20 rounded-xl px-3 py-2">
                <p className="font-body text-xs text-[var(--text-primary)]">
                  {dish.tip}
                </p>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <Clock size={14} />
              <span>{dish.prepMinutes} min</span>
            </div>
          </div>

          <div className="flex border-t border-[var(--border)]">
            {onApply && (
              <button
                type="button"
                onClick={handleApplyClick}
                disabled={chatBusy}
                className="flex-1 flex items-center justify-center gap-2 min-h-[48px] font-body text-sm font-semibold text-[var(--accent)] hover:bg-[var(--accent)]/5 active:scale-[0.98] transition-all disabled:opacity-40"
              >
                <PlusCircle size={18} />
                Agregar al calendario
              </button>
            )}
            {onRegenerate && (
              <button
                type="button"
                onClick={onRegenerate}
                disabled={chatBusy}
                className="flex-1 flex items-center justify-center gap-2 min-h-[48px] font-body text-sm text-[var(--text-muted)] hover:bg-[var(--surface)] active:scale-[0.98] transition-all disabled:opacity-40 border-l border-[var(--border)]"
              >
                <RefreshCw size={16} />
                Regenerar
              </button>
            )}
          </div>
        </div>
      </div>

      {onApply && !defaultMealType && (
        <ScheduleMealSheet
          isOpen={showPicker}
          onClose={() => setShowPicker(false)}
          title="Agregar al calendario"
        >
          <ScheduleMealPicker
            defaultDate={todayKey()}
            defaultMealType={defaultMealType ?? 'almuerzo'}
            dishName={dish.name}
            calories={showCalories ? totalKcal : undefined}
            onConfirm={handleConfirm}
            onCancel={() => setShowPicker(false)}
          />
        </ScheduleMealSheet>
      )}
    </>
  );
};
