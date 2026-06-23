import type {
  Ingredient,
  IngredientLevel,
  UserProfile,
  WeeklyIngredientPool,
  Cuisine,
} from '../types';
import { filterIngredientsForUser } from './ingredientFilter';
import {
  buildIngredientTasteScores,
  rankIngredientsByTaste,
  type TasteSelectionContext,
} from './ingredientTasteModel';

/**
 * Cantidades por banda en la canasta semanal (rotación por semana ISO + semilla de historial).
 * Total ≈ 44 ingredientes; preparado para alinear con embeddings en fases posteriores (ver docs/ROADMAP_AI.md).
 */
const WEEKLY_POOL_COUNTS = {
  structural: 10,
  contextual: 16,
  creative: 2,
} as const;

/** Ingredientes cotidianos — prioridad en la canasta semanal. */
const STAPLE_IDS = new Set([
  'ing_001', 'ing_002', 'ing_005', 'ing_006', 'ing_007', 'ing_008', 'ing_010',
  'ing_013', 'ing_015', 'ing_022', 'ing_032', 'ing_036', 'ing_037', 'ing_038',
  'ing_039', 'ing_040', 'ing_041', 'ing_042', 'ing_043', 'ing_045', 'ing_046',
  'ing_048', 'ing_050', 'ing_052', 'ing_059', 'ing_065', 'ing_066', 'ing_076',
  'ing_077', 'ing_078', 'ing_082', 'ing_086', 'ing_088', 'ing_101', 'ing_103',
  'ing_104', 'ing_107', 'ing_108', 'ing_114', 'ing_117', 'ing_121', 'ing_124',
  'ing_126', 'ing_127', 'ing_128', 'ing_132', 'ing_135', 'ing_146', 'ing_147',
  'ing_148', 'ing_149', 'ing_154', 'ing_156', 'ing_159', 'ing_228', 'ing_229',
  'ing_253', 'ing_254', 'ing_257',
]);

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
  /** Incrementa en cada generación de plan para rotar la canasta en la misma semana ISO. */
  poolGeneration?: number;
  /** Señales + historial de canastas → selección ponderada (aprende con el uso). */
  tasteContext?: TasteSelectionContext;
}

/**
 * Arma canasta semanal (~44 ids) por niveles con filtros de perfil.
 * Ahora asegura diversidad de cocinas: al menos 2 cocinas en banda structural,
 * 3+ en contextual. La compatibilidad fina la refuerza la IA con subconjunto por comida.
 */
export function buildWeeklyIngredientPool(
  allIngredients: Ingredient[],
  profile: UserProfile,
  options: SelectionOptions,
): WeeklyIngredientPool {
  const filtered = filterIngredientsForUser(allIngredients, profile);
  const gen =
    options.poolGeneration != null && options.poolGeneration > 0
      ? `|g${options.poolGeneration}`
      : '';
  const seedKey = `${options.weekId}|${options.personalizationSeed ?? ''}${gen}`;
  const rng = makeRng(hashSeed(seedKey));

  const byLevel: Record<IngredientLevel, Ingredient[]> = { 1: [], 2: [], 3: [] };
  for (const ing of filtered) {
    byLevel[inferIngredientLevel(ing)].push(ing);
  }

  const { structural: n1, contextual: n2, creative: n3 } = WEEKLY_POOL_COUNTS;

  const tasteScores = options.tasteContext
    ? buildIngredientTasteScores(filtered, options.tasteContext)
    : null;

  const orderPool = (pool: Ingredient[]): Ingredient[] => {
    const staples = pool.filter((i) => STAPLE_IDS.has(i.id));
    const others = pool.filter((i) => !STAPLE_IDS.has(i.id));
    const rank = (list: Ingredient[]) =>
      tasteScores ? rankIngredientsByTaste(list, tasteScores, rng) : shuffle(list, rng);
    return [...rank(staples), ...rank(others)];
  };

  const pickDiverse = (pool: Ingredient[], n: number, minCuisines: number): string[] => {
    if (pool.length <= n) return pool.map((i) => i.id);

    const byCuisine = new Map<string | undefined, Ingredient[]>();
    for (const ing of pool) {
      const key = ing.cuisine;
      const group = byCuisine.get(key) ?? [];
      group.push(ing);
      byCuisine.set(key, group);
    }

    const ranked = orderPool(pool);
    const selected: string[] = [];
    const selectedCuisines = new Set<string>();

    const cuisineKeys = shuffle(
      [...byCuisine.keys()].filter((k): k is string => k !== undefined),
      rng,
    );
    for (const cuisine of cuisineKeys) {
      if (selectedCuisines.size >= minCuisines) break;
      const group = orderPool(byCuisine.get(cuisine) ?? []);
      const pick = group.find((ing) => !selected.includes(ing.id));
      if (pick) {
        selected.push(pick.id);
        selectedCuisines.add(cuisine);
      }
    }

    for (const ing of ranked) {
      if (selected.length >= n) break;
      if (!selected.includes(ing.id)) selected.push(ing.id);
    }

    return selected;
  };

  return {
    weekId: options.weekId,
    structural: pickDiverse(byLevel[1], n1, 2),
    contextual: pickDiverse(byLevel[2], n2, 3),
    creative: orderPool(byLevel[3]).slice(0, n3).map((i) => i.id),
  };
}

