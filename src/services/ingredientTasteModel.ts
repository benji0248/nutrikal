import type { DayPlan, Ingredient, IngredientSignalEntry } from '../types';
import { MEAL_TYPE_ORDER } from '../types';

const MS_PER_DAY = 86_400_000;
const SIGNAL_WINDOW_DAYS = 120;
const CALENDAR_WINDOW_DAYS = 21;
const MAX_POOL_HISTORY = 5;

export interface TasteSelectionContext {
  signals: IngredientSignalEntry[];
  recentPoolHistory: string[][];
  dayPlans?: Record<string, DayPlan>;
}

function daysSince(isoDate: string): number {
  const t = new Date(`${isoDate}T12:00:00`).getTime();
  if (Number.isNaN(t)) return 999;
  return Math.max(0, (Date.now() - t) / MS_PER_DAY);
}

function decay(days: number): number {
  if (days <= 14) return 1;
  if (days <= 45) return 0.7;
  if (days <= 90) return 0.45;
  return 0.25;
}

function buildIngredientLookup(ingredients: Ingredient[]): {
  byId: Map<string, Ingredient>;
  byName: Map<string, Ingredient>;
} {
  const byId = new Map<string, Ingredient>();
  const byName = new Map<string, Ingredient>();
  for (const ing of ingredients) {
    byId.set(ing.id, ing);
    byName.set(ing.name.toLowerCase().trim(), ing);
  }
  return { byId, byName };
}

function refsToIds(
  refs: string[],
  byName: Map<string, Ingredient>,
  byId: Map<string, Ingredient>,
): string[] {
  const out: string[] = [];
  for (const raw of refs) {
    const ref = raw.trim();
    if (!ref) continue;
    if (byId.has(ref)) {
      out.push(ref);
      continue;
    }
    const byN = byName.get(ref.toLowerCase());
    if (byN) out.push(byN.id);
  }
  return out;
}

function addScore(scores: Map<string, number>, id: string, delta: number): void {
  if (!id || delta === 0) return;
  scores.set(id, (scores.get(id) ?? 0) + delta);
}

/** Puntaje por ingrediente a partir del uso real (señales + calendario + fatiga de canasta). */
export function buildIngredientTasteScores(
  ingredients: Ingredient[],
  ctx: TasteSelectionContext,
): Map<string, number> {
  const { byId, byName } = buildIngredientLookup(ingredients);
  const scores = new Map<string, number>();

  for (const ing of ingredients) {
    scores.set(ing.id, 1);
  }

  const applyRefs = (refs: string[], delta: number, weight = 1) => {
    for (const id of refsToIds(refs, byName, byId)) {
      addScore(scores, id, delta * weight);
    }
  };

  for (const entry of ctx.signals) {
    const d = daysSince(entry.fecha);
    if (d > SIGNAL_WINDOW_DAYS) continue;
    const w = decay(d);

    switch (entry.accion) {
      case 'aceptado':
        applyRefs(entry.ingredientes_finales, 2.2, w);
        applyRefs(entry.ingredientes_sugeridos, 0.8, w);
        break;
      case 'rechazado':
        applyRefs(entry.ingredientes_removidos, -3.5, w);
        applyRefs(entry.ingredientes_sugeridos, -2, w);
        applyRefs(entry.ingredientes_finales, -2, w);
        break;
      case 'modificado':
        applyRefs(entry.ingredientes_finales, 1.5, w);
        applyRefs(entry.ingredientes_agregados, 1.2, w);
        applyRefs(entry.ingredientes_removidos, -2.8, w);
        break;
      case 'ignorado':
        applyRefs(entry.ingredientes_sugeridos, -1.2, w);
        break;
      case 'repetido':
        applyRefs(entry.ingredientes_sugeridos, -0.6, w);
        break;
      default:
        break;
    }
  }

  const history = ctx.recentPoolHistory.slice(-MAX_POOL_HISTORY);
  for (let i = 0; i < history.length; i++) {
    const ageFactor = 1 + (history.length - 1 - i) * 0.15;
    for (const id of history[i]) {
      if (!byId.has(id)) continue;
      addScore(scores, id, -0.85 * ageFactor);
    }
  }

  if (ctx.dayPlans) {
    const today = new Date();
    for (let i = 0; i < CALENDAR_WINDOW_DAYS; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const plan = ctx.dayPlans[key];
      if (!plan) continue;
      const w = decay(i);
      for (const mt of MEAL_TYPE_ORDER) {
        for (const meal of plan.meals[mt]) {
          const refs = [
            ...(meal.aiIngredients?.map((x) => x.name) ?? []),
            ...(meal.entries?.map((e) => e.ingredientId) ?? []),
          ];
          applyRefs(refs, 0.35, w);
        }
      }
    }
  }

  return scores;
}

/** Ordena candidatos: más puntaje + algo de azar para no repetir siempre lo mismo. */
export function rankIngredientsByTaste(
  pool: Ingredient[],
  scores: Map<string, number>,
  rng: () => number,
): Ingredient[] {
  return [...pool].sort((a, b) => {
    const sa = Math.max(0.08, scores.get(a.id) ?? 1) + rng() * 0.35;
    const sb = Math.max(0.08, scores.get(b.id) ?? 1) + rng() * 0.35;
    return sb - sa;
  });
}

export function flattenPoolIds(pool: {
  structural: string[];
  contextual: string[];
  creative: string[];
}): string[] {
  return [...pool.structural, ...pool.contextual, ...pool.creative];
}

export function appendPoolHistory(
  history: string[][],
  poolIds: string[],
): string[][] {
  if (poolIds.length === 0) return history;
  return [...history, poolIds].slice(-MAX_POOL_HISTORY);
}
