import { useMemo, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, Plus } from 'lucide-react';
import { format, getISOWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { clsx } from 'clsx';
import { useCalendarStore, createEmptyDayPlan } from '../../store/useCalendarStore';
import { useProfileStore } from '../../store/useProfileStore';
import {
  parseDate,
  isToday,
  formatDayFull,
  getWeekDays,
  formatDateKey,
} from '../../utils/dateHelpers';
import { MealSlot } from '../meals/MealSlot';
import { MEAL_TYPE_ORDER, MEAL_TYPE_LABELS } from '../../types';
import type { MealType } from '../../types';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useIngredientsStore } from '../../store/useIngredientsStore';
import { INGREDIENTS_DB } from '../../data/ingredients';
import { getMealCalories, DAILY_REFERENCE } from '../../utils/macroHelpers';
import { DaySummaryCard } from './DaySummaryCard';
import { HydrationCard } from './HydrationCard';

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

interface DayViewProps {
  onNavigateToAssistant?: () => void;
}

function MealColumn({
  currentDate,
  mt,
  dayPlan,
  today,
  activeMealType,
}: {
  currentDate: string;
  mt: MealType;
  dayPlan: ReturnType<typeof createEmptyDayPlan>;
  today: boolean;
  activeMealType: MealType | null;
}) {
  const isActive = today && activeMealType === mt;
  const meals = dayPlan.meals[mt];

  return (
    <div
      className={clsx(
        'rounded-[1.25rem] transition-all',
        isActive && 'ring-2 ring-accent/40 shadow-[0px_12px_32px_rgba(34,96,70,0.12)]',
      )}
    >
      <MealSlot date={currentDate} mealType={mt} meals={meals} domId={`meal-${mt}`} />
      {isActive && meals.length === 0 && (
        <p className="py-1 text-center text-[10px] font-body text-accent/80">
          Es hora de {MEAL_TYPE_LABELS[mt].toLowerCase()}
        </p>
      )}
    </div>
  );
}

