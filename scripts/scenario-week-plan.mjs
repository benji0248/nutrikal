#!/usr/bin/env node
/**
 * Runner de escenarios de plan semanal.
 *
 * Modos:
 *   node scripts/scenario-week-plan.mjs --fixture <path>   # analiza un JSON sin llamar a la API
 *   node scripts/scenario-week-plan.mjs --scenario <id>    # genera vía API + analiza
 *   node scripts/scenario-week-plan.mjs --all              # corre todos los escenarios (API)
 *   node scripts/scenario-week-plan.mjs --list             # lista escenarios
 *
 * Salida: test-results/runs/<timestamp>/  (JSON + Markdown por escenario)
 * Requiere API en http://127.0.0.1:3000 para modos --scenario / --all
 */
import { mkdirSync, writeFileSync, readFileSync, readdirSync } from 'fs';
import { join, basename } from 'path';
import { SCENARIOS, getScenario, listScenarioIds } from './scenarios/profiles.mjs';
import { analyzeWeekPlan, renderAnalysisMarkdown } from './scenarios/analyzePlan.mjs';

const BASE = process.env.NUTRIKAL_API_BASE || 'http://127.0.0.1:3000';
const OUT_ROOT = join(process.cwd(), 'test-results', 'runs');

// ── CLI ──
const args = process.argv.slice(2);
function flag(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
}
const wantsList = args.includes('--list');
const wantsAll = args.includes('--all');
const fixturePath = flag('--fixture');
const scenarioId = flag('--scenario');
const analyzeFixturesDir = args.includes('--analyze-fixtures');

if (wantsList) {
  console.log('Escenarios disponibles:');
  for (const s of SCENARIOS) console.log(`  - ${s.id}  (${s.label})`);
  process.exit(0);
}

// ── Helpers ──
function nextMonday() {
  const d = new Date();
  d.setDate(d.getDate() + ((1 + 7 - d.getDay()) % 7 || 7));
  return d;
}
function fmtDate(d) {
  return d.toISOString().slice(0, 10);
}
function weekDates() {
  const mon = nextMonday();
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(mon);
    d.setDate(d.getDate() + i);
    dates.push(fmtDate(d));
  }
  return dates;
}

