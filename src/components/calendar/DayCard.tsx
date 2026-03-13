import { useState } from 'react';
import { Droplets, Plus, Minus } from 'lucide-react';
import { clsx } from 'clsx';
import { useCalendarStore } from '../../store/useCalendarStore';
import { isDateToday, formatDayLabel, formatDayFull } from '../../utils/dateHelpers';
import { MealSlot } from '../meals/MealSlot';
import { MEAL_TYPE_ORDER } from '../../types';

interface DayCardProps {
  date: string;
  compact?: boolean;
}

export function DayCard({ date, compact = false }: DayCardProps) {
  const dayPlan = useCalendarStore((s) => s.getDayPlan(date));
  const setWater = useCalendarStore((s) => s.setWater);
  const setDayNotes = useCalendarStore((s) => s.setDayNotes);
  const waterGoal = useCalendarStore((s) => s.waterGoal);
  const [notesValue, setNotesValue] = useState(dayPlan.notes);

  const today = isDateToday(date);
  const totalCalories = MEAL_TYPE_ORDER.reduce(
    (sum, mt) => sum + dayPlan.meals[mt].reduce((s, m) => s + (m.calories ?? 0), 0),
    0,
  );
  const totalProtein = MEAL_TYPE_ORDER.reduce(
    (sum, mt) => sum + dayPlan.meals[mt].reduce((s, m) => s + (m.protein ?? 0), 0),
    0,
  );
  const totalCarbs = MEAL_TYPE_ORDER.reduce(
    (sum, mt) => sum + dayPlan.meals[mt].reduce((s, m) => s + (m.carbs ?? 0), 0),
    0,
  );
  const totalFat = MEAL_TYPE_ORDER.reduce(
    (sum, mt) => sum + dayPlan.meals[mt].reduce((s, m) => s + (m.fat ?? 0), 0),
    0,
  );
  const totalMeals = MEAL_TYPE_ORDER.reduce((sum, mt) => sum + dayPlan.meals[mt].length, 0);
  const waterPercent = Math.min((dayPlan.water / waterGoal) * 100, 100);

  if (compact) {
    return (
      <div
        className={clsx(
          'p-3 rounded-xl border transition-all cursor-pointer hover:border-accent/30',
          today
            ? 'border-accent/50 bg-accent/5'
            : 'border-border/50 bg-surface-elevated/30',
        )}
      >
        <p
          className={clsx(
            'text-xs font-medium capitalize',
            today ? 'text-accent' : 'text-text-secondary',
          )}
        >
          {formatDayLabel(date)}
        </p>
        {totalMeals > 0 && (
          <p className="text-[10px] font-mono text-text-secondary mt-1">{totalCalories} kcal</p>
        )}
        <div className="flex gap-0.5 mt-1.5">
          {MEAL_TYPE_ORDER.map((mt) => (
            <div
              key={mt}
              className={clsx(
                'h-1 flex-1 rounded-full',
                dayPlan.meals[mt].length > 0 ? 'bg-accent' : 'bg-border',
              )}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'bg-surface/50 backdrop-blur-sm rounded-2xl border p-4 space-y-3 transition-all duration-200',
        today ? 'border-accent/40 shadow-lg shadow-accent/5' : 'border-border/50',
      )}
    >
      <div className="flex items-center justify-between">
        <h3
          className={clsx(
            'font-display font-bold capitalize',
            today ? 'text-accent' : 'text-text-primary',
          )}
        >
          {formatDayFull(date)}
          {today && (
            <span className="ml-2 text-xs font-normal bg-accent/15 text-accent px-2 py-0.5 rounded-lg">
              Hoy
            </span>
          )}
        </h3>
      </div>

      {totalCalories > 0 && (
        <div className="grid grid-cols-4 gap-2">
          <MacroRing label="Calorías" value={totalCalories} unit="kcal" color="accent" />
          <MacroRing label="Proteína" value={totalProtein} unit="g" color="accent-secondary" />
          <MacroRing label="Carbos" value={totalCarbs} unit="g" color="warning" />
          <MacroRing label="Grasas" value={totalFat} unit="g" color="success" />
        </div>
      )}

      <div className="space-y-2">
        {MEAL_TYPE_ORDER.map((mt) => (
          <MealSlot key={mt} date={date} mealType={mt} meals={dayPlan.meals[mt]} />
        ))}
      </div>

      <div className="bg-surface-elevated/50 backdrop-blur-sm rounded-xl border border-border/50 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Droplets size={18} className="text-blue-400" />
            <span className="text-sm font-medium text-text-primary">Agua</span>
          </div>
          <span className="text-xs font-mono text-text-secondary">
            {dayPlan.water}/{waterGoal} vasos
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setWater(date, Math.max(0, dayPlan.water - 1))}
            className="p-2 rounded-lg bg-surface hover:bg-surface-elevated transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Quitar un vaso de agua"
          >
            <Minus size={16} className="text-text-secondary" />
          </button>
          <div className="flex-1 h-3 bg-surface rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${waterPercent}%` }}
            />
          </div>
          <button
            onClick={() => setWater(date, dayPlan.water + 1)}
            className="p-2 rounded-lg bg-surface hover:bg-surface-elevated transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Agregar un vaso de agua"
          >
            <Plus size={16} className="text-blue-400" />
          </button>
        </div>
      </div>

      <div>
        <textarea
          value={notesValue}
          onChange={(e) => setNotesValue(e.target.value)}
          onBlur={() => setDayNotes(date, notesValue)}
          placeholder="Notas del día..."
          rows={2}
          className="w-full px-4 py-3 bg-surface-elevated/50 rounded-xl text-sm text-text-primary placeholder-text-secondary border border-border/50 focus:border-accent/50 focus:ring-1 focus:ring-accent/30 outline-none transition-all resize-none"
          aria-label="Notas del día"
        />
      </div>
    </div>
  );
}

interface MacroRingProps {
  label: string;
  value: number;
  unit: string;
  color: string;
}

function MacroRing({ label, value, color }: MacroRingProps) {
  return (
    <div className="text-center">
      <div
        className={clsx(
          'w-12 h-12 mx-auto rounded-full flex items-center justify-center border-2',
          color === 'accent' && 'border-accent/30 bg-accent/5',
          color === 'accent-secondary' && 'border-accent-secondary/30 bg-accent-secondary/5',
          color === 'warning' && 'border-warning/30 bg-warning/5',
          color === 'success' && 'border-success/30 bg-success/5',
        )}
      >
        <span
          className={clsx(
            'text-xs font-mono font-bold',
            color === 'accent' && 'text-accent',
            color === 'accent-secondary' && 'text-accent-secondary',
            color === 'warning' && 'text-warning',
            color === 'success' && 'text-success',
          )}
        >
          {value}
        </span>
      </div>
      <p className="text-[10px] text-text-secondary mt-1">
        {label}
      </p>
    </div>
  );
}
