import { ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { useCalendarStore } from '../../store/useCalendarStore';
import { useSwipe } from '../../hooks/useSwipe';
import {
  getMonthCalendarGrid,
  navigateMonth,
  formatMonthYear,
  isDateToday,
  isSameDate,
  parseDate,
} from '../../utils/dateHelpers';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MEAL_TYPE_ORDER } from '../../types';

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export function MonthView() {
  const currentDate = useCalendarStore((s) => s.currentDate);
  const setCurrentDate = useCalendarStore((s) => s.setCurrentDate);
  const setViewMode = useCalendarStore((s) => s.setViewMode);
  const dayPlans = useCalendarStore((s) => s.dayPlans);

  const grid = getMonthCalendarGrid(currentDate);

  const goNext = () => setCurrentDate(navigateMonth(currentDate, 'next'));
  const goPrev = () => setCurrentDate(navigateMonth(currentDate, 'prev'));

  const swipeBindings = useSwipe({
    onSwipeLeft: goNext,
    onSwipeRight: goPrev,
  });

  const handleDayClick = (date: string) => {
    setCurrentDate(date);
    setViewMode('week');
  };

  return (
    <div {...swipeBindings}>
      <div className="flex items-center justify-center gap-4 mb-6">
        <button
          onClick={goPrev}
          className="p-2 rounded-xl hover:bg-surface-elevated transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center"
          aria-label="Mes anterior"
        >
          <ChevronLeft size={20} className="text-text-secondary" />
        </button>
        <h2 className="text-lg font-display font-bold text-text-primary capitalize min-w-[180px] text-center">
          {formatMonthYear(currentDate)}
        </h2>
        <button
          onClick={goNext}
          className="p-2 rounded-xl hover:bg-surface-elevated transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center"
          aria-label="Mes siguiente"
        >
          <ChevronRight size={20} className="text-text-secondary" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="text-center text-xs font-medium text-text-secondary py-2">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {grid.map((date, idx) => {
          if (!date) {
            return <div key={`empty-${idx}`} className="aspect-square" />;
          }

          const today = isDateToday(date);
          const selected = isSameDate(date, currentDate);
          const plan = dayPlans[date];
          const hasMeals = plan && MEAL_TYPE_ORDER.some((mt) => plan.meals[mt].length > 0);
          const totalCal = plan
            ? MEAL_TYPE_ORDER.reduce(
                (sum, mt) => sum + plan.meals[mt].reduce((s, m) => s + (m.calories ?? 0), 0),
                0,
              )
            : 0;

          return (
            <button
              key={date}
              onClick={() => handleDayClick(date)}
              className={clsx(
                'aspect-square rounded-xl p-1.5 flex flex-col items-center justify-center gap-0.5 transition-all duration-200 min-h-[48px]',
                today && 'ring-2 ring-accent/50',
                selected && 'bg-accent/15',
                !today && !selected && 'hover:bg-surface-elevated/50',
              )}
              aria-label={`${format(parseDate(date), "d 'de' MMMM", { locale: es })}`}
            >
              <span
                className={clsx(
                  'text-sm font-medium',
                  today ? 'text-accent' : 'text-text-primary',
                )}
              >
                {format(parseDate(date), 'd')}
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
              {totalCal > 0 && (
                <span className="text-[8px] font-mono text-text-secondary">{totalCal}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
