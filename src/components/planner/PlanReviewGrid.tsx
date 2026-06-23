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
  swapDisabled?: boolean;
}

export const PlanReviewGrid = ({ plan, onSwapMeal, swapDisabled = false }: PlanReviewGridProps) => {
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
                'w-12 h-12 flex flex-col items-center justify-center whitespace-nowrap rounded-full transition-all flex-shrink-0',
                active
                  ? 'bg-[#b1f0ce] text-[#002114]'
                  : 'bg-[#e1e3da] text-[#40493d]'
              )}
            >
              <span className="capitalize">{dayLabel}</span>
              <span className="text-[10px] opacity-80">{dateLabel}</span>
            </button>
          );
        })}
      </div>

      {activeDayData && (
        <div className="mt-2 space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <p className="font-body text-xs font-medium capitalize text-[#191c17]">
                {format(parseISO(activeDayData.date), "EEEE d 'de' MMMM", { locale: es })}
              </p>
              {activeDayData.dayLabel && (
                <span className="mt-0.5 inline-block rounded-full bg-[#fd9d1a]/20 px-2 py-0.5 text-[10px] font-body font-semibold text-[#663b00]">
                  {activeDayData.dayLabel}
                </span>
              )}
            </div>
            {showCalories && dayKcal > 0 && activeDayData.dayMode !== 'full_free' && (
              <span className="font-mono text-xs text-[#226046]">
                {dayKcal} kcal
              </span>
            )}
          </div>

          {activeDayData.dayMode === 'full_free' ? (
            <div className="rounded-2xl bg-[#f8faf1] p-4 text-center">
              <p className="font-body text-sm font-medium text-[#191c17]">Día libre</p>
              <p className="mt-1 text-xs font-body text-[#707a6c]">
                Sin menú planificado. Comé a tu ritmo; el resto de la semana sigue armado.
              </p>
            </div>
          ) : (
          <>
          {activeDayData.dayMode === 'maintenance' && (
            <p className="text-[11px] font-body text-[#707a6c]">
              Calorías de mantenimiento (sin déficit este día).
            </p>
          )}
          {MEAL_TYPE_ORDER.map((mt) => {
            const planned = activeDayData.meals[mt];
            return (
              <div key={mt}>
                <span className="font-body text-[11px] uppercase tracking-wide text-[#707a6c]">
                  {MEAL_TYPE_LABELS[mt]}
                </span>
                <PlanMealCell
                  meal={planned}
                  mealType={mt}
                  date={activeDayData.date}
                  showCalories={showCalories}
                  onSwap={onSwapMeal}
                  swapDisabled={swapDisabled}
                />
              </div>
            );
          })}
          </>
          )}
        </div>
      )}
    </div>
  );
};
