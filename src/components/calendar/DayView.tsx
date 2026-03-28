import { useMemo, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { clsx } from 'clsx';
import { useCalendarStore, createEmptyDayPlan } from '../../store/useCalendarStore';
import { parseDate, isToday, formatDayFull, todayKey } from '../../utils/dateHelpers';
import { MealSlot } from '../meals/MealSlot';
import { MEAL_TYPE_ORDER, MEAL_TYPE_LABELS } from '../../types';
import type { MealType } from '../../types';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useIngredientsStore } from '../../store/useIngredientsStore';
import { INGREDIENTS_DB } from '../../data/ingredients';
import { getMealCalories } from '../../utils/macroHelpers';

const MEAL_ICONS: Record<MealType, string> = {
  desayuno: '🌅',
  almuerzo: '☀️',
  cena: '🌙',
  snack: '🍎',
};

const MEAL_TIME_LABELS: Record<MealType, string> = {
  desayuno: '6:00 – 11:00',
  almuerzo: '11:00 – 15:00',
  cena: '15:00 – 21:00',
  snack: 'Todo el día',
};

function getCurrentMealType(): MealType | null {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 11) return 'desayuno';
  if (hour >= 11 && hour < 15) return 'almuerzo';
  if (hour >= 15 && hour < 21) return 'cena';
  return null;
}

export function DayView() {
  const currentDate = useCalendarStore((s) => s.currentDate);
  const navDay = useCalendarStore((s) => s.navigateDay);
  const goToToday = useCalendarStore((s) => s.goToToday);
  const storedPlan = useCalendarStore((s) => s.dayPlans[currentDate]);
  const dayPlan = useMemo(() => storedPlan ?? createEmptyDayPlan(currentDate), [storedPlan, currentDate]);
  const setNotes = useCalendarStore((s) => s.setNotes);
  const toggleMealCompleted = useCalendarStore((s) => s.toggleMealCompleted);

  const date = useMemo(() => parseDate(currentDate), [currentDate]);
  const today = isToday(date);

  const showCalories = useSettingsStore((s) => s.showCalories);
  const customIngredients = useIngredientsStore((s) => s.customIngredients);
  const allIngredients = useMemo(() => [...INGREDIENTS_DB, ...customIngredients], [customIngredients]);
  const [activeMealType, setActiveMealType] = useState<MealType | null>(getCurrentMealType);
  const [notesValue, setNotesValue] = useState(dayPlan.notes);
  const [notesExpanded, setNotesExpanded] = useState(false);

  // Update active meal type every minute
  useEffect(() => {
    if (!today) {
      setActiveMealType(null);
      return;
    }
    setActiveMealType(getCurrentMealType());
    const interval = setInterval(() => {
      setActiveMealType(getCurrentMealType());
    }, 60_000);
    return () => clearInterval(interval);
  }, [today]);

  // Sync notes value when day changes
  useEffect(() => {
    setNotesValue(dayPlan.notes);
  }, [dayPlan.notes]);

  const totalCals = MEAL_TYPE_ORDER.reduce(
    (sum, mt) => sum + dayPlan.meals[mt].reduce((s, m) => s + (getMealCalories(m, allIngredients) ?? 0), 0),
    0,
  );

  const isCurrentDay = currentDate === todayKey();

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => navDay('prev')}
            className="p-2 rounded-xl hover:bg-surface2 transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center"
            aria-label="Día anterior"
          >
            <ChevronLeft size={20} className="text-muted" />
          </button>
          <div className="text-center min-w-[180px]">
            <h2 className={clsx(
              'text-sm font-heading font-bold capitalize',
              today ? 'text-accent' : 'text-text-primary',
            )}>
              {formatDayFull(date)}
            </h2>
            {today && (
              <span className="text-[10px] font-body text-accent bg-accent/10 px-2 py-0.5 rounded-lg">
                Hoy
              </span>
            )}
          </div>
          <button
            onClick={() => navDay('next')}
            className="p-2 rounded-xl hover:bg-surface2 transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center"
            aria-label="Día siguiente"
          >
            <ChevronRight size={20} className="text-muted" />
          </button>
        </div>
        {!isCurrentDay && (
          <button
            onClick={goToToday}
            className="px-3 py-2 rounded-xl text-xs font-body font-medium text-accent hover:bg-accent/10 transition-colors min-h-[36px]"
          >
            Hoy
          </button>
        )}
        {showCalories && totalCals > 0 && (
          <span className="text-xs font-mono text-accent">{totalCals} kcal</span>
        )}
      </div>

      {/* Active meal banner */}
      {today && activeMealType && (
        <div className="bg-accent/10 border border-accent/30 rounded-2xl px-4 py-3 flex items-center gap-3">
          <span className="text-xl">{MEAL_ICONS[activeMealType]}</span>
          <div>
            <p className="text-sm font-heading font-bold text-accent">
              Ahora deberías: {MEAL_TYPE_LABELS[activeMealType]}
            </p>
            <p className="text-[11px] font-body text-muted">{MEAL_TIME_LABELS[activeMealType]}</p>
          </div>
        </div>
      )}

      {/* Meal slots with completion */}
      <div className="space-y-3">
        {MEAL_TYPE_ORDER.map((mt) => {
          const isActive = today && activeMealType === mt;
          const meals = dayPlan.meals[mt];
          return (
            <div
              key={mt}
              className={clsx(
                'rounded-2xl transition-all',
                isActive && 'ring-2 ring-accent/50 shadow-lg shadow-accent/10',
              )}
            >
              {/* Completion toggles for individual meals */}
              {meals.length > 0 && (
                <div className="mb-1">
                  {meals.map((meal) => (
                    <button
                      key={meal.id}
                      onClick={() => toggleMealCompleted(currentDate, mt, meal.id)}
                      className={clsx(
                        'flex items-center gap-2 w-full px-4 py-1.5 text-left transition-colors rounded-lg',
                        meal.completed
                          ? 'opacity-60'
                          : 'hover:bg-surface2/40',
                      )}
                    >
                      <div
                        className={clsx(
                          'w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0',
                          meal.completed
                            ? 'bg-green-500 border-green-500'
                            : 'border-border hover:border-accent/50',
                        )}
                      >
                        {meal.completed && <Check size={12} className="text-white" />}
                      </div>
                      <span
                        className={clsx(
                          'text-xs font-body truncate',
                          meal.completed ? 'line-through text-muted' : 'text-text-primary',
                        )}
                      >
                        {meal.name}
                        {showCalories && getMealCalories(meal, allIngredients) !== undefined && (
                          <span className="text-muted ml-1">({getMealCalories(meal, allIngredients)} kcal)</span>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              <MealSlot date={currentDate} mealType={mt} meals={meals} />
              {isActive && meals.length === 0 && (
                <p className="text-[10px] text-accent/70 font-body text-center py-1">
                  Es hora de {MEAL_TYPE_LABELS[mt].toLowerCase()}
                </p>
              )}
            </div>
          );
        })}
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
            onBlur={() => setNotes(currentDate, notesValue)}
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
