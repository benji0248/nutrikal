import type {
  Ingredient,
  IngredientLevel,
  UserProfile,
  WeeklyIngredientPool,
} from '../types';
import { filterIngredientsForUser } from './ingredientFilter';

/**
 * Cantidades por banda en la canasta semanal (rotación por semana ISO + semilla de historial).
 * Total ≈ 44 ingredientes; preparado para alinear con embeddings en fases posteriores (ver docs/ROADMAP_AI.md).
 */
const WEEKLY_POOL_COUNTS = {
  structural: 10,
  contextual: 20,
  creative: 14,
} as const;

/** Semilla estable a partir de platos frecuentes en calendario — rota el shuffle sin llamadas a API. */
export function buildPoolPersonalizationSeed(
  freqMap: Map<string, { count: number; lastDate: string }>,
  displayName: string,
): string {
  const top = [...freqMap.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 12)
    .map(([name, d]) => `${name}:${d.count}`)
    .join('|');
  return `${displayName}|${top}`;
}

/** Heurística: nivel de rotación sin anotar cada fila en ingredients.ts */
function inferIngredientLevel(ing: Ingredient): IngredientLevel {
  const c = ing.category;

  if (c === 'cereales' || c === 'legumbres') return 1;
  if (c === 'carnes') return 1;
  if (c === 'bebidas') return 2;
  if (c === 'grasas') return 2;
  if (c === 'verduras') {
    const hi = ing.calories > 60;
    return hi ? 1 : 2;
  }
  if (c === 'frutas') return 2;
  if (c === 'lacteos') return 2;
  if (c === 'ultraprocesados' || c === 'comidas_preparadas' || c === 'otros') return 3;

  return 2;
}

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** PRNG determinista (xorshift32) para pools reproducibles por semana */
function makeRng(seed: number) {
  let state = seed || 1;
  return (): number => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) % 0xffff_ffff) / 0xffff_ffff;
  };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface SelectionOptions {
  /** p.ej. ISO week id `2026-W15` */
  weekId: string;
  /** Opcional: variar el shuffle según historial de platos (nombre + frecuencias). */
  personalizationSeed?: string;
}

/**
 * Arma canasta semanal (~44 ids) por niveles con filtros de perfil.
 * La compatibilidad fina la refuerza la IA con subconjunto por comida.
 */
export function buildWeeklyIngredientPool(
  allIngredients: Ingredient[],
  profile: UserProfile,
  options: SelectionOptions,
): WeeklyIngredientPool {
  const filtered = filterIngredientsForUser(allIngredients, profile);
  const seedKey = `${options.weekId}|${options.personalizationSeed ?? ''}`;
  const rng = makeRng(hashSeed(seedKey));

  const byLevel: Record<IngredientLevel, Ingredient[]> = { 1: [], 2: [], 3: [] };
  for (const ing of filtered) {
    byLevel[inferIngredientLevel(ing)].push(ing);
  }

  const take = (pool: Ingredient[], n: number): string[] =>
    shuffle(pool, rng)
      .slice(0, n)
      .map((i) => i.id);

  const { structural: n1, contextual: n2, creative: n3 } = WEEKLY_POOL_COUNTS;

  return {
    weekId: options.weekId,
    structural: take(byLevel[1], n1),
    contextual: take(byLevel[2], n2),
    creative: take(byLevel[3], n3),
  };
}

/**
 * Pool semanal con IDs y nombres para el prompt del asistente (ancla de variedad).
 */
export function formatWeeklyPoolForPrompt(
  pool: WeeklyIngredientPool,
  allIngredients: Ingredient[],
): string {
  const map = new Map(allIngredients.map((i) => [i.id, i] as const));
  const idLines = (ids: string[]): string =>
    ids
      .map((id) => {
        const ing = map.get(id);
        return ing ? `${ing.id}: ${ing.name}` : '';
      })
      .filter(Boolean)
      .join('\n');

  return [
    'CANASTA SEMANAL (solo para acción week_plan; combiná bandas para platos completos):',
    'ESTRUCTURALES:',
    idLines(pool.structural),
    'CONTEXTUALES:',
    idLines(pool.contextual),
    'CREATIVOS:',
    idLines(pool.creative),
  ].join('\n');
}
