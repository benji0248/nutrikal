import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { clsx } from 'clsx';
import type { WeekPlan, MealType } from '../../types';
import { MEAL_TYPE_ORDER, MEAL_TYPE_LABELS } from '../../types';
import { useSettingsStore } from '../../store/useSettingsStore';
import { PlanMealCell } from './PlanMealCell';
import { JOURNAL } from '../assistant/journalTokens';

interface PlanReviewGridProps {
  plan: WeekPlan;
  onSwapMeal: (date: string, mealType: MealType) => void;
}

export const PlanReviewGrid = ({ plan, onSwapMeal }: PlanReviewGridProps) => {
  const showCalories = useSettingsStore((s) => s.showCalories);
  const [activeDay, setActiveDay] = useState(0);

  const activeDayData = plan.days[activeDay];

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
      <div className="flex gap-1 overflow-x-auto pb-2">
        {plan.days.map((day, idx) => {
          const date = parseISO(day.date);
          const dayLabel = format(date, 'EEE', { locale: es });
          const dateLabel = format(date, 'd/M');
          const active = idx === activeDay;
          return (
            <button
              key={day.date}
              type="button"
              onClick={() => setActiveDay(idx)}
              className={clsx(
                'flex min-h-[44px] min-w-[48px] flex-col items-center whitespace-nowrap rounded-2xl px-3 py-2 font-body text-xs font-medium transition-all',
              )}
              style={
                active
                  ? {
                      backgroundColor: 'rgba(34, 96, 70, 0.14)',
                      color: JOURNAL.primary,
                    }
                  : {
                      backgroundColor: JOURNAL.surfaceLow,
                      color: JOURNAL.muted,
                    }
              }
            >
              <span className="capitalize">{dayLabel}</span>
              <span className="text-[10px] opacity-80">{dateLabel}</span>
            </button>
          );
        })}
      </div>

      {activeDayData && (
        <div className="mt-2 space-y-2">
          <div className="flex items-baseline justify-between">
            <p className="font-body text-xs font-medium capitalize" style={{ color: JOURNAL.onSurface }}>
              {format(parseISO(activeDayData.date), "EEEE d 'de' MMMM", { locale: es })}
            </p>
            {showCalories && dayKcal > 0 && (
              <span className="font-mono text-xs" style={{ color: JOURNAL.primary }}>
                {dayKcal} kcal
              </span>
            )}
          </div>
          {MEAL_TYPE_ORDER.map((mt) => {
            const planned = activeDayData.meals[mt];
            return (
              <div key={mt}>
                <span
                  className="font-body text-[11px] uppercase tracking-wide"
                  style={{ color: JOURNAL.muted }}
                >
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
