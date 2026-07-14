/**
 * Test avanzado: 2 planes semanales con cálculo calórico y comparación de rotación.
 * Uso: node scripts/test-week-plan-v2.mjs
 * Requiere: API server en http://127.0.0.1:3000
 */
import { writeFileSync, readFileSync } from 'fs';

const BASE = 'http://127.0.0.1:3000';
const TS = String(Date.now()).slice(-8);
const USER = `tp_${TS}`;
const EMAIL = `tp_${TS}@nutrikal.local`;

// ── Ingredient DB simplificada (extraída de src/data/ingredients.ts) ──
const ING_DB = [
  // carnes
  { name:'Pechuga de pollo', cal:165, prot:31, carb:0, fat:3.6 },
  { name:'Muslo de pollo', cal:209, prot:26, carb:0, fat:11 },
  { name:'Bife de chorizo', cal:250, prot:26, carb:0, fat:16 },
  { name:'Carne picada común', cal:250, prot:17, carb:0, fat:20 },
  { name:'Carne picada magra', cal:170, prot:21, carb:0, fat:9 },
  { name:'Lomo de res', cal:150, prot:28, carb:0, fat:4 },
  { name:'Nalga', cal:135, prot:22, carb:0, fat:5 },
  { name:'Pollo entero', cal:215, prot:18, carb:0, fat:15 },
  { name:'Bondiola de cerdo', cal:230, prot:27, carb:0, fat:13 },
  { name:'Jamón cocido', cal:115, prot:18, carb:3, fat:4 },
  { name:'Jamón crudo', cal:250, prot:26, carb:0, fat:16 },
  { name:'Merluza', cal:82, prot:18, carb:0, fat:0.8 },
  { name:'Salmón', cal:208, prot:20, carb:0, fat:13 },
  { name:'Atún', cal:144, prot:23, carb:0, fat:5 },
  { name:'Camarones', cal:99, prot:24, carb:0, fat:0.3 },
  // cereales
  { name:'Arroz blanco', cal:130, prot:2.7, carb:28, fat:0.3 },
  { name:'Arroz integral', cal:123, prot:2.6, carb:26, fat:0.9 },
  { name:'Fideos', cal:131, prot:5, carb:25, fat:1.1 },
  { name:'Fideos secos', cal:371, prot:13, carb:75, fat:1.5 },
  { name:'Pan blanco', cal:265, prot:9, carb:49, fat:3.2 },
  { name:'Harina de trigo', cal:364, prot:10, carb:76, fat:1 },
  { name:'Avena', cal:389, prot:17, carb:66, fat:6.9 },
  { name:'Quinoa cocida', cal:120, prot:4.4, carb:21, fat:1.9 },
  // verduras
  { name:'Papa', cal:77, prot:2, carb:17, fat:0.1 },
  { name:'Batata', cal:86, prot:1.6, carb:20, fat:0.1 },
  { name:'Cebolla', cal:40, prot:1.1, carb:9, fat:0.1 },
  { name:'Tomate', cal:18, prot:0.9, carb:3.9, fat:0.2 },
  { name:'Morrón rojo', cal:31, prot:1, carb:6, fat:0.3 },
  { name:'Zanahoria', cal:41, prot:0.9, carb:10, fat:0.2 },
  { name:'Lechuga', cal:15, prot:1.4, carb:2.9, fat:0.2 },
  { name:'Zapallito', cal:17, prot:1.2, carb:3.1, fat:0.3 },
  { name:'Espinaca', cal:23, prot:2.9, carb:3.6, fat:0.4 },
  { name:'Acelga', cal:19, prot:1.8, carb:3.7, fat:0.2 },
  { name:'Brócoli', cal:34, prot:2.8, carb:7, fat:0.4 },
  { name:'Choclo', cal:96, prot:3.3, carb:19, fat:1.2 },
  { name:'Palta', cal:160, prot:2, carb:9, fat:15 },
  // frutas
  { name:'Manzana', cal:52, prot:0.3, carb:14, fat:0.2 },
  { name:'Banana', cal:89, prot:1.1, carb:23, fat:0.3 },
  { name:'Naranja', cal:47, prot:0.9, carb:12, fat:0.1 },
  // lacteos
  { name:'Queso cremoso', cal:290, prot:19, carb:2, fat:23 },
  { name:'Manteca', cal:717, prot:0.9, carb:0.1, fat:81 },
  { name:'Huevo', cal:143, prot:12, carb:0.7, fat:9.5 },
  // grasas
  { name:'Aceite de oliva', cal:884, prot:0, carb:0, fat:100 },
];

