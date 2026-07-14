import { getDay, parseISO } from 'date-fns';
import type { Goal, WeekPlanningProfile, WeekdayFlexMode, WeekdayFlexRule } from '../types';
import { DEFAULT_WEEK_PLANNING } from '../types';

export const WEEKDAY_LABELS_SHORT = [
  { weekday: 1, label: 'Lun' },
  { weekday: 2, label: 'Mar' },
  { weekday: 3, label: 'Mié' },
  { weekday: 4, label: 'Jue' },
  { weekday: 5, label: 'Vie' },
  { weekday: 6, label: 'Sáb' },
  { weekday: 0, label: 'Dom' },
] as const;

export const WEEKDAY_FLEX_MODE_LABELS: Record<WeekdayFlexMode, string> = {
  normal: 'Plan normal',
  maintenance: 'Mantenimiento',
  full_free: 'Día libre',
};

export const PRESET_WEEKEND_FLEXIBLE: WeekdayFlexRule[] = [
  { weekday: 6, mode: 'maintenance', nickname: 'Edgy' },
  { weekday: 0, mode: 'full_free' },
];

/** Defaults sugeridos según objetivo (SP-5: delegación con mínima config). */
export function getSmartWeekPlanningDefaults(goal?: Goal): Omit<WeekPlanningProfile, 'completedAt'> {
  if (goal === 'lose' || goal === 'maintain') {
    return {
      ...DEFAULT_WEEK_PLANNING,
      weekdayFlexRules: [...PRESET_WEEKEND_FLEXIBLE],
    };
  }
  return { ...DEFAULT_WEEK_PLANNING };
}

export function getWeekdayFromDateKey(dateKey: string): number {
  return getDay(parseISO(dateKey));
}

export function getFlexRuleForWeekday(
  weekday: number,
  rules: WeekdayFlexRule[],
): WeekdayFlexRule | undefined {
  return rules.find((r) => r.weekday === weekday);
}

export function getFlexModeForDate(
  dateKey: string,
  rules: WeekdayFlexRule[],
): WeekdayFlexMode {
  const rule = getFlexRuleForWeekday(getWeekdayFromDateKey(dateKey), rules);
  return rule?.mode ?? 'normal';
}

export function getDayDisplayLabel(
  dateKey: string,
  rules: WeekdayFlexRule[],
): string | undefined {
  const rule = getFlexRuleForWeekday(getWeekdayFromDateKey(dateKey), rules);
  if (!rule || rule.mode === 'normal') return undefined;
  if (rule.nickname?.trim()) return rule.nickname.trim();
  return WEEKDAY_FLEX_MODE_LABELS[rule.mode];
}

/** Migra perfiles guardados antes de weekdayFlexRules. */
export function normalizeWeekPlanningProfile(
  raw: WeekPlanningProfile,
): WeekPlanningProfile {
  if (raw.weekdayFlexRules && raw.weekdayFlexRules.length > 0) {
    return raw;
  }

  const rules: WeekdayFlexRule[] = [];
  if ((raw.flexMealsPerWeek ?? 0) > 0 && raw.preferredFlexWeekdays?.length) {
    for (const wd of raw.preferredFlexWeekdays) {
      rules.push({
        weekday: wd,
        mode: raw.flexMealScope === 'meal_plus_snack' ? 'maintenance' : 'full_free',
      });
    }
  }

  return { ...raw, weekdayFlexRules: rules };
}

export interface FlexGuidanceMessage {
  tone: 'info' | 'tip';
  text: string;
}

export function buildFlexGuidanceMessages(params: {
  goal: Goal;
  weekdayFlexRules: WeekdayFlexRule[];
  weightKg?: number;
}): FlexGuidanceMessage[] {
  const { goal, weekdayFlexRules } = params;
  const messages: FlexGuidanceMessage[] = [];

  const fullFreeCount = weekdayFlexRules.filter((r) => r.mode === 'full_free').length;
  const maintenanceCount = weekdayFlexRules.filter((r) => r.mode === 'maintenance').length;
  const hasWeekendPair =
    weekdayFlexRules.some((r) => r.weekday === 6 && r.mode === 'maintenance')
    && weekdayFlexRules.some((r) => r.weekday === 0 && r.mode === 'full_free');

  if (hasWeekendPair) {
    messages.push({
      tone: 'tip',
      text: 'Sábado en mantenimiento (sin déficit ese día) y domingo libre encajan con muchas rutinas: la semana se compensa entre lunes y viernes.',
    });
  }

  if (goal === 'lose' && fullFreeCount >= 2) {
    messages.push({
      tone: 'info',
      text: 'Con varios días libres y objetivo de bajar peso, conviene que el resto de la semana sea bastante consistente. Mucha gente igual baja ~0,5–1 kg por semana si el conjunto le cierra.',
    });
  }

  if (goal === 'lose' && maintenanceCount + fullFreeCount >= 3) {
    messages.push({
      tone: 'info',
      text: 'Tenés varios días sin déficit planificado. No es “incorrecto”: es una elección. Si notás que el progreso se frena, podés pasar un día libre a mantenimiento.',
    });
  }

  if (fullFreeCount === 0 && maintenanceCount === 0 && goal === 'lose') {
    messages.push({
      tone: 'tip',
      text: 'Sin días flex, el plan es más uniforme. Podés sumar un sábado en mantenimiento o un domingo libre si te ayuda a sostenerlo.',
    });
  }

  messages.push({
    tone: 'info',
    text: 'Mantenimiento = calorías de equilibrio (sin restar para déficit). Día libre = sin menú planificado; vos elegís qué comer.',
  });

  return messages;
}

export function formatWeekdayRulesForPrompt(rules: WeekdayFlexRule[]): string {
  if (!rules.length) {
    return 'Todos los días: plan normal con objetivo del usuario (déficit o meta elegida).';
  }

  const lines = rules.map((r) => {
    const day = WEEKDAY_LABELS_SHORT.find((d) => d.weekday === r.weekday)?.label ?? String(r.weekday);
    if (r.mode === 'full_free') {
      return `${day}: DÍA LIBRE TOTAL — dayMode "full_free", slots: [] (sin comidas planificadas).`;
    }
    if (r.mode === 'maintenance') {
      const nick = r.nickname ? ` (${r.nickname})` : '';
      return `${day}: MANTENIMIENTO${nick} — dayMode "maintenance", planificá comidas normales pero más flexibles; isFlexMeal puede ser true en 1 comida.`;
    }
    return `${day}: normal`;
  });

  return `Reglas por día:\n${lines.join('\n')}`;
}

export function countPlannedDays(rules: WeekdayFlexRule[]): number {
  const flexWeekdays = new Set(
    rules.filter((r) => r.mode === 'full_free').map((r) => r.weekday),
  );
  return 7 - flexWeekdays.size;
}