async function api(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

/** Canasta genérica con kcal (suficiente para que el planner calcule). */
function defaultPoolPrompt(nationality) {
  const regionalNote =
    nationality?.toLowerCase().includes('mex')
      ? '\nPriorizá ingredientes comunes en México (tortilla, frijol, pollo, huevo, arroz, aguacate).'
      : nationality?.toLowerCase().includes('alem') || nationality?.toLowerCase().includes('deutsch')
        ? '\nPriorizá ingredientes comunes en Alemania (papa, cerdo, huevo, pan, yogurt, verduras).'
        : nationality?.toLowerCase().includes('espa')
          ? '\nPriorizá ingredientes comunes en España (huevo, legumbres, arroz, verduras, queso).'
          : '\nPriorizá ingredientes de súper argentino/uruguayo cotidianos.';

  return `CANASTA SEMANAL — usá estos ingredientes (kcal/100g).${regionalNote}
ESTRUCTURALES:
ing_001: Arroz blanco (130)
ing_005: Fideos (131)
ing_006: Papa (77)
ing_010: Pan blanco (265)
ing_022: Pechuga de pollo (165)
ing_036: Carne picada común (250)
ing_015: Huevo (143)
CONTEXTUALES:
ing_038: Tomate (18)
ing_039: Cebolla (40)
ing_042: Lechuga (15)
ing_041: Zanahoria (41)
ing_059: Manzana (52)
ing_065: Banana (89)
ing_066: Naranja (47)
ing_032: Queso cremoso (290)
ing_avena: Avena (389)
ing_yogur: Yogur natural (61)
OPCIONALES:
ing_076: Aceite de oliva (884)
ing_077: Manteca (717)`;
}

async function ensureAuth(scenario) {
  const ts = String(Date.now()).slice(-8);
  const username = `sc_${scenario.id.replace(/[^a-z0-9]/gi, '').slice(0, 12)}_${ts}`.slice(0, 28);
  const email = `${username}@nutrikal.local`;
  const password = 'Test1234!';

  const reg = await api('POST', '/api/auth/register', {
    username,
    email,
    password,
    displayName: scenario.user.name,
  });
  let token = reg.ok ? reg.data.token : null;
  if (!token) {
    const login = await api('POST', '/api/auth/login', { identifier: username, password });
    if (!login.ok) throw new Error(`Auth falló: ${JSON.stringify(login.data)}`);
    token = login.data.token;
  }

  const profile = {
    id: username,
    name: scenario.user.name,
    birthDate: scenario.user.birthDate,
    sex: scenario.user.sex,
    heightCm: scenario.user.heightCm,
    weightKg: scenario.user.weightKg,
    activityLevel: scenario.user.activityLevel,
    goal: scenario.user.goal,
    restrictions: scenario.user.restrictions ?? [],
    dislikedIngredientIds: [],
    dislikedCategories: [],
    allowedExceptions: [],
    nationality: scenario.user.nationality,
  };
  const put = await api('PUT', '/api/business/profile', { profile }, token);
  if (!put.ok) throw new Error(`Profile falló: ${JSON.stringify(put.data)}`);
  return { token, username };
}

async function generateForScenario(scenario) {
  const { token } = await ensureAuth(scenario);
  const dates = weekDates();
  const wp = {
    mealPattern: scenario.weekPlanning.mealPattern,
    mealRhythmMode: scenario.weekPlanning.mealRhythmMode,
    streakDays: scenario.weekPlanning.streakDays ?? 3,
    weekdayFlexRules: scenario.weekPlanning.weekdayFlexRules ?? [],
    flexMealsPerWeek: 0,
    flexMealScope: 'one_meal',
    preferredFlexWeekdays: [],
    weekdayRulesPrompt: scenario.weekPlanning.weekdayRulesPrompt,
    activeSlots: scenario.weekPlanning.activeSlots ?? ['desayuno', 'almuerzo', 'cena', 'snack'],
    cookingTime: scenario.weekPlanning.cookingTime ?? 'normal',
    budget: scenario.weekPlanning.budget ?? 'normal',
  };

  const t0 = Date.now();
  const res = await api(
    'POST',
    '/api/ai/week-plan',
    {
      weekDates: dates,
      weekPlanning: wp,
      weeklyPoolPrompt: defaultPoolPrompt(scenario.user.nationality),
      forbiddenDishNames: [],
      variationSeed: `scenario-${scenario.id}-${Date.now()}`,
    },
    token,
  );
  const elapsedMs = Date.now() - t0;
  if (!res.ok) {
    throw new Error(`week-plan ${res.status}: ${JSON.stringify(res.data).slice(0, 500)}`);
  }
  return { plan: res.data, elapsedMs, weekDates: dates };
}

function writeRunOutputs(runDir, id, analysis, raw, extras = {}) {
  const jsonPath = join(runDir, `${id}.analysis.json`);
  const mdPath = join(runDir, `${id}.analysis.md`);
  const rawPath = join(runDir, `${id}.raw.json`);
  writeFileSync(jsonPath, JSON.stringify(analysis, null, 2), 'utf8');
  writeFileSync(mdPath, renderAnalysisMarkdown(analysis, extras), 'utf8');
  if (raw) writeFileSync(rawPath, JSON.stringify(raw, null, 2), 'utf8');
  return { jsonPath, mdPath, rawPath };
}

function makeRunDir() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dir = join(OUT_ROOT, stamp);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function analyzeFixtureFile(path, runDir) {
  const fixture = JSON.parse(readFileSync(path, 'utf8'));
  const hintId = fixture.scenarioHintId;
  const scenario = hintId ? getScenario(hintId) : null;
  const analysis = analyzeWeekPlan(
    { skeleton: fixture.skeleton, rawDishes: fixture.rawDishes },
    { scenario: scenario ?? { id: fixture.id, label: fixture.label, expectations: undefined } },
  );
  // Override label from fixture
  analysis.scenarioId = fixture.id;
  analysis.scenarioLabel = fixture.label;

  const paths = writeRunOutputs(runDir, basename(path, '.json'), analysis, fixture, {
    persona: fixture.persona ?? scenario?.persona,
  });
  console.log(`✓ Fixture ${fixture.id} → score ${analysis.score} (${analysis.verdict})`);
  console.log(`  ${paths.mdPath}`);
  return analysis;
}

async function runScenario(scenario, runDir) {
  console.log(`\n▶ Generando: ${scenario.id} (${scenario.label})`);
  const { plan, elapsedMs, weekDates: dates } = await generateForScenario(scenario);
  const analysis = analyzeWeekPlan(plan, { scenario });
  const paths = writeRunOutputs(
    runDir,
    scenario.id,
    analysis,
    { plan, weekDates: dates, scenario },
    { persona: scenario.persona, elapsedMs },
  );
  console.log(`✓ ${scenario.id} → score ${analysis.score} (${analysis.verdict}) en ${elapsedMs}ms`);
  console.log(`  ${paths.mdPath}`);
  return analysis;
}

function writeIndex(runDir, results) {
  const index = {
    generatedAt: new Date().toISOString(),
    results: results.map((r) => ({
      id: r.scenarioId,
      label: r.scenarioLabel,
      score: r.score,
      verdict: r.verdict,
      fails: r.checks.filter((c) => !c.ok && c.severity === 'fail').map((c) => c.id),
      warns: r.checks.filter((c) => !c.ok && c.severity === 'warn').map((c) => c.id),
    })),
  };
  const md = [
    '# Índice de corrida',
    '',
    `| Escenario | Score | Veredicto | Fails | Warns |`,
    `|---|---:|---|---|---|`,
    ...index.results.map(
      (r) =>
        `| ${r.id} | ${r.score} | ${r.verdict} | ${r.fails.join(', ') || '—'} | ${r.warns.join(', ') || '—'} |`,
    ),
    '',
  ].join('\n');
  writeFileSync(join(runDir, 'index.json'), JSON.stringify(index, null, 2));
  writeFileSync(join(runDir, 'index.md'), md);
  console.log(`\nIndex: ${join(runDir, 'index.md')}`);
}

// ── Main ──
async function main() {
  const runDir = makeRunDir();
  const results = [];

  if (fixturePath) {
    results.push(analyzeFixtureFile(fixturePath, runDir));
    writeIndex(runDir, results);
    return;
  }

  if (analyzeFixturesDir) {
    const dir = join(process.cwd(), 'test-results', 'fixtures');
    const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
    for (const f of files) results.push(analyzeFixtureFile(join(dir, f), runDir));
    writeIndex(runDir, results);
    return;
  }

  if (wantsAll) {
    for (const s of SCENARIOS) {
      try {
        results.push(await runScenario(s, runDir));
      } catch (err) {
        console.error(`✗ ${s.id}:`, err.message);
        results.push({
          scenarioId: s.id,
          scenarioLabel: s.label,
          score: 0,
          verdict: 'error',
          checks: [{ id: 'api', ok: false, detail: err.message, severity: 'fail' }],
          personaNotes: [],
        });
      }
    }
    writeIndex(runDir, results);
    return;
  }

  if (scenarioId) {
    const s = getScenario(scenarioId);
    if (!s) {
      console.error(`Escenario desconocido: ${scenarioId}`);
      console.error(`Disponibles: ${listScenarioIds().join(', ')}`);
      process.exit(1);
    }
    results.push(await runScenario(s, runDir));
    writeIndex(runDir, results);
    return;
  }

  console.log(`Uso:
  node scripts/scenario-week-plan.mjs --list
  node scripts/scenario-week-plan.mjs --fixture test-results/fixtures/captured-user-plan-2026-07-13.json
  node scripts/scenario-week-plan.mjs --analyze-fixtures
  node scripts/scenario-week-plan.mjs --scenario ar-promedio-sin-cocina
  node scripts/scenario-week-plan.mjs --all

API base: ${BASE}
Salida:   ${OUT_ROOT}/<timestamp>/`);
  process.exit(1);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