/**
 * Pool semanal con IDs y nombres para el prompt del asistente (ancla de variedad).
 */
export function formatWeeklyPoolForPrompt(
  pool: WeeklyIngredientPool,
  allIngredients: Ingredient[],
  tasteAware = false,
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

  const tasteNote = tasteAware
    ? ' (priorizá ingredientes que el usuario suele aceptar; evitá los que rechazó o repitió mucho en canastas recientes).'
    : '';

  return [
    `CANASTA SEMANAL${tasteNote} — usá estos ingredientes (priorizá estructurales y contextuales):`,
    'ESTRUCTURALES:',
    idLines(pool.structural),
    'CONTEXTUALES:',
    idLines(pool.contextual),
    pool.creative.length ? 'OPCIONALES:' : '',
    pool.creative.length ? idLines(pool.creative) : '',
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Analiza las comidas recientes del calendario y devuelve un string
 * con las cocinas más usadas para inyectar en el contexto de Gemini.
 */
export function buildCuisineDiversityHint(
  dayPlans: Record<string, { meals: Record<string, Array<{ aiIngredients?: Array<{ name: string }> }>> }>,
  allIngredients: Ingredient[],
  recentDays: number = 7,
): string | null {
  const nameToCuisine = new Map<string, Cuisine | undefined>();
  for (const ing of allIngredients) {
    nameToCuisine.set(ing.name.toLowerCase(), ing.cuisine);
  }

  const cuisineCount = new Map<string, number>();
  const today = new Date();

  for (let i = 0; i < recentDays; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const plan = dayPlans[key];
    if (!plan) continue;

    for (const meals of Object.values(plan.meals)) {
      for (const meal of meals) {
        if (!meal.aiIngredients) continue;
        for (const ai of meal.aiIngredients) {
          const cuisine = nameToCuisine.get(ai.name.toLowerCase());
          if (cuisine) {
            cuisineCount.set(cuisine, (cuisineCount.get(cuisine) ?? 0) + 1);
          }
        }
      }
    }
  }

  if (cuisineCount.size === 0) return null;

  const sorted = [...cuisineCount.entries()].sort((a, b) => b[1] - a[1]);
  const topCuisine = sorted[0];

  if (topCuisine && topCuisine[1] >= 3) {
    const cuisineLabels: Record<string, string> = {
      ar: 'argentino',
      asian: 'asiático',
      mediterranean: 'mediterráneo',
      latin: 'latino',
      international: 'internacional',
    };
    const label = cuisineLabels[topCuisine[0]] ?? topCuisine[0];
    return `Última semana: mucho ${label} (${topCuisine[1]} ingredientes). Priorizá otras cocinas para variar.`;
  }

  return null;
}
