import type { PlanPreferences, WeekRepetitionMode } from '../types';

const DEFAULT: PlanPreferences = {
  variety: 'normal',
  cookingTime: 'normal',
  budget: 'normal',
};

/**
 * Etiquetas fijas (la app las muestra; no vienen de Gemini).
 * Solo variedad/repetición — el tiempo de cocina se mezcla en el plan (normal) salvo que el usuario pida otra cosa en chat.
 */
export const WEEK_PLAN_PHASE1_QUICK_REPLIES = [
  'Variedad total',
  'Repetir bloques',
  'Equilibrado',
  'Como funciona esto',
] as const;

/** Chip de ayuda fase 1 — no actualiza preferencias. */
export function isWeekPlanHelpChipMessage(text: string): boolean {
  return /^c[oó]mo\s+funciona\s+esto\??$/i.test(text.trim());
}

function inferCookingTimeHint(text: string): PlanPreferences['cookingTime'] {
  if (/\br[aá]pid|pr[aá]ctic|algo\s+r[aá]pido|poco\s+tiempo/i.test(text)) return 'rapido';
  if (/\belaborad|tengo\s+tiempo|m[aá]s\s+tiempo|sin\s+apur/i.test(text)) return 'elaborado';
  return 'normal';
}

function inferVarietyBlock(
  text: string,
): {
  variety: PlanPreferences['variety'];
  weekRepetitionMode: WeekRepetitionMode;
  cookingTime?: PlanPreferences['cookingTime'];
} | null {
  const t = text.trim();
  if (t.length < 2) return null;

  const key = t
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // Fase 1 — chips cortos (sin elección de tiempo; cookingTime queda normal = mezcla en la semana)
  if (key === 'variedad total') {
    return { variety: 'mucha', weekRepetitionMode: 'full_unique', cookingTime: 'normal' };
  }
  if (key === 'repetir bloques' || key === 'repetir comidas') {
    return { variety: 'poca', weekRepetitionMode: 'repeat_blocks', cookingTime: 'normal' };
  }
  if (key === 'equilibrado') {
    return { variety: 'normal', weekRepetitionMode: 'balanced', cookingTime: 'normal' };
  }

  const n = key;

  // Compat: etiquetas largas anteriores (misma semántica, sin fijar tiempo)
  if (/\bvariedad\s+total\b/.test(n) && /\btengo\s+tiempo\b/.test(n)) {
    return { variety: 'mucha', weekRepetitionMode: 'full_unique', cookingTime: 'normal' };
  }
  if (/\brepetir\s+comidas\b/.test(n) && (/\bcocino\s+menos\b/.test(n) || /\basi\s+cocino\b/.test(n))) {
    return { variety: 'poca', weekRepetitionMode: 'repeat_blocks', cookingTime: 'normal' };
  }
  if (
    /\bequilibrad/.test(n) &&
    (/\bun\s+poco\s+de\s+cada\b/.test(n) || /\bpoco\s+de\s+cada\b/.test(n))
  ) {
    return { variety: 'normal', weekRepetitionMode: 'balanced', cookingTime: 'normal' };
  }

  let mode: WeekRepetitionMode | undefined;
  let variety: PlanPreferences['variety'] | undefined;

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
  return { variety: variety ?? DEFAULT.variety, weekRepetitionMode: mode };
}

/**
 * Tiempo de cocina explícito en mensaje (ej. "rápido"), sin tocar modo de variedad.
 */
function inferCookingStepOnly(text: string): Partial<PlanPreferences> | null {
  const t = text.trim();
  if (t.length < 2) return null;

  if (isWeekPlanHelpChipMessage(t)) return null;
  if (/\?/.test(t) && /variedad|elij(o|á)|c[oó]mo/i.test(t)) return null;
  if (inferVarietyBlock(text)) return null;

  if (/^rápido$/i.test(t) || /^rapido$/i.test(t) || /^práctico$/i.test(t) || /^practico$/i.test(t)) {
    return { cookingTime: 'rapido' };
  }
  if (/^normal$/i.test(t)) return { cookingTime: 'normal' };
  if (/^con tiempo$/i.test(t) || /^elaborado$/i.test(t)) return { cookingTime: 'elaborado' };

  const ct = inferCookingTimeHint(t);
  if (ct !== 'normal') return { cookingTime: ct };
  return null;
}

/**
 * Interpreta chips o mensajes del usuario sobre variedad/repetición o tiempo (plan semanal).
 * Devuelve parcial para fusionar con preferencias guardadas; null si no hay señal clara.
 */
export function inferPlanPreferencesFromUserText(text: string): Partial<PlanPreferences> | null {
  if (isWeekPlanHelpChipMessage(text)) return null;

  const variety = inferVarietyBlock(text);
  if (variety) {
    return {
      ...DEFAULT,
      variety: variety.variety,
      weekRepetitionMode: variety.weekRepetitionMode,
      cookingTime: variety.cookingTime ?? inferCookingTimeHint(text),
    };
  }
  return inferCookingStepOnly(text);
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
