import type {
  CulinaryRole,
  DishContract,
  DishContractIngredient,
  HydratedIngredient,
  HydratedMeal,
  Ingredient,
} from '../types';
import { DISH_CONTRACT_VERSION } from '../types';
import { classifyMacroRole } from './portionEngine';

/** Gramos min/max por rol culinario (plato doméstico) */
const ROLE_GRAM_BOUNDS: Record<CulinaryRole, { min: number; max: number }> = {
  base: { min: 60, max: 200 },
  proteina: { min: 80, max: 250 },
  liquido: { min: 50, max: 300 },
  vegetal: { min: 40, max: 180 },
  vegetal_hoja: { min: 20, max: 80 },
  aromatico: { min: 5, max: 30 },
  fruta_toque: { min: 30, max: 150 },
  grasa: { min: 5, max: 30 },
  lacteo: { min: 20, max: 120 },
  endulzante: { min: 3, max: 20 },
  toque: { min: 3, max: 30 },
};

const CULINARY_ROLES: CulinaryRole[] = [
  'base',
  'proteina',
  'liquido',
  'vegetal',
  'vegetal_hoja',
  'aromatico',
  'fruta_toque',
  'grasa',
  'lacteo',
  'endulzante',
  'toque',
];

function isCulinaryRole(s: string): s is CulinaryRole {
  return (CULINARY_ROLES as string[]).includes(s);
}

function kcalPerGram(ing: Ingredient): number {
  return ing.calories / 100;
}

/**
 * Filtra IDs desconocidos, descarta proporciones no positivas, renormaliza a suma 1.
 * Ajusta topes blandos de aromatic / toque / endulzante antes de normalizar.
 */
export function normalizeDishContract(
  raw: DishContract,
  allowedIds: Set<string>,
): DishContractIngredient[] {
  const lines: DishContractIngredient[] = [];
  for (const row of raw.ingredientes) {
    if (!row?.id || !allowedIds.has(row.id)) continue;
    if (!isCulinaryRole(String(row.rol))) continue;
    let p = Number(row.proporcion);
    if (!Number.isFinite(p) || p <= 0) continue;

    const rol = row.rol as CulinaryRole;
    if (rol === 'aromatico' && p > 0.1) p = 0.1;
    if ((rol === 'toque' || rol === 'endulzante') && p > 0.05) p = 0.05;

    lines.push({ id: row.id, rol, proporcion: p });
  }

  const sum = lines.reduce((s, l) => s + l.proporcion, 0);
  if (sum <= 0) return [];
  return lines.map((l) => ({ ...l, proporcion: l.proporcion / sum }));
}

export interface DishResolverSuccess {
  ok: true;
  hydrated: HydratedMeal;
}

export interface DishResolverFailure {
  ok: false;
  reason: string;
}

export type DishResolverResult = DishResolverSuccess | DishResolverFailure;

function buildHydratedLine(
  ing: Ingredient,
  grams: number,
): HydratedIngredient {
  const factor = grams / 100;
  const kcal = Math.round(ing.calories * factor);
  return {
    ingredientId: ing.id,
    name: ing.name,
    grams: Math.round(grams),
    kcal,
    protein: Math.round(ing.protein * factor * 10) / 10,
    carbs: Math.round(ing.carbs * factor * 10) / 10,
    fat: Math.round(ing.fat * factor * 10) / 10,
    macroRole: classifyMacroRole(ing),
  };
}

/**
 * Recorta gramos por rol y redistribuye el déficit/superávit entre base, proteina y vegetal
 * (hasta límites) para acercar el total de kcal al objetivo del slot.
 */