export function DayView({ onNavigateToAssistant }: DayViewProps) {
  const currentDate = useCalendarStore((s) => s.currentDate);
  const setCurrentDate = useCalendarStore((s) => s.setCurrentDate);
  const navDay = useCalendarStore((s) => s.navigateDay);
  const goToToday = useCalendarStore((s) => s.goToToday);
  const dayPlans = useCalendarStore((s) => s.dayPlans);
  const storedPlan = dayPlans[currentDate];
  const dayPlan = useMemo(() => storedPlan ?? createEmptyDayPlan(currentDate), [storedPlan, currentDate]);
  const setNotes = useCalendarStore((s) => s.setNotes);
  const getMetabolicResult = useProfileStore((s) => s.getMetabolicResult);

  const date = useMemo(() => parseDate(currentDate), [currentDate]);
  const today = isToday(date);
  const weekDays = useMemo(() => getWeekDays(date), [date]);

  const showCalories = useSettingsStore((s) => s.showCalories);
  const customIngredients = useIngredientsStore((s) => s.customIngredients);
  const allIngredients = useMemo(() => [...INGREDIENTS_DB, ...customIngredients], [customIngredients]);

  const metabolic = getMetabolicResult();
  const budgetKcal = metabolic?.budget ?? DAILY_REFERENCE.calories;

  const hasAnyMealsThisWeek = useMemo(() => {
    return weekDays.some((day) => {
      const key = formatDateKey(day);
      const plan = dayPlans[key];
      if (!plan) return false;
      return MEAL_TYPE_ORDER.some((mt) => plan.meals[mt].length > 0);
    });
  }, [weekDays, dayPlans]);

  const [activeMealType, setActiveMealType] = useState<MealType | null>(getCurrentMealType);
  const [notesValue, setNotesValue] = useState(dayPlan.notes);
  const [notesExpanded, setNotesExpanded] = useState(false);

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

  useEffect(() => {
    setNotesValue(dayPlan.notes);
  }, [dayPlan.notes]);

  const totalCals = MEAL_TYPE_ORDER.reduce(
    (sum, mt) => sum + dayPlan.meals[mt].reduce((s, m) => s + (getMealCalories(m, allIngredients) ?? 0), 0),
    0,
  );



  const mobileDateTitle = format(date, "d 'de' MMMM", { locale: es });
  const weekNum = getISOWeek(date);

  const emptyNutriBanner =
    !hasAnyMealsThisWeek && onNavigateToAssistant ? (
      <div className="flex flex-col items-center gap-3 rounded-[1.5rem] bg-accent/10 px-4 py-5 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/20">
          <Sparkles size={20} className="text-accent" />
        </div>
        <div>
          <p className="text-sm font-heading font-bold text-text-primary">No tenés nada planificado</p>
          <p className="mt-1 text-xs font-body text-muted">Pedile a Nutri que te arme la semana</p>
        </div>
        <button
          type="button"
          onClick={onNavigateToAssistant}
          className="min-h-[48px] rounded-2xl bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
        >
          Ir a Nutri
        </button>
      </div>
    ) : null;

  const activeMealBanner =
    today && activeMealType ? (
      <div className="flex items-center gap-3 rounded-[1.25rem] bg-accent/10 px-4 py-3">
        <span className="text-xl">{MEAL_ICONS[activeMealType]}</span>
        <div>
          <p className="text-sm font-heading font-bold text-accent">
            Ahora deberías: {MEAL_TYPE_LABELS[activeMealType]}
          </p>
          <p className="text-[11px] font-body text-muted">{MEAL_TIME_LABELS[activeMealType]}</p>
        </div>
      </div>
    ) : null;

  const notesSection = (
    <div>
      <button
        type="button"
        onClick={() => setNotesExpanded(!notesExpanded)}
        className="mb-1 text-xs font-body text-muted transition-colors hover:text-text-primary"
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
          className="w-full resize-none rounded-xl border border-border/30 bg-surface2/40 px-3 py-2.5 text-sm font-body text-text-primary outline-none transition-all placeholder:text-muted focus:border-accent/40"
          aria-label="Notas del día"
        />
      )}
    </div>
  );

  const mealStackProps = {
    currentDate,
    dayPlan,
    today,
    activeMealType,
  };

  return (
    <div className="relative pb-28 md:pb-0">
      {/* ——— Mobile: cabecera interactiva ——— */}
      <div className="mb-6 space-y-6 md:hidden">
        <div className="flex items-end justify-between">
          <div className="space-y-1">
            <p className="text-[#895100] font-medium text-sm uppercase tracking-widest">Hoy</p>
            <h1 className="font-heading font-extrabold text-4xl text-[#191c17]">{mobileDateTitle}</h1>
          </div>
          <div className="flex bg-[#f3f5eb] p-1 rounded-full">
            <button className="px-4 py-2 rounded-full text-xs font-bold bg-[#226046] text-[#ffffff] shadow-sm">Día</button>
          </div>
        </div>

        <div className="flex justify-between items-center overflow-x-auto hide-scrollbar py-2">
          {[-3, -2, -1, 0, 1, 2, 3].map((offset) => {
            const d = new Date(date);
            d.setDate(d.getDate() + offset);
            const isSelected = offset === 0;
            const key = formatDateKey(d);
            return (
              <button
                key={key}
                type="button"
                onClick={() => setCurrentDate(key)}
                className={clsx(
                  "flex flex-col items-center gap-2 py-4 rounded-2xl transition-all border-none outline-none",
                  isSelected
                    ? "px-5 bg-[#226046] text-[#ffffff] shadow-lg scale-110 ring-4 ring-[#f8faf1]"
                    : "px-3 text-[#40493d]"
                )}
              >
                <span className="text-[10px] font-bold uppercase tracking-tighter">{format(d, 'EEE', { locale: es }).slice(0, 3)}</span>
                <span className={clsx("font-bold", isSelected ? "text-xl font-black" : "text-lg")}>{format(d, 'dd')}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ——— Desktop: cabecera estilo bento ——— */}
      <header className="mb-12 hidden items-center justify-between md:flex no-print">
        <div>
          <h2 className="mb-2 font-heading text-4xl font-extrabold tracking-tighter text-[#226046] capitalize">
            {formatDayFull(date)}
          </h2>
          <div className="flex items-center gap-2 text-[#5a6258]">
            <span className="text-sm font-medium">Semana {weekNum} · Plan Nutricional</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex bg-[#f3f5eb] rounded-full p-1 shadow-sm items-center">
            <button
              onClick={() => navDay('prev')}
              className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-[#edefe6]"
            >
              <ChevronLeft size={20} className="text-[#5a6258]" />
            </button>
            <button
              onClick={goToToday}
              className="px-6 text-sm font-bold text-[#226046]"
            >
              Hoy
            </button>
            <button
              onClick={() => navDay('next')}
              className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-[#edefe6]"
            >
              <ChevronRight size={20} className="text-[#5a6258]" />
            </button>
          </div>
        </div>
      </header>

      {/* ——— Bento Grid Layout ——— */}
      <div className="hidden gap-8 md:grid md:grid-cols-12">
        {/* Daily Summary */}
        <div className="col-span-12 lg:col-span-4 rounded-3xl overflow-hidden flex flex-col">
          <DaySummaryCard consumedKcal={totalCals} budgetKcal={budgetKcal} showCalories={showCalories} />
        </div>

        {/* Breakfast */}
        <div className="col-span-12 lg:col-span-8">
          <MealColumn mt="desayuno" {...mealStackProps} />
        </div>

        {/* Lunch */}
        <div className="col-span-12 lg:col-span-6">
          <MealColumn mt="almuerzo" {...mealStackProps} />
        </div>

        {/* Snack & Dinner Column */}
        <div className="col-span-12 lg:col-span-6 space-y-8">
          <MealColumn mt="snack" {...mealStackProps} />
          <MealColumn mt="cena" {...mealStackProps} />
          <HydrationCard />
        </div>
      </div>

      {/* ——— Mobile: columna única ——— */}
      <div className="space-y-4 md:hidden">
        {emptyNutriBanner}
        {activeMealBanner}
        <DaySummaryCard consumedKcal={totalCals} budgetKcal={budgetKcal} showCalories={showCalories} />
        {MEAL_TYPE_ORDER.map((mt) => (
          <MealColumn key={mt} mt={mt} {...mealStackProps} />
        ))}
        <HydrationCard />
        {notesSection}
      </div>

      {/* CTA móvil flotante */}
      {onNavigateToAssistant && (
        <div className="pointer-events-none fixed bottom-[5.5rem] left-0 right-0 z-30 px-6 md:hidden safe-bottom pb-6">
          <button
            type="button"
            onClick={onNavigateToAssistant}
            className="pointer-events-auto w-full bg-[#226046] text-[#ffffff] font-heading font-bold py-5 px-8 rounded-xl shadow-xl flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
          >
            <Plus size={24} strokeWidth={2.5} />
            Agregar Comida
          </button>
        </div>
      )}
    </div>
  );
}
