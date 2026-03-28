import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { clsx } from 'clsx';
import type { WeekPlan, MealType } from '../../types';
import { MEAL_TYPE_ORDER, MEAL_TYPE_LABELS } from '../../types';
import { useSettingsStore } from '../../store/useSettingsStore';
import { PlanMealCell } from './PlanMealCell';

interface PlanReviewGridProps {
  plan: WeekPlan;
  onSwapMeal: (date: string, mealType: MealType) => void;
}

export const PlanReviewGrid = ({ plan, onSwapMeal }: PlanReviewGridProps) => {
  const showCalories = useSettingsStore((s) => s.showCalories);
  const [activeDay, setActiveDay] = useState(0);

  const activeDayData = plan.days[activeDay];

  // Compute daily kcal total from AiMeal totalKcal
  const dayKcal = useMemo(() => {
    if (!activeDayData) return 0;
    let total = 0;
    for (const mt of MEAL_TYPE_ORDER) {
      const planned = activeDayData.meals[mt];
      if (!planned) continue;
      total += planned.totalKcal;
    }
    return total;
  }, [activeDayData]);

  return (
    <div>
      {/* Day tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2">
        {plan.days.map((day, idx) => {
          const date = parseISO(day.date);
          const dayLabel = format(date, 'EEE', { locale: es });
          const dateLabel = format(date, 'd/M');
          return (
            <button
              key={day.date}
              type="button"
              onClick={() => setActiveDay(idx)}
              className={clsx(
                'flex flex-col items-center px-3 py-2 rounded-xl text-xs font-body font-medium whitespace-nowrap transition-all min-h-[44px] min-w-[48px]',
                idx === activeDay
                  ? 'bg-accent/15 text-accent'
                  : 'bg-surface2/40 text-muted hover:bg-surface2/60',
              )}
            >
              <span className="capitalize">{dayLabel}</span>
              <span className="text-[10px] opacity-70">{dateLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Active day meals */}
      {activeDayData && (
        <div className="space-y-2 mt-2">
          <div className="flex items-baseline justify-between">
            <p className="text-xs font-body font-medium text-text-primary capitalize">
              {format(parseISO(activeDayData.date), "EEEE d 'de' MMMM", { locale: es })}
            </p>
            {showCalories && dayKcal > 0 && (
              <span className="text-xs font-mono text-accent">{dayKcal} kcal</span>
            )}
          </div>
          {MEAL_TYPE_ORDER.map((mt) => {
            const planned = activeDayData.meals[mt];
            return (
              <div key={mt}>
                <span className="text-[11px] font-body text-muted uppercase tracking-wide">
                  {MEAL_TYPE_LABELS[mt]}
                </span>
                <PlanMealCell
                  meal={planned}
                  mealType={mt}
                  date={activeDayData.date}
                  showCalories={showCalories}
                  onSwap={onSwapMeal}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
