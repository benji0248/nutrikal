import { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import { useCalendarStore, createEmptyDayPlan } from '../../store/useCalendarStore';
import { useWeekPlanningStore } from '../../store/useWeekPlanningStore';
import { isToday, formatDayFull, formatDateKey } from '../../utils/dateHelpers';
import { resolveDayFlex } from '../../utils/flexDayHelpers';
import { MealSlot } from '../meals/MealSlot';
import { MEAL_TYPE_ORDER } from '../../types';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useIngredientsStore } from '../../store/useIngredientsStore';
import { INGREDIENTS_DB } from '../../data/ingredients';
import { getMealCalories } from '../../utils/macroHelpers';

interface DayCardProps {
  date: Date;
}

export function DayCard({ date }: DayCardProps) {
  const dateKey = formatDateKey(date);
  const storedPlan = useCalendarStore((s) => s.dayPlans[dateKey]);
  const dayPlan = useMemo(() => storedPlan ?? createEmptyDayPlan(dateKey), [storedPlan, dateKey]);
  const setNotes = useCalendarStore((s) => s.setNotes);
  const weekPlanning = useWeekPlanningStore((s) => s.weekPlanning);

  const [notesValue, setNotesValue] = useState(dayPlan.notes);
  const [notesExpanded, setNotesExpanded] = useState(false);

  const showCalories = useSettingsStore((s) => s.showCalories);
  const customIngredients = useIngredientsStore((s) => s.customIngredients);
  const allIngredients = useMemo(() => [...INGREDIENTS_DB, ...customIngredients], [customIngredients]);
  const today = isToday(date);
  const totalCals = MEAL_TYPE_ORDER.reduce(
    (sum, mt) => sum + dayPlan.meals[mt].reduce((s, m) => s + (getMealCalories(m, allIngredients) ?? 0), 0),
    0,
  );

  const flexInfo = useMemo(
    () =>
      resolveDayFlex(
        dateKey,
        weekPlanning?.weekdayFlexRules ?? [],
        { dayMode: dayPlan.dayMode, dayLabel: dayPlan.dayLabel },
      ),
    [dateKey, weekPlanning?.weekdayFlexRules, dayPlan.dayMode, dayPlan.dayLabel],
  );
  const isFullFree = flexInfo.mode === 'full_free';

  return (
    <div
      className={clsx(
        'rounded-[1.5rem] bg-surface p-4 space-y-3 shadow-ambient transition-all',
        today ? 'ring-2 ring-accent/30' : '',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h3
          className={clsx(
            'font-heading font-bold capitalize text-sm flex flex-wrap items-center gap-2',
            today ? 'text-accent' : 'text-text-primary',
          )}
        >
          <span>{formatDayFull(date)}</span>
          {today && (
            <span className="text-[10px] font-body font-normal bg-accent/15 text-accent px-2 py-0.5 rounded-lg">
              Hoy
            </span>
          )}
          {flexInfo.label && (
            <span className="text-[10px] font-body font-semibold bg-[#fd9d1a]/20 text-[#663b00] px-2 py-0.5 rounded-lg">
              {flexInfo.label}
            </span>
          )}
        </h3>
        {showCalories && totalCals > 0 && !isFullFree && (
          <span className="text-xs font-mono text-accent">{totalCals} kcal</span>
        )}
      </div>

      {isFullFree ? (
        <div className="rounded-2xl bg-[#f8faf1] p-4 text-center">
          <p className="font-body text-sm font-medium text-[#191c17]">Día libre</p>
          <p className="mt-1 text-xs font-body text-[#707a6c]">
            Sin menú planificado. Comé a tu ritmo.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {MEAL_TYPE_ORDER.map((mt) => (
            <MealSlot key={mt} date={dateKey} mealType={mt} meals={dayPlan.meals[mt]} />
          ))}
        </div>
      )}

      <div>
        <button
          onClick={() => setNotesExpanded(!notesExpanded)}
          className="text-xs text-muted font-body hover:text-text-primary transition-colors mb-1"
          aria-label={notesExpanded ? 'Ocultar notas' : 'Mostrar notas'}
        >
          {notesExpanded ? '▾ Notas' : '▸ Notas'}
        </button>
        {notesExpanded && (
          <textarea
            value={notesValue}
            onChange={(e) => setNotesValue(e.target.value)}
            onBlur={() => setNotes(dateKey, notesValue)}
            placeholder="Notas del día..."
            rows={2}
            className="w-full resize-none rounded-xl border border-border/30 bg-surface2/40 px-3 py-2.5 text-sm font-body text-text-primary outline-none transition-all placeholder:text-muted focus:border-accent/40"
            aria-label="Notas del día"
          />
        )}
      </div>
    </div>
  );
}
