import type {
  Ingredient,
  IngredientCategory,
  IngredientLevel,
  MealType,
  UserProfile,
  WeeklyIngredientPool,
} from '../types';
import { filterIngredientsForUser } from './ingredientFilter';

/** Heurística: nivel de rotación sin anotar cada fila en ingredients.ts */
export function inferIngredientLevel(ing: Ingredient): IngredientLevel {
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

/** Pares poco usados juntos en una misma preparación (MVP) */
const INCOMPATIBLE_PAIRS: ReadonlyArray<readonly [IngredientCategory, IngredientCategory]> = [
  ['cereales', 'cereales'],
];

function categoriesCompatible(a: IngredientCategory, b: IngredientCategory): boolean {
  if (a === b) {
    for (const [x, y] of INCOMPATIBLE_PAIRS) {
      if (x === a && y === b) return false;
    }
  }
  return true;
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
}

/**
 * Arma pool semanal (~30 ids) por niveles con filtros de perfil.
 * La compatibilidad fina la refuerza la IA con subconjunto por comida.
 */
export function buildWeeklyIngredientPool(
  allIngredients: Ingredient[],
  profile: UserProfile,
  options: SelectionOptions,
): WeeklyIngredientPool {
  const filtered = filterIngredientsForUser(allIngredients, profile);
  const rng = makeRng(hashSeed(options.weekId));

  const byLevel: Record<IngredientLevel, Ingredient[]> = { 1: [], 2: [], 3: [] };
  for (const ing of filtered) {
    byLevel[inferIngredientLevel(ing)].push(ing);
  }

  const take = (pool: Ingredient[], n: number): string[] =>
    shuffle(pool, rng)
      .slice(0, n)
      .map((i) => i.id);

  return {
    weekId: options.weekId,
    structural: take(byLevel[1], 8),
    contextual: take(byLevel[2], 15),
    creative: take(byLevel[3], 10),
  };
}

export interface MealSubset {
  structural: string[];
  contextual: string[];
  creative: string[];
}

const MEAL_TARGETS: Record<MealType, { s: number; c: number; r: number }> = {
  desayuno: { s: 2, c: 4, r: 3 },
  almuerzo: { s: 3, c: 5, r: 3 },
  cena: { s: 3, c: 5, r: 3 },
  snack: { s: 1, c: 3, r: 4 },
};

/**
 * Extrae 8–11 ids para un slot, con chequeo simple de compatibilidad por categoría.
 */
export function selectMealIngredientSubset(
  pool: WeeklyIngredientPool,
  mealType: MealType,
  allIngredients: Ingredient[],
): MealSubset {
  const map = new Map(allIngredients.map((i) => [i.id, i] as const));
  const t = MEAL_TARGETS[mealType];

  const pick = (ids: string[], n: number): string[] => {
    const out: string[] = [];
    const used = new Set<IngredientCategory>();
    for (const id of ids) {
      if (out.length >= n) break;
      const ing = map.get(id);
      if (!ing) continue;
      let ok = true;
      for (const u of used) {
        if (!categoriesCompatible(ing.category, u)) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      out.push(id);
      used.add(ing.category);
    }
    return out;
  };

  return {
    structural: pick(pool.structural, t.s),
    contextual: pick(pool.contextual, t.c),
    creative: pick(pool.creative, t.r),
  };
}

/** Texto compacto para inyectar en el prompt (sin kcal). */
export function formatMealSubsetForPrompt(subset: MealSubset): string {
  const lines = [
    `ESTRUCTURALES: ${subset.structural.join(', ')}`,
    `CONTEXTUALES: ${subset.contextual.join(', ')}`,
    `CREATIVOS: ${subset.creative.join(', ')}`,
  ];
  return lines.join('\n');
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
    'POOL SEMANAL (priorizá variedad usando estos ingredientes a lo largo de la semana):',
    'ESTRUCTURALES:',
    idLines(pool.structural),
    'CONTEXTUALES:',
    idLines(pool.contextual),
    'CREATIVOS:',
    idLines(pool.creative),
  ].join('\n');
}