const ALIASES = {
  'aceite oliva': 'Aceite de oliva',
  'morron rojo': 'Morrón rojo',
  'morrón rojo': 'Morrón rojo',
  'pechuga de pollo': 'Pechuga de pollo',
  'pollo': 'Pechuga de pollo',
  'carne picada': 'Carne picada común',
};

function matchIngredient(name) {
  const key = name.toLowerCase().trim();
  if (ALIASES[key]) return ING_DB.find(i => i.name === ALIASES[key]);
  return ING_DB.find(i => i.name.toLowerCase() === key);
}

function calcDishCalories(dish) {
  const ings = [];
  let totalCal = 0, totalProt = 0, totalCarb = 0, totalFat = 0;
  for (const ing of (dish.ingredientes || [])) {
    const match = matchIngredient(ing.nombre);
    const factor = (ing.gramos || 0) / 100;
    const cal = match ? match.cal * factor : 0;
    const prot = match ? match.prot * factor : 0;
    const carb = match ? match.carb * factor : 0;
    const fat = match ? match.fat * factor : 0;
    ings.push({ name: ing.nombre, grams: ing.gramos, matched: !!match, cal: Math.round(cal) });
    totalCal += cal;
    totalProt += prot;
    totalCarb += carb;
    totalFat += fat;
  }
  return { ings, totalCal: Math.round(totalCal), totalProt: Math.round(totalProt*10)/10, totalCarb: Math.round(totalCarb*10)/10, totalFat: Math.round(totalFat*10)/10 };
}

// ── Metabolic math (mirrors api/_lib/metabolic.ts) ──
function computeMetabolism({ birthDate, sex, heightCm, weightKg, activityLevel, goal }) {
  const age = new Date().getFullYear() - new Date(birthDate).getFullYear();
  let bmr = 10 * weightKg + 6.25 * heightCm - 5 * age;
  bmr = sex === 'male' ? bmr + 5 : bmr - 161;
  const actMul = { sedentary:1.2, light:1.375, moderate:1.55, active:1.725, very_active:1.9 };
  const tdee = Math.round(bmr * (actMul[activityLevel] || 1.55));
  const offsets = { lose:-500, maintain:0, gain:350 };
  const budget = Math.max(1200, tdee + (offsets[goal] || 0));
  const maintenanceBudget = goal !== 'maintain' ? Math.round(bmr * (actMul[activityLevel] || 1.55)) : budget;
  const slotPcts = { desayuno:0.25, almuerzo:0.35, cena:0.30, snack:0.10 };
  const slots = {};
  for (const [k, v] of Object.entries(slotPcts)) {
    slots[k] = Math.floor(budget * v);
  }
  return { bmr: Math.round(bmr), tdee, budget, maintenanceBudget, slots, goal, age };
}

// ── Helpers ──
function nextMonday() {
  const d = new Date();
  d.setDate(d.getDate() + ((1 + 7 - d.getDay()) % 7 || 7));
  return d;
}
function fmtDate(d) { return d.toISOString().slice(0, 10); }
function weekDates() {
  const mon = nextMonday();
  const dates = [];
  for (let i = 0; i < 7; i++) { const d = new Date(mon); d.setDate(d.getDate() + i); dates.push(fmtDate(d)); }
  return dates;
}
async function api(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json();
  return { status: res.status, ok: res.ok, data };
}

