import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';
import { useCalendarStore } from '../../store/useCalendarStore';
import { useSwipe } from '../../hooks/useSwipe';
import { getWeekDays, getWeekRange, parseDate, isToday, DAY_LABELS, formatDateKey } from '../../utils/dateHelpers';
import { DayCard } from './DayCard';
import { format } from 'date-fns';
import type { MealType } from '../../types';

interface WeekViewProps {
  onNavigateToAssistant?: () => void;
}

export function WeekView({ onNavigateToAssistant }: WeekViewProps) {
  const currentDate = useCalendarStore((s) => s.currentDate);
  const navWeek = useCalendarStore((s) => s.navigateWeek);

  const dayPlans = useCalendarStore((s) => s.dayPlans);
  const weekDays = useMemo(() => getWeekDays(parseDate(currentDate)), [currentDate]);

  const hasAnyMeals = useMemo(() => {
    return weekDays.some((day) => {
      const key = formatDateKey(day);
      const plan = dayPlans[key];
      if (!plan) return false;
      return (Object.keys(plan.meals) as MealType[]).some(
        (mt) => plan.meals[mt].length > 0,
      );
    });
  }, [weekDays, dayPlans]);

  const [activeDayIdx, setActiveDayIdx] = useState(() => {
    const todayIdx = weekDays.findIndex((d) => isToday(d));
    return todayIdx >= 0 ? todayIdx : 0;
  });

  const swipeBindings = useSwipe({
    onSwipeLeft: () => {
      if (activeDayIdx < 6) setActiveDayIdx(activeDayIdx + 1);
      else navWeek('next');
    },
    onSwipeRight: () => {
      if (activeDayIdx > 0) setActiveDayIdx(activeDayIdx - 1);
      else navWeek('prev');
    },
  });

  return (
    <div {...swipeBindings}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1">
          <button
            onClick={() => navWeek('prev')}
            className="p-2 rounded-xl hover:bg-surface2 transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center"
            aria-label="Semana anterior"
          >
            <ChevronLeft size={20} className="text-muted" />
          </button>
          <h2 className="text-sm font-heading font-bold text-text-primary capitalize min-w-[140px] text-center">
            {getWeekRange(currentDate)}
          </h2>
          <button
            onClick={() => navWeek('next')}
            className="p-2 rounded-xl hover:bg-surface2 transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center"
            aria-label="Semana siguiente"
          >
            <ChevronRight size={20} className="text-muted" />
          </button>
        </div>
      </div>

      {/* Day tabs — mobile only */}
      <div className="flex gap-1 mb-4 md:hidden">
        {weekDays.map((day, idx) => {
          const active = idx === activeDayIdx;
          const today = isToday(day);
          return (
            <button
              key={formatDateKey(day)}
              onClick={() => setActiveDayIdx(idx)}
              className={clsx(
                'flex-1 flex flex-col items-center py-2 rounded-xl transition-all min-h-[48px]',
                active ? 'bg-accent/10' : 'hover:bg-surface2/50',
              )}
              aria-label={`${DAY_LABELS[idx]} ${format(day, 'd')}`}
            >
              <span className={clsx('text-[10px] font-body', active ? 'text-accent font-medium' : 'text-muted')}>
                {DAY_LABELS[idx]}
              </span>
              <span className={clsx(
                'text-sm font-mono mt-0.5',
                today ? 'text-accent font-bold' : active ? 'text-text-primary' : 'text-muted',
              )}>
                {format(day, 'd')}
              </span>
              {active && <div className="w-1 h-1 rounded-full bg-accent mt-1" />}
            </button>
          );
        })}
      </div>

      {/* Empty state banner */}
      {!hasAnyMeals && onNavigateToAssistant && (
        <div className="bg-accent/10 border border-accent/30 rounded-2xl px-4 py-5 flex flex-col items-center gap-3 text-center mb-4">
          <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
            <Sparkles size={20} className="text-accent" />
          </div>
          <div>
            <p className="text-sm font-heading font-bold text-text-primary">
              No tenés nada planificado
            </p>
            <p className="text-xs font-body text-muted mt-1">
              Pedile a Nutri que te arme la semana
            </p>
          </div>
          <button
            onClick={onNavigateToAssistant}
            className="px-5 py-2.5 rounded-xl bg-accent text-white text-sm font-body font-medium hover:bg-accent/90 transition-colors min-h-[48px]"
          >
            Ir a Nutri
          </button>
        </div>
      )}

      {/* Mobile: single day */}
      <div className="md:hidden">
        <DayCard date={weekDays[activeDayIdx]} />
      </div>

      {/* Desktop: all days */}
      <div className="hidden md:grid md:grid-cols-1 lg:grid-cols-2 gap-4">
        {weekDays.map((day) => (
          <DayCard key={formatDateKey(day)} date={day} />
        ))}
      </div>
    </div>
  );
}
