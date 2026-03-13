import { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Droplets } from 'lucide-react';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { useCalendarStore } from '../../store/useCalendarStore';
import { useSwipe } from '../../hooks/useSwipe';
import { getMonthGrid, getMonthLabel, parseDate, isToday, formatDateKey, DAY_LABELS } from '../../utils/dateHelpers';
import { MEAL_TYPE_ORDER } from '../../types';

export function MonthView() {
  const currentDate = useCalendarStore((s) => s.currentDate);
  const navMonth = useCalendarStore((s) => s.navigateMonth);
  const setView = useCalendarStore((s) => s.setView);
  const setCurrentDate = useCalendarStore((s) => s.setCurrentDate);
  const dayPlans = useCalendarStore((s) => s.dayPlans);

  const grid = useMemo(() => getMonthGrid(parseDate(currentDate)), [currentDate]);

  const swipeBindings = useSwipe({
    onSwipeLeft: () => navMonth('next'),
    onSwipeRight: () => navMonth('prev'),
  });

  const handleDayClick = (date: Date) => {
    setCurrentDate(formatDateKey(date));
    setView('week');
  };

  return (
    <div {...swipeBindings}>
      <div className="flex items-center justify-center gap-4 mb-6">
        <button
          onClick={() => navMonth('prev')}
          className="p-2 rounded-xl hover:bg-surface2 transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center"
          aria-label="Mes anterior"
        >
          <ChevronLeft size={20} className="text-muted" />
        </button>
        <h2 className="text-lg font-heading font-bold text-text-primary capitalize min-w-[160px] text-center">
          {getMonthLabel(currentDate)}
        </h2>
        <button
          onClick={() => navMonth('next')}
          className="p-2 rounded-xl hover:bg-surface2 transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center"
          aria-label="Mes siguiente"
        >
          <ChevronRight size={20} className="text-muted" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAY_LABELS.map((label) => (
          <div key={label} className="text-center text-[11px] font-body font-medium text-muted py-1">
            {label}
          </div>
        ))}
      </div>

      {grid.map((row, ri) => (
        <div key={ri} className="grid grid-cols-7 gap-1 mb-1">
          {row.map((date, ci) => {
            if (!date) return <div key={`empty-${ri}-${ci}`} className="aspect-square" />;

            const key = formatDateKey(date);
            const today = isToday(date);
            const plan = dayPlans[key];
            const hasMeals = plan && MEAL_TYPE_ORDER.some((mt) => plan.meals[mt].length > 0);
            const waterMet = plan && plan.water >= (plan.waterGoal || 8);

            return (
              <button
                key={key}
                onClick={() => handleDayClick(date)}
                className={clsx(
                  'aspect-square rounded-xl p-1 flex flex-col items-center justify-center gap-0.5 transition-all min-h-[44px]',
                  today && 'ring-2 ring-accent/50 bg-accent/5',
                  !today && 'hover:bg-surface2/50',
                )}
                aria-label={format(date, 'd')}
              >
                <span className={clsx('text-xs font-mono', today ? 'text-accent font-bold' : 'text-text-primary')}>
                  {format(date, 'd')}
                </span>
                {hasMeals && (
                  <div className="flex gap-0.5">
                    {MEAL_TYPE_ORDER.map((mt) => (
                      <div
                        key={mt}
                        className={clsx(
                          'w-1 h-1 rounded-full',
                          plan.meals[mt].length > 0 ? 'bg-accent' : 'bg-border',
                        )}
                      />
                    ))}
                  </div>
                )}
                {waterMet && <Droplets size={8} className="text-blue-400" />}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
