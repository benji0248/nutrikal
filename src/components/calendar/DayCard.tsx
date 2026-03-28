import { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import { useCalendarStore, createEmptyDayPlan } from '../../store/useCalendarStore';
import { isToday, formatDayFull, formatDateKey } from '../../utils/dateHelpers';
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
  return (
    <div
      className={clsx(
        'bg-surface/60 backdrop-blur-sm rounded-3xl border p-4 space-y-3 transition-all',
        today ? 'border-accent/40 shadow-lg shadow-accent/5' : 'border-border/40',
      )}
    >
      <div className="flex items-center justify-between">
        <h3
          className={clsx(
            'font-heading font-bold capitalize text-sm',
            today ? 'text-accent' : 'text-text-primary',
          )}
        >
          {formatDayFull(date)}
          {today && (
            <span className="ml-2 text-[10px] font-body font-normal bg-accent/15 text-accent px-2 py-0.5 rounded-lg">
              Hoy
            </span>
          )}
        </h3>
        {showCalories && totalCals > 0 && (
          <span className="text-xs font-mono text-accent">{totalCals} kcal</span>
        )}
      </div>

      {/* Meal slots */}
      <div className="space-y-2">
        {MEAL_TYPE_ORDER.map((mt) => (
          <MealSlot key={mt} date={dateKey} mealType={mt} meals={dayPlan.meals[mt]} />
        ))}
      </div>

      {/* Notes */}
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
            className="w-full px-3 py-2.5 bg-surface2/40 rounded-xl text-sm font-body text-text-primary placeholder-muted border border-border/30 focus:border-accent/40 outline-none transition-all resize-none"
            aria-label="Notas del día"
          />
        )}
      </div>
    </div>
  );
}
