import { useState, useEffect, useMemo } from 'react';
import { clsx } from 'clsx';
import { ArrowRight, CalendarDays } from 'lucide-react';
import type {
  MealPattern,
  MealRhythmMode,
  WeekPlanningProfile,
  WeekdayFlexMode,
  WeekdayFlexRule,
} from '../../types';
import {
  MEAL_PATTERN_LABELS,
  MEAL_RHYTHM_LABELS,
  DEFAULT_WEEK_PLANNING,
} from '../../types';
import { Button } from '../ui/Button';
import { BottomSheet } from '../ui/BottomSheet';
import { Modal } from '../ui/Modal';
import { useWeekPlanningStore } from '../../store/useWeekPlanningStore';
import { useProfileStore } from '../../store/useProfileStore';
import { JOURNAL } from '../assistant/journalTokens';
import {
  WEEKDAY_LABELS_SHORT,
  WEEKDAY_FLEX_MODE_LABELS,
  PRESET_WEEKEND_FLEXIBLE,
  buildFlexGuidanceMessages,
  normalizeWeekPlanningProfile,
} from '../../utils/flexDayHelpers';

interface WeekPlanningSetupProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
  existing?: WeekPlanningProfile | null;
}

type Step = 0 | 1 | 2 | 3;

const ALL_WEEKDAYS = [1, 2, 3, 4, 5, 6, 0] as const;

function ChoiceButton({
  active,
  title,
  subtitle,
  onClick,
}: {
  active: boolean;
  title: string;
  subtitle?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'w-full p-4 rounded-[2rem] transition-all text-left shadow-[0px_8px_24px_rgba(25,28,23,0.06)] min-h-[48px]',
        active ? 'bg-[#226046] text-[#f8faf6]' : 'bg-white text-[#191c17] hover:shadow-[0px_12px_28px_rgba(25,28,23,0.08)]',
      )}
    >
      <p className={clsx('text-sm font-body font-semibold', active ? 'text-[#f8faf6]' : 'text-[#191c17]')}>
        {title}
      </p>
      {subtitle && (
        <p className={clsx('text-xs font-body mt-1', active ? 'text-[#f8faf6]/80' : 'text-[#5a6258]')}>
          {subtitle}
        </p>
      )}
    </button>
  );
}

function rulesFromProfile(raw: WeekPlanningProfile): Record<number, WeekdayFlexRule | null> {
  const normalized = normalizeWeekPlanningProfile(raw);
  const map: Record<number, WeekdayFlexRule | null> = {
    0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null,
  };
  for (const r of normalized.weekdayFlexRules) {
    map[r.weekday] = r;
  }
  return map;
}

function mapToRules(map: Record<number, WeekdayFlexRule | null>): WeekdayFlexRule[] {
  return ALL_WEEKDAYS.map((wd) => map[wd]).filter((r): r is WeekdayFlexRule => r != null);
}

