import { useState, useMemo } from 'react';
import { Droplets, Plus, Minus } from 'lucide-react';
import { clsx } from 'clsx';
import { useCalendarStore, createEmptyDayPlan } from '../../store/useCalendarStore';
import { isToday, formatDayFull, formatDateKey } from '../../utils/dateHelpers';
import { MealSlot } from '../meals/MealSlot';
import { MEAL_TYPE_ORDER } from '../../types';

interface DayCardProps {
  date: Date;
}

export function DayCard({ date }: DayCardProps) {
  const dateKey = formatDateKey(date);
  const storedPlan = useCalendarStore((s) => s.dayPlans[dateKey]);
  const dayPlan = useMemo(() => storedPlan ?? createEmptyDayPlan(dateKey), [storedPlan, dateKey]);
  const setWater = useCalendarStore((s) => s.setWater);
  const setNotes = useCalendarStore((s) => s.setNotes);

  const [notesValue, setNotesValue] = useState(dayPlan.notes);
  const [notesExpanded, setNotesExpanded] = useState(false);

  const today = isToday(date);
  const totalCals = MEAL_TYPE_ORDER.reduce(
    (sum, mt) => sum + dayPlan.meals[mt].reduce((s, m) => s + (m.calories ?? 0), 0),
    0,
  );
  const waterGoal = dayPlan.waterGoal || 8;
  const waterPercent = Math.min((dayPlan.water / waterGoal) * 100, 100);

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
        {totalCals > 0 && (
          <span className="text-xs font-mono text-accent">{totalCals} kcal</span>
        )}
      </div>

      {/* Water tracker */}
      <div className="bg-surface2/40 rounded-2xl border border-border/30 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Droplets size={16} className="text-blue-400" />
            <span className="text-xs font-body font-medium text-text-primary">Agua</span>
          </div>
          <span className="text-[11px] font-mono text-muted">
            {dayPlan.water}/{waterGoal}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWater(dateKey, Math.max(0, dayPlan.water - 1))}
            className="p-2 rounded-xl bg-surface hover:bg-surface2 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
            aria-label="Quitar un vaso"
          >
            <Minus size={14} className="text-muted" />
          </button>
          <div className="flex-1 h-2.5 bg-surface rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500"
              style={{ width: `${waterPercent}%` }}
            />
          </div>
          <button
            onClick={() => setWater(dateKey, Math.min(dayPlan.water + 1, 20))}
            className="p-2 rounded-xl bg-surface hover:bg-surface2 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
            aria-label="Agregar un vaso"
          >
            <Plus size={14} className="text-blue-400" />
          </button>
        </div>
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
