#!/usr/bin/env node
/**
 * Compara prompt semanal v1 (git) vs v2 (actual) con mismos parámetros.
 * Uso: npx tsx scripts/compare-week-plan-prompt-v1-v2.mjs
 */
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { buildWeekPlanOneShotPrompt as buildV2 } from '../api/_lib/weekPlanPrompts.ts';
import { computeDailyBudget, computeMaintenanceBudget, getActiveMealSlots } from '../api/_lib/metabolic.ts';
import { buildWeeklyIngredientPool, formatWeeklyPoolForPrompt } from '../src/services/ingredientSelectionService.ts';
import { formatWeekdayRulesForPrompt } from '../src/utils/flexDayHelpers.ts';
import { INGREDIENTS_DB } from '../src/data/ingredients.ts';

const OUT = join(process.cwd(), 'test-results', 'prompt-batch1');
mkdirSync(OUT, { recursive: true });

const v1Worktree = join(OUT, 'v1-worktree');
try {
  execSync(`git worktree add --detach "${v1Worktree}" master 2>/dev/null || true`, { stdio: 'pipe' });
} catch {
  execSync(`git worktree remove --force "${v1Worktree}" 2>/dev/null || true`, { stdio: 'pipe' });
  execSync(`git worktree add --detach "${v1Worktree}" master`, { stdio: 'pipe' });
}

const { buildWeekPlanOneShotPrompt: buildV1 } = await import(
  join(v1Worktree, 'api/_lib/weekPlanPrompts.ts')
);

const profile = {
  name: 'Usuario Promedio AR',
  birthDate: '1992-03-20',
  sex: 'male',
  heightCm: 175,
  weightKg: 80,
  activityLevel: 'light',
  goal: 'maintain',
  restrictions: [],
  nationality: 'Argentina',
  dislikedIngredientIds: [],
  dislikedCategories: [],
  allowedExceptions: [],
  completedAt: '2026-01-01',
};

const metabolic = {
  birthDate: profile.birthDate,
  sex: profile.sex,
  heightCm: profile.heightCm,
  weightKg: profile.weightKg,
  activityLevel: profile.activityLevel,
  goal: profile.goal,
};

const activeSlots = getActiveMealSlots('four');
const weekdayRules = formatWeekdayRulesForPrompt([
  { weekday: 6, mode: 'maintenance', nickname: 'Edgy' },
  { weekday: 0, mode: 'full_free' },
]);
const pool = buildWeeklyIngredientPool(INGREDIENTS_DB, profile, { weekId: '2026-W32', poolGeneration: 1 });
const poolPrompt = formatWeeklyPoolForPrompt(pool, INGREDIENTS_DB, false);
const weekDates = ['2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07', '2026-08-08', '2026-08-09', '2026-08-10'];

const params = {
  profileName: profile.name,
  nationality: profile.nationality,
  restrictions: profile.restrictions,
  goal: profile.goal,
  weekPlanning: {
    mealPattern: 'four',
    mealRhythmMode: 'balanced',
    weekdayFlexRules: [
      { weekday: 6, mode: 'maintenance', nickname: 'Edgy' },
      { weekday: 0, mode: 'full_free' },
    ],
    weekdayRulesPrompt: weekdayRules,
    flexMealsPerWeek: 1,
    flexMealScope: 'meal_plus_snack',
    activeSlots,
    cookingTime: 'rapido',
    budget: 'economico',
  },
  weeklyPoolPrompt: poolPrompt,
  forbiddenDishNames: ['Milanesa con puré', 'Pollo al horno con papas'],
  weekDates,
  dailyBudgetKcal: computeDailyBudget(metabolic),
  maintenanceBudgetKcal: computeMaintenanceBudget(metabolic),
};

const promptV1 = buildV1(params);
const promptV2 = buildV2(params);

writeFileSync(join(OUT, 'prompt-v1.txt'), promptV1);
writeFileSync(join(OUT, 'prompt-v2.txt'), promptV2);

const rules = ['same:tX', 'prev.cena', 'full_free', 'templateId', 'Máx', 'máx'];
const check = (label, text) => {
  const missing = rules.filter((r) => !text.includes(r));
  console.log(`${label}: ${text.length} chars (~${Math.ceil(text.length / 4)} tokens)`);
  if (missing.length) console.log(`  ⚠ missing: ${missing.join(', ')}`);
  else console.log('  ✓ all critical rules present');
};

console.log('=== Prompt batch1 comparison (ar-promedio profile) ===\n');
check('v1', promptV1);
check('v2', promptV2);
console.log(`\nDelta: ${promptV1.length - promptV2.length} chars (~${Math.ceil((promptV1.length - promptV2.length) / 4)} tokens saved)`);
console.log(`\nFiles: ${OUT}/prompt-v1.txt , prompt-v2.txt`);
