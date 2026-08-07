import { useMemo, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { format, getISOWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { clsx } from 'clsx';
import { useCalendarStore, createEmptyDayPlan } from '../../store/useCalendarStore';
import { useProfileStore } from '../../store/useProfileStore';
import { useWeekPlanningStore } from '../../store/useWeekPlanningStore';
import {
  parseDate,
  isToday,
  formatDayFull,
  formatDateKey,
} from '../../utils/dateHelpers';
import { resolveDayFlex } from '../../utils/flexDayHelpers';
import { getCurrentMealType } from '../../utils/mealTimeHelpers';
import { MealSlot } from '../meals/MealSlot';
import { MEAL_TYPE_ORDER, MEAL_TYPE_LABELS } from '../../types';
import type { MealType } from '../../types';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useIngredientsStore } from '../../store/useIngredientsStore';
import { INGREDIENTS_DB } from '../../data/ingredients';
import { getMealCalories, DAILY_REFERENCE } from '../../utils/macroHelpers';
import { DaySummaryCard } from './DaySummaryCard';

/** Secuencia cronológica del día — refuerza continuidad del plan. */
const PLAN_DISPLAY_ORDER: MealType[] = ['desayuno', 'almuerzo', 'snack', 'cena'];

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

interface DayViewProps {
  onNavigateToAssistant?: () => void;
  onOpenMealChat?: (date: string, mealType: MealType, existingMealName?: string) => void;
}

function MealColumn({
  currentDate,
  mt,
  dayPlan,
  today,
  activeMealType,
  onOpenMealChat,
  embedded = false,
}: {
  currentDate: string;
  mt: MealType;
  dayPlan: ReturnType<typeof createEmptyDayPlan>;
  today: boolean;
  activeMealType: MealType | null;
  onOpenMealChat?: (date: string, mealType: MealType, existingMealName?: string) => void;
  embedded?: boolean;
}) {
  const isActive = today && activeMealType === mt;
  const meals = dayPlan.meals[mt];

  return (
    <div
      className={clsx(
        'transition-all',
        !embedded && 'rounded-[1.25rem]',
        !embedded && isActive && 'ring-2 ring-accent/40 shadow-[0px_12px_32px_rgba(34,96,70,0.12)]',
      )}
    >
      <MealSlot
        date={currentDate}
        mealType={mt}
        meals={meals}
        domId={`meal-${mt}`}
        onOpenMealChat={onOpenMealChat}
        embedded={embedded}
        isActiveSlot={isActive}
      />
      {!embedded && isActive && meals.length === 0 && (
        <p className="py-1 text-center text-[10px] font-body text-accent/80">
          Es hora de {MEAL_TYPE_LABELS[mt].toLowerCase()}
        </p>
      )}
    </div>
  );
}

export function DayView({ onNavigateToAssistant, onOpenMealChat }: DayViewProps) {
  const currentDate = useCalendarStore((s) => s.currentDate);
  const setCurrentDate = useCalendarStore((s) => s.setCurrentDate);
  const navDay = useCalendarStore((s) => s.navigateDay);
  const goToToday = useCalendarStore((s) => s.goToToday);
  const dayPlans = useCalendarStore((s) => s.dayPlans);
  const storedPlan = dayPlans[currentDate];
  const dayPlan = useMemo(() => storedPlan ?? createEmptyDayPlan(currentDate), [storedPlan, currentDate]);
  const setNotes = useCalendarStore((s) => s.setNotes);
  const getMetabolicResult = useProfileStore((s) => s.getMetabolicResult);
  const weekPlanning = useWeekPlanningStore((s) => s.weekPlanning);

  const date = useMemo(() => parseDate(currentDate), [currentDate]);
  const today = isToday(date);

  const flexInfo = useMemo(
    () =>
      resolveDayFlex(
        currentDate,
        weekPlanning?.weekdayFlexRules ?? [],
        { dayMode: dayPlan.dayMode, dayLabel: dayPlan.dayLabel },
      ),
    [currentDate, weekPlanning?.weekdayFlexRules, dayPlan.dayMode, dayPlan.dayLabel],
  );
  const isFullFree = flexInfo.mode === 'full_free';

  const showCalories = useSettingsStore((s) => s.showCalories);
  const customIngredients = useIngredientsStore((s) => s.customIngredients);
  const allIngredients = useMemo(() => [...INGREDIENTS_DB, ...customIngredients], [customIngredients]);

  const metabolic = getMetabolicResult();
  const budgetKcal = metabolic?.budget ?? DAILY_REFERENCE.calories;

  const filledMealsCount = MEAL_TYPE_ORDER.filter((mt) => dayPlan.meals[mt].length > 0).length;
  const totalMealSlots = MEAL_TYPE_ORDER.length;

  const [activeMealType, setActiveMealType] = useState<MealType | null>(getCurrentMealType);
  const [notesValue, setNotesValue] = useState(dayPlan.notes);
  const [notesExpanded, setNotesExpanded] = useState(false);

  useEffect(() => {
    if (!today) {
      const timeout = setTimeout(() => {
        setActiveMealType(null);
      }, 0);
      return () => clearTimeout(timeout);
    }
    const syncTimeout = setTimeout(() => {
      setActiveMealType(getCurrentMealType());
    }, 0);
    const interval = setInterval(() => {
      setActiveMealType(getCurrentMealType());
    }, 60_000);
    return () => {
      clearTimeout(syncTimeout);
      clearInterval(interval);
    };
  }, [today]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setNotesValue(dayPlan.notes);
    }, 0);
    return () => clearTimeout(timeout);
  }, [dayPlan.notes]);

  const totalCals = MEAL_TYPE_ORDER.reduce(
    (sum, mt) => sum + dayPlan.meals[mt].reduce((s, m) => s + (getMealCalories(m, allIngredients) ?? 0), 0),
    0,
  );

  const openAssistantChat = useCallback(() => {
    if (onOpenMealChat) {
      const targetMeal =
        (today && activeMealType) ||
        PLAN_DISPLAY_ORDER.find((mt) => dayPlan.meals[mt].length === 0) ||
        'desayuno';
      onOpenMealChat(currentDate, targetMeal);
      return;
    }
    onNavigateToAssistant?.();
  }, [onOpenMealChat, onNavigateToAssistant, today, activeMealType, dayPlan.meals, currentDate]);

  const mobileDateTitle = format(date, "d 'de' MMMM", { locale: es });
  const weekNum = getISOWeek(date);

  const assistantBar =
    onNavigateToAssistant || onOpenMealChat ? (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-accent/20 bg-accent/[0.04] px-3.5 py-2.5 sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/12">
            <Sparkles size={15} className="text-accent" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-heading font-semibold text-text-primary">¿Qué cocinamos hoy?</p>
            <p className="truncate text-xs font-body text-muted">
              NutriKal te ayuda con tu plan — contale qué necesitás
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={openAssistantChat}
          className="shrink-0 rounded-xl border border-accent/35 bg-transparent px-3.5 py-2 text-xs font-medium text-accent transition-colors hover:bg-accent/10 sm:px-4 sm:text-sm"
        >
          Hablar con NutriKal
        </button>
      </div>
    ) : null;

  const activeMealBanner =
    today && activeMealType ? (
      <div className="flex items-center gap-3 rounded-[1.25rem] bg-accent/10 px-4 py-2.5">
        <span className="text-lg">{MEAL_ICONS[activeMealType]}</span>
        <div>
          <p className="text-sm font-heading font-bold text-accent">
            Ahora te toca: {MEAL_TYPE_LABELS[activeMealType]}
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

  const summaryCard = (
    <DaySummaryCard
      consumedKcal={totalCals}
      budgetKcal={budgetKcal}
      showCalories={showCalories}
      filledMealsCount={filledMealsCount}
      totalMealSlots={totalMealSlots}
    />
  );

  const mealStackProps = {
    currentDate,
    dayPlan,
    today,
    activeMealType,
    onOpenMealChat,
  };

  const fullFreeBlock = (
    <div className="rounded-2xl bg-[#f8faf1] px-5 py-4 text-center">
      <p className="font-body text-sm font-medium text-[#191c17]">Día libre</p>
      <p className="mt-1 text-xs font-body text-[#707a6c]">
        Sin menú planificado. Comé a tu ritmo; el resto de la semana sigue armado.
      </p>
    </div>
  );

  const dayPlanBlock = isFullFree ? (
    fullFreeBlock
  ) : (
    <div>
      <div className="mb-2.5 flex items-baseline justify-between gap-2 px-0.5">
        <h3 className="font-heading text-base font-bold text-text-primary">Plan del día</h3>
        {today && activeMealType && (
          <span className="text-xs font-body font-medium text-accent">
            Siguiente: {MEAL_TYPE_LABELS[activeMealType]}
          </span>
        )}
      </div>
      <div className="overflow-hidden rounded-3xl border border-border/25 bg-surface shadow-ambient divide-y divide-border/20">
        {PLAN_DISPLAY_ORDER.map((mt) => (
          <MealColumn key={mt} mt={mt} embedded {...mealStackProps} />
        ))}
      </div>
    </div>
  );

  return (
    <div className="relative pb-6 md:pb-0">
      {/* ——— Mobile: cabecera interactiva ——— */}
      <div className="mb-5 space-y-4 md:hidden">
        <div className="flex items-end justify-between">
          <div className="space-y-1">
            <p className="text-[#895100] font-medium text-sm uppercase tracking-widest">Hoy</p>
            <h1 className="font-heading font-extrabold text-4xl text-[#191c17]">{mobileDateTitle}</h1>
            {flexInfo.label && (
              <span className="mt-1 inline-block rounded-full bg-[#fd9d1a]/20 px-2.5 py-0.5 text-[11px] font-body font-semibold text-[#663b00]">
                {flexInfo.label}
              </span>
            )}
          </div>
          <div className="flex bg-[#f3f5eb] p-1 rounded-full">
            <button className="px-4 py-2 rounded-full text-xs font-bold bg-[#226046] text-[#ffffff] shadow-sm">Día</button>
          </div>
        </div>

        <div className="flex justify-between items-center overflow-x-auto hide-scrollbar py-1">
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
                  "relative flex flex-col items-center gap-2 py-4 rounded-2xl transition-all border-none outline-none",
                  isSelected
                    ? "px-5 bg-[#226046] text-[#ffffff] shadow-lg scale-110 ring-4 ring-[#f8faf1]"
                    : "px-3 text-[#40493d]"
                )}
              >
                <span className="text-[10px] font-bold uppercase tracking-tighter">{format(d, 'EEE', { locale: es }).slice(0, 3)}</span>
                <span className={clsx("font-bold", isSelected ? "text-xl font-black" : "text-lg")}>{format(d, 'dd')}</span>
                {(() => {
                  const stripPlan = dayPlans[key];
                  const stripFlex = resolveDayFlex(
                    key,
                    weekPlanning?.weekdayFlexRules ?? [],
                    { dayMode: stripPlan?.dayMode, dayLabel: stripPlan?.dayLabel },
                  );
                  if (stripFlex.mode === 'normal') return null;
                  return (
                    <span
                      className={clsx(
                        'absolute bottom-1.5 h-1.5 w-1.5 rounded-full',
                        isSelected ? 'bg-[#c1ffdd]' : stripFlex.mode === 'full_free' ? 'bg-[#895100]' : 'bg-[#226046]',
                      )}
                      aria-hidden
                    />
                  );
                })()}
              </button>
            );
          })}
        </div>
      </div>

      {/* ——— Desktop: cabecera ——— */}
      <header className="mb-6 hidden items-center justify-between md:flex no-print">
        <div>
          <h2 className="mb-1 font-heading text-3xl font-extrabold tracking-tighter text-[#226046] capitalize">
            {formatDayFull(date)}
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-[#5a6258]">
            <span className="text-sm font-medium">Semana {weekNum} · Plan Nutricional</span>
            {flexInfo.label && (
              <span className="rounded-full bg-[#fd9d1a]/20 px-2.5 py-0.5 text-[11px] font-body font-semibold text-[#663b00]">
                {flexInfo.label}
              </span>
            )}
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

      {/* ——— Desktop ——— */}
      <div className="hidden space-y-5 md:block">
        {assistantBar}

        <div className="grid gap-5 lg:grid-cols-12 lg:gap-6">
          <div className="lg:col-span-8">
            {dayPlanBlock}
          </div>
          <div className="lg:col-span-4">
            {summaryCard}
          </div>
        </div>
      </div>

      {/* ——— Mobile ——— */}
      <div className="space-y-3 md:hidden">
        {assistantBar}
        {activeMealBanner}
        {dayPlanBlock}
        {summaryCard}
        {notesSection}
      </div>
    </div>
  );
}
