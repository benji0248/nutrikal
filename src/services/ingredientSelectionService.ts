import type {
  Ingredient,
  IngredientLevel,
  UserProfile,
  WeeklyIngredientPool,
  Cuisine,
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
 * Ahora asegura diversidad de cocinas: al menos 2 cocinas en banda structural,
 * 3+ en contextual. La compatibilidad fina la refuerza la IA con subconjunto por comida.
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

  const { structural: n1, contextual: n2, creative: n3 } = WEEKLY_POOL_COUNTS;

  // Pick with cuisine diversity: ensure min cuisines represented
  const pickDiverse = (pool: Ingredient[], n: number, minCuisines: number): string[] => {
    if (pool.length <= n) return pool.map((i) => i.id);

    // Group by cuisine
    const byCuisine = new Map<string | undefined, Ingredient[]>();
    for (const ing of pool) {
      const key = ing.cuisine;
      const group = byCuisine.get(key) ?? [];
      group.push(ing);
      byCuisine.set(key, group);
    }

    const shuffled = shuffle(pool, rng);
    const selected: string[] = [];
    const selectedCuisines = new Set<string>();

    // Phase 1: pick one from each cuisine until we hit minCuisines or run out
    const cuisineKeys = shuffle(
      [...byCuisine.keys()].filter((k): k is string => k !== undefined),
      rng,
    );
    for (const cuisine of cuisineKeys) {
      if (selectedCuisines.size >= minCuisines) break;
      const group = byCuisine.get(cuisine);
      if (!group || group.length === 0) continue;
      const pick = shuffle(group, rng)[0];
      if (pick && !selected.includes(pick.id)) {
        selected.push(pick.id);
        selectedCuisines.add(cuisine);
      }
    }

    // Phase 2: fill remaining slots from the global shuffle
    for (const ing of shuffled) {
      if (selected.length >= n) break;
      if (!selected.includes(ing.id)) {
        selected.push(ing.id);
      }
    }

    return selected;
  };

  return {
    weekId: options.weekId,
    structural: pickDiverse(byLevel[1], n1, 2),
    contextual: pickDiverse(byLevel[2], n2, 3),
    creative: shuffle(byLevel[3], rng).slice(0, n3).map((i) => i.id),
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