function clampAndRepair(
  lines: Array<{ ing: Ingredient; rol: CulinaryRole; proporcion: number }>,
  mealBudgetKcal: number,
): HydratedIngredient[] | null {
  const bounds = (rol: CulinaryRole) => ROLE_GRAM_BOUNDS[rol];

  // Mezcla calórica (kcal/g) ponderada por proporción de masa objetivo
  let densidad = 0;
  for (const { ing, proporcion } of lines) {
    if (ing.calories <= 0) continue;
    densidad += proporcion * kcalPerGram(ing);
  }
  if (densidad <= 0) return null;

  const totalGrams = mealBudgetKcal / densidad;

  const hydrated: HydratedIngredient[] = [];

  for (const { ing, rol, proporcion } of lines) {
    const g = totalGrams * proporcion;
    const { min, max } = bounds(rol);
    const clamped = Math.max(min, Math.min(max, g));
    hydrated.push(buildHydratedLine(ing, clamped));
  }

  let totalKcal = hydrated.reduce((s, h) => s + h.kcal, 0);
  const target = mealBudgetKcal;
  let delta = target - totalKcal;
  if (Math.abs(delta) < 15) {
    return hydrated;
  }

  // Ajuste fino: escalar levemente ingredientes flexibles (no toques)
  const flexible = new Set<CulinaryRole>(['base', 'proteina', 'vegetal', 'vegetal_hoja', 'liquido', 'lacteo']);
  const maxPasses = 6;
  for (let pass = 0; pass < maxPasses && Math.abs(delta) > 10; pass++) {
    const sign = delta > 0 ? 1 : -1;
    let changed = false;
    for (let i = 0; i < hydrated.length; i++) {
      const h = hydrated[i];
      const rol = lines[i].rol;
      if (!flexible.has(rol)) continue;
      const ing = lines[i].ing;
      if (ing.calories <= 0) continue;
      const { min, max } = bounds(rol);
      const step = sign * 5;
      const nextG = Math.max(min, Math.min(max, h.grams + step));
      if (nextG === h.grams) continue;
      const rebuilt = buildHydratedLine(ing, nextG);
      hydrated[i] = rebuilt;
      changed = true;
    }
    totalKcal = hydrated.reduce((s, h) => s + h.kcal, 0);
    delta = target - totalKcal;
    if (!changed) break;
  }

  return hydrated;
}

export function isDishContractShape(x: unknown): x is DishContract {
  if (typeof x !== 'object' || x === null) return false;
  const o = x as Record<string, unknown>;
  if (typeof o.contractVersion !== 'number') return false;
  if (!Array.isArray(o.ingredientes) || o.ingredientes.length === 0) return false;
  if (typeof o.nombre !== 'string') return false;
  return true;
}

/** Extrae contrato válido del objeto comida crudo de Gemini */
export function pickDishContractFromMeal(meal: unknown): DishContract | null {
  if (typeof meal !== 'object' || meal === null) return null;
  const dc = (meal as { dishContract?: unknown }).dishContract;
  return isDishContractShape(dc) ? dc : null;
}

/**
 * Convierte contrato validado + catálogo → HydratedMeal (sin llamadas a IA).
 */
export function resolveDishContract(
  contract: DishContract,
  mealBudgetKcal: number,
  allIngredients: Ingredient[],
  allowedIds: Set<string>,
): DishResolverResult {
  if (contract.contractVersion !== DISH_CONTRACT_VERSION) {
    return { ok: false, reason: 'Versión de contrato no soportada' };
  }

  const normalized = normalizeDishContract(contract, allowedIds);
  if (normalized.length === 0) {
    return { ok: false, reason: 'Sin ingredientes válidos en el contrato' };
  }

  const lines: Array<{ ing: Ingredient; rol: CulinaryRole; proporcion: number }> = [];
  for (const row of normalized) {
    const ing = allIngredients.find((i) => i.id === row.id);
    if (!ing) continue;
    lines.push({ ing, rol: row.rol, proporcion: row.proporcion });
  }

  if (lines.length === 0) {
    return { ok: false, reason: 'IDs no resueltos en el catálogo' };
  }

  // Renormalizar si faltaron filas
  const sumP = lines.reduce((s, l) => s + l.proporcion, 0);
  if (sumP <= 0) return { ok: false, reason: 'Proporciones inválidas' };
  const renorm = lines.map((l) => ({
    ...l,
    proporcion: l.proporcion / sumP,
  }));

  const hydrated = clampAndRepair(renorm, mealBudgetKcal);
  if (!hydrated) {
    return { ok: false, reason: 'No se pudo calcular densidad calórica' };
  }

  const name = contract.nombre.trim() || 'Comida';
  const totalKcal = hydrated.reduce((s, h) => s + h.kcal, 0);

  return {
    ok: true,
    hydrated: {
      name,
      ingredients: hydrated,
      totalKcal,
      totalProtein: hydrated.reduce((s, h) => s + h.protein, 0),
      totalCarbs: hydrated.reduce((s, h) => s + h.carbs, 0),
      totalFat: hydrated.reduce((s, h) => s + h.fat, 0),
    },
  };
}