// ── Main ──
async function main() {
  const log = [];
  const add = (section, content) => {
    const str = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
    log.push(`\n## ${section}\n${str}`);
    console.log(`[${section}]`, str.slice(0, 300));
  };

  // ── Metabolic Profile ──
  const perfMeta = {
    birthDate: '1990-06-15',
    sex: 'male',
    heightCm: 175,
    weightKg: 78,
    activityLevel: 'moderate',
    goal: 'maintain',
  };
  const meta = computeMetabolism(perfMeta);

  add('0. PERFIL METABÓLICO', '');
  add('  Datos', `Hombre, ${meta.age} años, 175cm, 78kg, moderado, mantener peso`);
  add('  BMR', `${meta.bmr} kcal/día`);
  add('  TDEE', `${meta.tdee} kcal/día`);
  add('  Presupuesto diario', `${meta.budget} kcal/día (goal: ${meta.goal})`);
  add('  Por slot', `Desayuno: ~${meta.slots.desayuno} | Almuerzo: ~${meta.slots.almuerzo} | Cena: ~${meta.slots.cena} | Snack: ~${meta.slots.snack} kcal`);

  // ── Auth ──
  add('1. AUTH', `Usuario: ${USER}`);
  let token;
  const r1 = await api('POST', '/api/auth/register', { username: USER, email: EMAIL, password: 'Test1234!', displayName: 'Tester Rotacion' });
  if (r1.ok) {
    token = r1.data.token;
  } else {
    const r1b = await api('POST', '/api/auth/login', { identifier: USER, password: 'Test1234!' });
    if (!r1b.ok) { add('ERROR AUTH', JSON.stringify(r1b.data)); writeFileSync('test-plan-v2-output.txt', log.join('\n'), 'utf8'); return; }
    token = r1b.data.token;
  }
  add('  Token', token ? token.slice(0, 20) + '...' : 'FAIL');

  // ── Profile ──
  const r3 = await api('PUT', '/api/business/profile', { profile: { id: USER, name: 'Tester Rotacion', birthDate: '1990-06-15', sex: 'male', heightCm: 175, weightKg: 78, activityLevel: 'moderate', goal: 'maintain', restrictions: [], dislikedIngredientIds: [], dislikedCategories: [], allowedExceptions: [], nationality: 'Argentina' } }, token);
  add('2. PROFILE', `OK=${r3.ok}`);

  // ── Pool ──
  const poolPrompt = `CANASTA SEMANAL — usá estos ingredientes (priorizá estructurales y contextuales). Cada uno incluye sus kcal/100g:
ESTRUCTURALES:
ing_001: Arroz blanco (130 kcal/100g)
ing_002: Arroz integral (123 kcal/100g)
ing_005: Fideos (131 kcal/100g)
ing_006: Papa (77 kcal/100g)
ing_007: Batata (86 kcal/100g)
ing_010: Pan blanco (265 kcal/100g)
ing_013: Harina de trigo (364 kcal/100g)
ing_022: Pechuga de pollo (165 kcal/100g)
ing_036: Carne picada común (250 kcal/100g)
ing_037: Bife de chorizo (250 kcal/100g)
CONTEXTUALES:
ing_015: Huevo (143 kcal/100g)
ing_032: Queso cremoso (290 kcal/100g)
ing_038: Tomate (18 kcal/100g)
ing_039: Cebolla (40 kcal/100g)
ing_040: Morrón rojo (31 kcal/100g)
ing_041: Zanahoria (41 kcal/100g)
ing_042: Lechuga (15 kcal/100g)
ing_043: Zapallito (17 kcal/100g)
ing_045: Espinaca (23 kcal/100g)
ing_046: Acelga (19 kcal/100g)
ing_048: Brócoli (34 kcal/100g)
ing_050: Choclo (96 kcal/100g)
ing_052: Palta (160 kcal/100g)
ing_059: Manzana (52 kcal/100g)
ing_065: Banana (89 kcal/100g)
ing_066: Naranja (47 kcal/100g)
OPCIONALES:
ing_076: Aceite de oliva (884 kcal/100g)
ing_077: Manteca (717 kcal/100g)`;

  const weekPlanning = {
    mealPattern: 'four',
    mealRhythmMode: 'balanced',
    streakDays: 3,
    weekdayFlexRules: [],
    flexMealsPerWeek: 2,
    flexMealScope: 'one_meal',
    preferredFlexWeekdays: [5, 6],
    weekdayRulesPrompt: 'Todos los dias normales. Sábado y domingo con 1 flex meal cada uno.',
    activeSlots: ['desayuno', 'almuerzo', 'cena', 'snack'],
    cookingTime: 'normal',
    budget: 'normal',
  };

  const dates = weekDates();

  // ═══════════════ PLAN 1 ═══════════════
  add('3. PLAN 1', `Fechas: ${dates.join(', ')}`);
  const t0a = Date.now();
  const rA = await api('POST', '/api/ai/week-plan', { weekDates: dates, weekPlanning, weeklyPoolPrompt: poolPrompt, forbiddenDishNames: [], variationSeed: `test1-${Date.now()}` }, token);
  const timeA = Date.now() - t0a;
  add('  Status', `OK=${rA.ok} Time=${timeA}ms`);

  const planA = rA.data;

  // ═══════════════ PLAN 2 ═══════════════
  add('4. PLAN 2', `Llamando con variationSeed diferente...`);
  const t0b = Date.now();
  const rB = await api('POST', '/api/ai/week-plan', { weekDates: dates, weekPlanning, weeklyPoolPrompt: poolPrompt, forbiddenDishNames: [], variationSeed: `test2-${Date.now()}` }, token);
  const timeB = Date.now() - t0b;
  add('  Status', `OK=${rB.ok} Time=${timeB}ms`);

  const planB = rB.data;

  // ═══════════════ ANÁLISIS DETALLADO ═══════════════
  add('', '');
  add('═'.repeat(60), '');
  add('  ANÁLISIS CALÓRICO Y DE ROTACIÓN', '');
  add('═'.repeat(60), '');

  for (let pi = 0; pi < 2; pi++) {
    const plan = pi === 0 ? planA : planB;
    const label = pi === 0 ? 'PLAN 1' : 'PLAN 2';
    add('', '');
    add(`─── ${label} ───`, '');

    // Calorías por plato
    const dishCalories = {};
    if (plan.rawDishes) {
      for (const [id, dish] of Object.entries(plan.rawDishes)) {
        const calc = calcDishCalories(dish);
        dishCalories[id] = calc;
        add(`  PLATO ${id}: ${dish.nombre}`, `  Calorías estimadas: ${calc.totalCal} kcal (P:${calc.totalProt}g C:${calc.totalCarb}g F:${calc.totalFat}g)`);
        for (const i of calc.ings) {
          const icon = i.matched ? '✓' : '✗';
          add(`    ${icon} ${i.name}: ${i.grams}g → ${i.cal} kcal`, '');
        }
      }
    }

    // Calorías por día y comparación con presupuesto
    if (plan.skeleton?.days) {
      add('', '');
      add('  RESUMEN DIARIO', '');
      add('  ┌────────────┬──────────────────────────────────────────────────────────┬──────────┬──────────┬────────┐', '');
      add('  │ Día        │ Slots                                                     │ Est kcal │ Budget   │ Desvío │', '');
      add('  ├────────────┼──────────────────────────────────────────────────────────┼──────────┼──────────┼────────┤', '');

      let weekEst = 0;
      for (const day of plan.skeleton.days) {
        let dayEst = 0;
        const parts = [];
        for (const slot of day.slots) {
          const dc = dishCalories[slot.templateId];
          const cal = dc ? dc.totalCal : 0;
          dayEst += cal;
          parts.push(`${slot.mealType.slice(0,3)}:${cal}`);
        }
        weekEst += dayEst;
        const budg = meta.budget;
        const dev = dayEst - budg;
        const devSign = dev >= 0 ? '+' : '';
        add(`  │ ${day.date} │ ${parts.join(' | ').padEnd(52)} │ ${String(dayEst).padStart(6)}   │ ${String(budg).padStart(6)}   │ ${devSign}${dev}  │`, '');
      }
      add('  └────────────┴──────────────────────────────────────────────────────────┴──────────┴──────────┴────────┘', '');
      add(`  TOTAL SEMANAL ESTIMADO: ${weekEst} kcal (${Math.round(weekEst/7)}/día vs ${meta.budget} presupuesto)`, '');
    }
  }

  // ═══════════════ COMPARACIÓN DE ROTACIÓN ═══════════════
  add('', '');
  add('═'.repeat(60), '');
  add('  COMPARACIÓN DE ROTACIÓN ENTRE PLANES', '');
  add('═'.repeat(60), '');

  const namesA = planA.rawDishes ? Object.values(planA.rawDishes).map(d => d.nombre) : [];
  const namesB = planB.rawDishes ? Object.values(planB.rawDishes).map(d => d.nombre) : [];

  const shared = namesA.filter(n => namesB.includes(n));
  const uniqueA = namesA.filter(n => !namesB.includes(n));
  const uniqueB = namesB.filter(n => !namesA.includes(n));

  add('  Plan 1 platos', `${namesA.length}: ${namesA.join(' | ')}`);
  add('  Plan 2 platos', `${namesB.length}: ${namesB.join(' | ')}`);
  add('  Compartidos', `${shared.length}: ${shared.join(' | ') || 'NINGUNO'}`);
  add('  Exclusivos P1', `${uniqueA.length}: ${uniqueA.join(' | ') || 'NINGUNO'}`);
  add('  Exclusivos P2', `${uniqueB.length}: ${uniqueB.join(' | ') || 'NINGUNO'}`);

  const rotPct = namesA.length + namesB.length > 0
    ? Math.round(((uniqueA.length + uniqueB.length) / (namesA.length + namesB.length)) * 100)
    : 0;
  add('  TASA DE ROTACIÓN', `${rotPct}% de platos son diferentes entre planes`);
  add('  Tiempos', `Plan 1: ${timeA}ms | Plan 2: ${timeB}ms`);

  // Save
  writeFileSync('test-plan-v2-output.txt', log.join('\n'), 'utf8');
  console.log('\n✓ Resultado guardado en test-plan-v2-output.txt');
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
