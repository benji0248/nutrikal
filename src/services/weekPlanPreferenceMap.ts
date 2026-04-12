import type { PlanPreferences, WeekRepetitionMode } from '../types';

const DEFAULT: PlanPreferences = {
  variety: 'normal',
  cookingTime: 'normal',
  budget: 'normal',
};

function inferCookingTimeHint(text: string): PlanPreferences['cookingTime'] {
  if (/\br[aá]pid|pr[aá]ctic|algo\s+r[aá]pido|poco\s+tiempo/i.test(text)) return 'rapido';
  if (/\belaborad|tengo\s+tiempo|m[aá]s\s+tiempo|sin\s+apur/i.test(text)) return 'elaborado';
  return 'normal';
}

/**
 * Interpreta chips o mensajes del usuario sobre variedad/repetición para la semana (6+1).
 * Devuelve parcial para fusionar con preferencias guardadas; null si no hay señal clara.
 */
export function inferPlanPreferencesFromUserText(text: string): Partial<PlanPreferences> | null {
  const t = text.trim();
  if (t.length < 4) return null;

  let mode: WeekRepetitionMode | undefined;
  let variety: PlanPreferences['variety'] | undefined;

  // Prioridad: "un poco de ambos" / balance
  if (/\bun poco de ambos\b/i.test(t) || /\bbalance\b/i.test(t) || /\bmezcla\b.*\bvariedad\b/i.test(t)) {
    mode = 'balanced';
    variety = 'normal';
  } else if (/\bvariedad total\b/i.test(t) || /\bsin repetir\b/i.test(t) || /ning[uú]n plato repetido/i.test(t)) {
    mode = 'full_unique';
    variety = 'mucha';
  } else if (
    /\brepetir comidas\b/i.test(t) ||
    /\brepetir bloques\b/i.test(t) ||
    /\bcocinar menos\b/i.test(t) ||
    (/\brepetir\b/i.test(t) && /\bcomidas?\b/i.test(t))
  ) {
    mode = 'repeat_blocks';
    variety = 'poca';
  }

  if (!mode) return null;

  return {
    ...DEFAULT,
    variety: variety ?? DEFAULT.variety,
    weekRepetitionMode: mode,
    cookingTime: inferCookingTimeHint(t),
  };
}

/**
 * Preferencias finales para un request de chat: defaults + estado guardado + inferencia del turno actual.
 */
export function buildPreferencesForChatRequest(params: {
  stored: PlanPreferences | null;
  lastUserMessage: string;
  extra?: PlanPreferences | null;
}): PlanPreferences | null {
  const patch = inferPlanPreferencesFromUserText(params.lastUserMessage);
  const merged: PlanPreferences = {
    ...DEFAULT,
    ...(params.stored ?? {}),
    ...(params.extra ?? {}),
    ...(patch ?? {}),
  };

  const hasWeekMode =
    merged.weekRepetitionMode != null ||
    params.stored?.weekRepetitionMode != null ||
    patch?.weekRepetitionMode != null;

  if (!hasWeekMode) {
    return null;
  }
  return merged;
}