export function WeekPlanningSetup({
  isOpen,
  onClose,
  onComplete,
  existing,
}: WeekPlanningSetupProps) {
  const persistWeekPlanning = useWeekPlanningStore((s) => s.persistWeekPlanning);
  const saveError = useWeekPlanningStore((s) => s.saveError);
  const clearSaveError = useWeekPlanningStore((s) => s.clearSaveError);
  const profile = useProfileStore((s) => s.profile);

  const base = existing
    ? normalizeWeekPlanningProfile(existing)
    : { ...DEFAULT_WEEK_PLANNING, completedAt: '' };

  const [step, setStep] = useState<Step>(0);
  const [mealPattern, setMealPattern] = useState<MealPattern>(base.mealPattern);
  const [mealRhythmMode, setMealRhythmMode] = useState<MealRhythmMode>(base.mealRhythmMode);
  const [streakDays, setStreakDays] = useState<2 | 3 | 4>(base.streakDays ?? 3);
  const [dayRules, setDayRules] = useState<Record<number, WeekdayFlexRule | null>>(() =>
    rulesFromProfile(base),
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) clearSaveError();
  }, [isOpen, clearSaveError]);

  const weekdayFlexRules = useMemo(() => mapToRules(dayRules), [dayRules]);

  const guidance = useMemo(
    () =>
      buildFlexGuidanceMessages({
        goal: profile?.goal ?? 'maintain',
        weekdayFlexRules,
        weightKg: profile?.weightKg,
      }),
    [profile?.goal, profile?.weightKg, weekdayFlexRules],
  );

  const setDayMode = (weekday: number, mode: WeekdayFlexMode) => {
    setDayRules((prev) => {
      const next = { ...prev };
      if (mode === 'normal') {
        next[weekday] = null;
      } else {
        const prevRule = next[weekday];
        next[weekday] = {
          weekday,
          mode,
          nickname:
            weekday === 6 && mode === 'maintenance'
              ? prevRule?.nickname ?? 'Edgy'
              : prevRule?.nickname,
        };
      }
      return next;
    });
  };

  const applyPresetWeekend = () => {
    setDayRules((prev) => {
      const next = { ...prev };
      for (const r of PRESET_WEEKEND_FLEXIBLE) {
        next[r.weekday] = { ...r };
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    const wp: WeekPlanningProfile = {
      mealPattern,
      mealRhythmMode,
      streakDays: mealRhythmMode === 'streak' ? streakDays : undefined,
      weekdayFlexRules,
      cookingTime: base.cookingTime,
      budget: base.budget,
      completedAt: new Date().toISOString(),
    };
    const ok = await persistWeekPlanning(wp);
    setSaving(false);
    if (ok) {
      onComplete?.();
      onClose();
    }
  };

  const content = (
    <div className="space-y-5 pb-2">
      <div className="flex items-center gap-3 px-1">
        <div className="w-10 h-10 rounded-full bg-[#226046]/10 flex items-center justify-center text-[#226046]">
          <CalendarDays size={20} />
        </div>
        <div>
          <p className="font-heading text-sm font-bold text-[#191c17]">
            {existing?.completedAt ? 'Editar rutina semanal' : 'Tu forma de planificar'}
          </p>
          <p className="text-xs font-body text-[#707a6c]">Paso {step + 1} de 4</p>
        </div>
      </div>

      {step === 0 && (
        <div className="space-y-3">
          <p className="text-center font-heading text-base font-bold text-[#191c17]">
            ¿Cómo organizás tus comidas?
          </p>
          {(Object.keys(MEAL_PATTERN_LABELS) as MealPattern[]).map((p) => (
            <ChoiceButton
              key={p}
              active={mealPattern === p}
              title={MEAL_PATTERN_LABELS[p]}
              onClick={() => setMealPattern(p)}
            />
          ))}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          <p className="text-center font-heading text-base font-bold text-[#191c17]">
            ¿Cómo querés armar la semana?
          </p>
          {(Object.keys(MEAL_RHYTHM_LABELS) as MealRhythmMode[]).map((m) => (
            <ChoiceButton
              key={m}
              active={mealRhythmMode === m}
              title={MEAL_RHYTHM_LABELS[m]}
              onClick={() => setMealRhythmMode(m)}
            />
          ))}
          {mealRhythmMode === 'streak' && (
            <div className="flex gap-2 pt-1">
              {([2, 3, 4] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setStreakDays(n)}
                  className={clsx(
                    'flex-1 py-3 rounded-[1.25rem] text-sm font-body font-medium min-h-[48px]',
                    streakDays === n
                      ? 'bg-[#226046] text-[#f8faf6]'
                      : 'bg-white text-[#5a6258] shadow-[0px_8px_24px_rgba(25,28,23,0.06)]',
                  )}
                >
                  {n} días
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="text-center font-heading text-base font-bold text-[#191c17]">
            Días flexibles de tu semana
          </p>
          <p className="text-center text-xs font-body text-[#707a6c] px-2">
            Personalizá cada día. Mantenimiento = calorías de equilibrio (sin déficit). Día libre = sin menú planificado.
          </p>

          <ChoiceButton
            active={false}
            title="Preset: sábado mantenimiento + domingo libre"
            subtitle="Sábado «Edgy» en mantenimiento y domingo 100% libre"
            onClick={applyPresetWeekend}
          />

          <div className="space-y-2">
            {WEEKDAY_LABELS_SHORT.map(({ weekday, label }) => {
              const rule = dayRules[weekday];
              const mode: WeekdayFlexMode = rule?.mode ?? 'normal';
              return (
                <div
                  key={weekday}
                  className="rounded-[1.25rem] bg-white p-3 shadow-[0px_8px_24px_rgba(25,28,23,0.06)]"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-sm font-body font-semibold text-[#191c17]">{label}</span>
                    {rule?.nickname && (
                      <span className="text-[10px] font-body text-[#226046] uppercase tracking-wide">
                        {rule.nickname}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {(['normal', 'maintenance', 'full_free'] as WeekdayFlexMode[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setDayMode(weekday, m)}
                        className={clsx(
                          'flex-1 py-2 px-1 rounded-xl text-[10px] font-body font-medium min-h-[40px] leading-tight',
                          mode === m
                            ? 'bg-[#226046] text-[#f8faf6]'
                            : 'bg-[#f3f5eb] text-[#40493d]',
                        )}
                      >
                        {m === 'normal' ? 'Normal' : m === 'maintenance' ? 'Mant.' : 'Libre'}
                      </button>
                    ))}
                  </div>
                  {weekday === 6 && mode === 'maintenance' && (
                    <input
                      type="text"
                      value={dayRules[6]?.nickname ?? 'Edgy'}
                      onChange={(e) =>
                        setDayRules((prev) => ({
                          ...prev,
                          6: {
                            weekday: 6,
                            mode: 'maintenance',
                            nickname: e.target.value.trim() || 'Edgy',
                          },
                        }))
                      }
                      placeholder="Nombre (ej. Edgy)"
                      className="mt-2 w-full rounded-xl border border-[#e1e3da] px-3 py-2 text-sm font-body"
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="rounded-[1.25rem] bg-[#f3f5eb] p-3 space-y-2">
            <p className="text-xs font-body font-semibold text-[#226046]">Notas para vos</p>
            {guidance.map((g, i) => (
              <p
                key={i}
                className={clsx(
                  'text-xs font-body leading-relaxed',
                  g.tone === 'tip' ? 'text-[#191c17]' : 'text-[#5a6258]',
                )}
              >
                {g.text}
              </p>
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <div
          className="rounded-[2rem] p-4 space-y-2 shadow-[0px_12px_32px_rgba(25,28,23,0.06)]"
          style={{ backgroundColor: JOURNAL.primary }}
        >
          <p className="font-heading text-sm font-bold text-[#f8faf6]">Resumen</p>
          <ul className="text-xs font-body text-[#f8faf6]/90 space-y-1 list-disc pl-4">
            <li>{MEAL_PATTERN_LABELS[mealPattern]}</li>
            <li>{MEAL_RHYTHM_LABELS[mealRhythmMode]}{mealRhythmMode === 'streak' ? ` (${streakDays} días)` : ''}</li>
            <li>
              {weekdayFlexRules.length === 0
                ? 'Todos los días con plan normal'
                : weekdayFlexRules
                    .map((r) => {
                      const lbl = WEEKDAY_LABELS_SHORT.find((d) => d.weekday === r.weekday)?.label;
                      const name = r.nickname ?? WEEKDAY_FLEX_MODE_LABELS[r.mode];
                      return `${lbl}: ${name}`;
                    })
                    .join(' · ')}
            </li>
          </ul>
        </div>
      )}

      {saveError && (
        <p className="text-sm text-red-600 font-body px-1" role="alert">
          {saveError}
        </p>
      )}

      <div className="flex gap-2 pt-1">
        {step > 0 && (
          <Button tone="journal" variant="secondary" onClick={() => setStep((s) => (s - 1) as Step)} fullWidth>
            Anterior
          </Button>
        )}
        {step < 3 ? (
          <Button tone="journal" variant="primary" onClick={() => setStep((s) => (s + 1) as Step)} fullWidth>
            Siguiente
          </Button>
        ) : (
          <Button tone="journal" variant="primary" onClick={handleSave} disabled={saving} fullWidth>
            <span className="inline-flex items-center justify-center gap-2">
              {saving ? 'Guardando…' : 'Guardar rutina'}
              <ArrowRight size={18} strokeWidth={2.25} aria-hidden />
            </span>
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title={existing?.completedAt ? 'Mi rutina semanal' : 'Configurar rutina'}
        snap="full"
        tone="journal"
      >
        {content}
      </BottomSheet>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={existing?.completedAt ? 'Mi rutina semanal' : 'Configurar rutina'}
        tone="journal"
      >
        {content}
      </Modal>
    </>
  );
}
