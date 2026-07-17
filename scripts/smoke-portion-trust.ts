/**
 * SP-9: smoke local del trust layer (hydrate + normalize) sin API/Gemini.
 * Uso: npm run smoke:portion
 */
import {
  hydrateAiDish,
  normalizeHydratedAiDishToBudgetDetailed,
  fuzzyMatchIngredient,
  TRUST_BUDGET_TOLERANCE,
} from '../src/services/dishMatchService';
import type { AiDishResponse, CulinaryRole } from '../src/types';

const SLOT = 700;

type CaseResult = { name: string; ok: boolean; detail: string };

function dish(
  nombre: string,
  ingredientes: Array<{ nombre: string; gramos: number; rol?: CulinaryRole }>,
): AiDishResponse {
  return {
    nombre,
    ingredientes: ingredientes.map((i) => ({
      nombre: i.nombre,
      gramos: i.gramos,
      rol: i.rol ?? 'proteina',
    })),
    preparacion: 'Mezclar y cocinar.',
    tiempo_prep: 20,
    tip: 'Tip',
  };
}

const cases: Array<() => CaseResult> = [
  () => {
    const matched = fuzzyMatchIngredient('pechuga de pollo');
    const typo = fuzzyMatchIngredient('polllo');
    const ok = !!matched && matched.name.toLowerCase().includes('pollo');
    return {
      name: 'fuzzy: pechuga de pollo',
      ok,
      detail: `match=${matched?.name ?? 'null'}; typo=${typo?.name ?? 'null/estimate'}`,
    };
  },
  () => {
    const hydrated = hydrateAiDish(
      dish('Bowl raro', [
        { nombre: 'xyz_ingrediente_inventado_123', gramos: 120 },
        { nombre: 'Aceite de oliva', gramos: 10 },
      ]),
    );
    const unmatched = hydrated.humanIngredients.filter((h) => !h.ingredientId).length;
    const ok = hydrated.macros.calories > 0 && unmatched >= 1;
    return {
      name: 'unmatched no-crash + kcal > 0',
      ok,
      detail: `kcal=${hydrated.macros.calories} unmatched=${unmatched}`,
    };
  },
  () => {
    const hydrated = hydrateAiDish(
      dish('Mega plato', [
        { nombre: 'Pechuga de pollo', gramos: 350 },
        { nombre: 'Arroz blanco cocido', gramos: 400 },
        { nombre: 'Aceite de oliva', gramos: 40 },
        { nombre: 'Palta', gramos: 150 },
      ]),
    );
    const before = hydrated.macros.calories;
    const norm = normalizeHydratedAiDishToBudgetDetailed(hydrated, SLOT);
    const ratio = norm.afterKcal / SLOT;
    const ok =
      before > SLOT * 1.3
      && norm.scaled
      && Math.abs(ratio - 1) <= TRUST_BUDGET_TOLERANCE;
    return {
      name: 'over-budget → normalize ±10%',
      ok,
      detail: `before=${before} after=${norm.afterKcal} budget=${SLOT} ratio=${ratio.toFixed(3)} scaled=${norm.scaled}`,
    };
  },
  () => {
    const hydrated = hydrateAiDish(
      dish('Ensalada volumen', [
        { nombre: 'Lechuga', gramos: 200 },
        { nombre: 'Tomate', gramos: 150 },
        { nombre: 'Pepino', gramos: 100 },
        { nombre: 'Zanahoria', gramos: 80 },
      ]),
    );
    const ok = hydrated.macros.calories > 0 && hydrated.humanIngredients.length >= 3;
    return {
      name: 'volume veggies → kcal > 0',
      ok,
      detail: `kcal=${hydrated.macros.calories} ings=${hydrated.humanIngredients.length}`,
    };
  },
  () => {
    const hydrated = hydrateAiDish({
      nombre: 'Vacío',
      ingredientes: [],
      preparacion: '',
      tiempo_prep: 0,
      tip: '',
    });
    const norm = normalizeHydratedAiDishToBudgetDetailed(hydrated, SLOT);
    const ok = hydrated.humanIngredients.length === 0 && norm.emptyOrZero === true;
    return {
      name: 'empty ingredients → emptyOrZero',
      ok,
      detail: `tip="${hydrated.tip}" emptyOrZero=${norm.emptyOrZero}`,
    };
  },
  () => {
    const hydrated = hydrateAiDish(
      dish('Balanceado', [
        { nombre: 'Pechuga de pollo', gramos: 150 },
        { nombre: 'Arroz blanco cocido', gramos: 180 },
        { nombre: 'Brócoli', gramos: 120 },
        { nombre: 'Aceite de oliva', gramos: 8 },
      ]),
    );
    const norm = normalizeHydratedAiDishToBudgetDetailed(hydrated, SLOT);
    const ratio = norm.afterKcal / SLOT;
    const ok = Math.abs(ratio - 1) <= TRUST_BUDGET_TOLERANCE;
    return {
      name: 'typical plate within ±10% after normalize',
      ok,
      detail: `before=${norm.beforeKcal} after=${norm.afterKcal} scaled=${norm.scaled} ratio=${ratio.toFixed(3)}`,
    };
  },
];

function main() {
  console.log('SP-9 smoke-portion-trust\n');
  const results = cases.map((fn) => fn());
  let pass = 0;
  for (const r of results) {
    const mark = r.ok ? 'PASS' : 'FAIL';
    if (r.ok) pass += 1;
    console.log(`[${mark}] ${r.name} — ${r.detail}`);
  }
  const rate = Math.round((pass / results.length) * 100);
  console.log(`\nHit rate: ${pass}/${results.length} (${rate}%)`);
  console.log(`Threshold target: ≥90% cases within ±${TRUST_BUDGET_TOLERANCE * 100}% where applicable`);
  if (pass < results.length) {
    process.exitCode = 1;
  }
}

main();
