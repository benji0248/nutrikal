import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '../ui/Button';
import { MEAL_TYPE_LABELS, MEAL_TYPE_ORDER } from '../../types';
import type { MealType } from '../../types';
import {
  DAY_LABELS,
  formatDateKey,
  getWeekDays,
  getWeekRange,
  isToday,
  navigateWeek,
  parseDate,
  todayKey,
} from '../../utils/dateHelpers';
import { useCalendarStore, createEmptyDayPlan } from '../../store/useCalendarStore';
import { mealTypeChipLabel } from '../../utils/mealTimeHelpers';

export interface ScheduleMealPickerProps {
  defaultDate?: string;
  defaultMealType?: MealType;
  calories?: number;
  dishName?: string;
  onConfirm: (date: string, mealType: MealType) => void;
  onCancel: () => void;
}

export function ScheduleMealPicker({
  defaultDate,
  defaultMealType = 'almuerzo',
  calories,
  dishName,
  onConfirm,
  onCancel,
}: ScheduleMealPickerProps) {
  const dayPlans = useCalendarStore((s) => s.dayPlans);
  const [anchorDate, setAnchorDate] = useState(defaultDate ?? todayKey());
  const [selectedDate, setSelectedDate] = useState(defaultDate ?? todayKey());
  const [mealType, setMealType] = useState<MealType>(defaultMealType);

  const weekDays = useMemo(() => getWeekDays(parseDate(anchorDate)), [anchorDate]);

  const selectedDay = parseDate(selectedDate);
  const summaryDate = format(selectedDay, "EEEE d 'de' MMMM", { locale: es });

  const slotHasMeals = (dateKey: string, mt: MealType): boolean => {
    const plan = dayPlans[dateKey] ?? createEmptyDayPlan(dateKey);
    return plan.meals[mt].length > 0;
  };

  return (
    <div className="space-y-5">
      {dishName && (
        <p className="font-body text-sm text-[var(--text-muted)] leading-snug">
          {dishName}
        </p>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={() => setAnchorDate((d) => navigateWeek(d, 'prev'))}
            className="p-2 rounded-xl hover:bg-surface2 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Semana anterior"
          >
            <ChevronLeft size={20} className="text-muted" />
          </button>
          <p className="text-sm font-heading font-bold text-text-primary capitalize">
            {getWeekRange(anchorDate)}
          </p>
          <button
            type="button"
            onClick={() => setAnchorDate((d) => navigateWeek(d, 'next'))}
            className="p-2 rounded-xl hover:bg-surface2 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Semana siguiente"
          >
            <ChevronRight size={20} className="text-muted" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day, idx) => {
            const dateKey = formatDateKey(day);
            const selected = dateKey === selectedDate;
            const today = isToday(day);
            const hasMeals = MEAL_TYPE_ORDER.some((mt) => slotHasMeals(dateKey, mt));

            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => setSelectedDate(dateKey)}
                className={clsx(
                  'flex flex-col items-center py-2 rounded-2xl transition-all min-h-[56px]',
                  selected
                    ? 'bg-accent text-white shadow-ambient'
                    : 'hover:bg-surface2/60 text-muted',
                )}
                aria-label={`${DAY_LABELS[idx]} ${format(day, 'd')}`}
                aria-pressed={selected}
              >
                <span
                  className={clsx(
                    'text-[9px] font-medium uppercase',
                    selected ? 'text-white/90' : '',
                  )}
                >
                  {DAY_LABELS[idx].slice(0, 3)}
                </span>
                <span
                  className={clsx(
                    'text-sm font-semibold tabular-nums mt-0.5',
                    selected
                      ? 'text-white'
                      : today
                        ? 'text-accent font-bold'
                        : 'text-text-primary',
                  )}
                >
                  {format(day, 'd')}
                </span>
                <span
                  className={clsx(
                    'mt-1 h-1 w-1 rounded-full',
                    hasMeals
                      ? selected
                        ? 'bg-white/80'
                        : 'bg-accent/50'
                      : 'bg-transparent',
                  )}
                  aria-hidden
                />
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="block text-sm font-medium text-text-primary mb-2 font-body">
          ¿En qué comida?
        </p>
        <div className="grid grid-cols-2 gap-2">
          {MEAL_TYPE_ORDER.map((mt) => {
            const occupied = slotHasMeals(selectedDate, mt);
            return (
              <button
                key={mt}
                type="button"
                onClick={() => setMealType(mt)}
                className={clsx(
                  'px-3 py-2.5 rounded-xl text-sm font-body font-medium transition-colors min-h-[48px] relative',
                  mealType === mt
                    ? 'bg-accent text-white'
                    : 'bg-surface2 text-muted hover:text-text-primary',
                )}
                aria-label={MEAL_TYPE_LABELS[mt]}
                aria-pressed={mealType === mt}
              >
                {mealTypeChipLabel(mt)}
                {occupied && mealType !== mt && (
                  <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-accent/60" />
                )}
              </button>
            );
          })}
        </div>
        {slotHasMeals(selectedDate, mealType) && (
          <p className="mt-2 text-xs font-body text-muted">
            Ya hay comidas en este horario; se agregará junto a las demás.
          </p>
        )}
      </div>

      <div className="rounded-xl bg-surface2/60 px-4 py-3 text-center">
        <p className="font-body text-sm text-text-primary capitalize">{summaryDate}</p>
        <p className="font-body text-xs text-muted mt-0.5">
          {mealTypeChipLabel(mealType)}
          {calories != null && calories > 0 && (
            <span className="font-mono text-accent"> · {calories} kcal</span>
          )}
        </p>
      </div>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onCancel} fullWidth>
          Cancelar
        </Button>
        <Button onClick={() => onConfirm(selectedDate, mealType)} fullWidth>
          Agregar
        </Button>
      </div>
    </div>
  );
}
