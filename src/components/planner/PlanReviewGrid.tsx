import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { clsx } from 'clsx';
import type { WeekPlan, MealType, Dish } from '../../types';
import { MEAL_TYPE_ORDER, MEAL_TYPE_LABELS } from '../../types';
import { DISHES_DB } from '../../data/dishes';
import { useRecipesStore } from '../../store/useRecipesStore';
import { PlanMealCell } from './PlanMealCell';

interface PlanReviewGridProps {
  plan: WeekPlan;
  onSwapMeal: (date: string, mealType: MealType) => void;
}

export const PlanReviewGrid = ({ plan, onSwapMeal }: PlanReviewGridProps) => {
  const customDishes = useRecipesStore((s) => s.customDishes);
  const allDishes = [...DISHES_DB, ...customDishes];
  const [activeDay, setActiveDay] = useState(0);

  function findDish(dishId: string): Dish | undefined {
    return allDishes.find((d) => d.id === dishId);
  }

  // Mobile: tab per day
  const activeDayData = plan.days[activeDay];

  return (
    <div>
      {/* Mobile tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2 md:hidden">
        {plan.days.map((day, idx) => {
          const date = parseISO(day.date);
          const label = format(date, 'EEE d', { locale: es });
          return (
            <button
              key={day.date}
              type="button"
              onClick={() => setActiveDay(idx)}
              className={clsx(
                'px-3 py-2 rounded-xl text-xs font-body font-medium whitespace-nowrap transition-all min-h-[40px]',
                idx === activeDay
                  ? 'bg-accent/15 text-accent'
                  : 'bg-surface2/40 text-muted',
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Mobile: single day view */}
      {activeDayData && (
        <div className="md:hidden space-y-2 mt-2">
          <p className="text-xs font-body font-medium text-text-primary capitalize">
            {format(parseISO(activeDayData.date), "EEEE d 'de' MMMM", { locale: es })}
          </p>
          {MEAL_TYPE_ORDER.map((mt) => {
            const planned = activeDayData.meals[mt];
            return (
              <div key={mt}>
                <span className="text-[11px] font-body text-muted uppercase tracking-wide">
                  {MEAL_TYPE_LABELS[mt]}
                </span>
                <PlanMealCell
                  dish={planned ? findDish(planned.dishId) : undefined}
                  mealType={mt}
                  date={activeDayData.date}
                  servings={planned?.servings ?? 1}
                  onSwap={onSwapMeal}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Desktop: full grid */}
      <div className="hidden md:block">
        <div className="grid grid-cols-7 gap-2">
          {/* Headers */}
          {plan.days.map((day) => {
            const date = parseISO(day.date);
            return (
              <div key={day.date} className="text-center pb-2">
                <p className="text-xs font-body font-medium text-text-primary capitalize">
                  {format(date, 'EEE', { locale: es })}
                </p>
                <p className="text-[11px] font-body text-muted">
                  {format(date, 'd/M')}
                </p>
              </div>
            );
          })}

          {/* Cells — one row per meal type */}
          {MEAL_TYPE_ORDER.map((mt) => (
            plan.days.map((day) => {
              const planned = day.meals[mt];
              return (
                <PlanMealCell
                  key={`${day.date}-${mt}`}
                  dish={planned ? findDish(planned.dishId) : undefined}
                  mealType={mt}
                  date={day.date}
                  servings={planned?.servings ?? 1}
                  onSwap={onSwapMeal}
                />
              );
            })
          ))}
        </div>
      </div>
    </div>
  );
};
