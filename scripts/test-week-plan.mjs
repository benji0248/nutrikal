/**
 * Test script: genera un plan semanal via la API local y guarda el resultado.
 * Uso: node scripts/test-week-plan.mjs
 * Requiere: API server corriendo en http://127.0.0.1:3000
 */
import { writeFileSync } from 'fs';

const BASE = 'http://127.0.0.1:3000';
const TS = String(Date.now()).slice(-8);
const USER = `tu_${TS}`;
const EMAIL = `t_${TS}@nutrikal.local`;

// ── Helpers ──

function nextMonday() {
  const d = new Date();
  d.setDate(d.getDate() + ((1 + 7 - d.getDay()) % 7 || 7));
  return d;
}

function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

function weekDates() {
  const mon = nextMonday();
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(mon);
    d.setDate(d.getDate() + i);
    dates.push(formatDate(d));
  }
  return dates;
}

async function api(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  return { status: res.status, ok: res.ok, data };
}

// ── Main ──

async function main() {
  console.log('=== NUTRIKAL - Test Plan Semanal ===\n');
  const log = [];
  const add = (section, content) => {
    const str = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
    log.push(`\n## ${section}\n${str}`);
    console.log(`[${section}]`, str.slice(0, 300));
  };

  // 1. Register
  add('1. REGISTER', `Usuario: ${USER}`);
  const r1 = await api('POST', '/api/auth/register', {
    username: USER,
    email: EMAIL,
    password: 'Test1234!',
    displayName: 'Tester Semanal',
  });
  if (!r1.ok) {
    add('REGISTER ERROR', `status=${r1.status} data=${JSON.stringify(r1.data)}`);
    // If user exists (409), try login. Otherwise fail.
    if (r1.status === 409 || (r1.data.error && r1.data.error.includes('ya está'))) {
      add('1b. LOGIN', 'Usuario ya existe, intentando login...');
      const r1b = await api('POST', '/api/auth/login', {
        identifier: USER,
        password: 'Test1234!',
      });
      if (!r1b.ok) {
        add('LOGIN ERROR', `status=${r1b.status} data=${JSON.stringify(r1b.data)}`);
        writeFileSync('test-plan-output.txt', log.join('\n'), 'utf8');
        return;
      }
      add('2. TOKEN', r1b.data.token.slice(0, 30) + '...');
      var token = r1b.data.token;
    } else {
      add('FATAL', 'Register falló y no es duplicate user. Abortando.');
      writeFileSync('test-plan-output.txt', log.join('\n'), 'utf8');
      return;
    }
  } else {
    add('2. TOKEN', r1.data.token.slice(0, 30) + '...');
    var token = r1.data.token;
  }

  // 3. Create profile
  add('3. PROFILE', 'Creando perfil nutricional...');
  const profilePayload = {
    profile: {
      id: USER,
      name: 'Tester Semanal',
      birthDate: '1990-06-15',
      sex: 'male',
      heightCm: 175,
      weightKg: 78,
      activityLevel: 'moderate',
      goal: 'maintain',
      restrictions: [],
      dislikedIngredientIds: [],
      dislikedCategories: [],
      allowedExceptions: [],
      nationality: 'Argentina',
    },
  };
  const r3 = await api('PUT', '/api/business/profile', profilePayload, token);
  add('3. RESULT', `OK=${r3.ok} status=${r3.status}`);

  // 4. Build weekly pool prompt (canasta semanal simplificada para el test)
  const poolPrompt = `CANASTA SEMANAL — usá estos ingredientes (priorizá estructurales y contextuales):
ESTRUCTURALES:
ing_001: Arroz blanco
ing_002: Arroz integral
ing_005: Fideos
ing_006: Papa
ing_007: Batata
ing_010: Pan blanco
ing_013: Harina de trigo
ing_022: Pechuga de pollo
ing_036: Carne picada
ing_037: Bife de chorizo
CONTEXTUALES:
ing_015: Huevo
ing_032: Queso cremoso
ing_038: Tomate
ing_039: Cebolla
ing_040: Morrón rojo
ing_041: Zanahoria
ing_042: Lechuga
ing_043: Zapallito
ing_045: Espinaca
ing_046: Acelga
ing_048: Brócoli
ing_050: Choclo
ing_052: Palta
ing_059: Manzana
ing_065: Banana
ing_066: Naranja
OPCIONALES:
ing_076: Aceite de oliva
ing_077: Manteca`;

  // 5. Generate week plan
  const dates = weekDates();
  add('4. WEEK DATES', dates.join(', '));
  add('5. GENERATING', 'Llamando a POST /api/ai/week-plan...');

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

  const t0 = Date.now();
  const r5 = await api('POST', '/api/ai/week-plan', {
    weekDates: dates,
    weekPlanning,
    weeklyPoolPrompt: poolPrompt,
    forbiddenDishNames: [],
    variationSeed: `test-${TS}`,
  }, token);
  const elapsed = Date.now() - t0;

  add('5. RESPONSE', `Status=${r5.status} OK=${r5.ok} Time=${elapsed}ms`);
  add('5. RAW', r5.data);

  // 6. Analysis
  add('6. ANALYSIS', '');
  const { skeleton, rawDishes, text, remaining } = r5.data;

  if (skeleton) {
    const days = skeleton.days || [];
    add('  DAYS', days.length);
    for (const day of days) {
      const slots = (day.slots || []).map(s => `${s.mealType}:${s.templateId}${s.link ? ` (link:${typeof s.link === 'string' ? s.link : 'same:' + s.link.sameAsTemplateId})` : ''}${s.isFlexMeal ? ' [FLEX]' : ''}`);
      add(`  ${day.date} (${day.dayMode})`, slots.join(' | '));
    }
  }

  if (rawDishes) {
    const dishIds = Object.keys(rawDishes);
    add('  DISHES', dishIds.length);
    for (const [id, dish] of Object.entries(rawDishes)) {
      const ings = (dish.ingredientes || []).map(i => `${i.nombre}(${i.gramos}g)`).join(', ');
      add(`  ${id}: ${dish.nombre}`, `Ingredientes: ${ings}\nPrep: ${dish.tiempo_prep}min | Tip: ${dish.tip}`);
    }
  }

  add('  META', `Text: ${text}\nRemaining: ${remaining}\nTime: ${elapsed}ms`);

  // 7. Quality checks
  add('7. QUALITY CHECKS', '');
  const checks = [];

  if (skeleton?.days) {
    checks.push(`Dias generados: ${skeleton.days.length} (esperado 7)`);
    
    let totalSlots = 0;
    let slotsWithLinks = 0;
    let flexMeals = 0;
    const templateIdsUsed = new Set();
    const mealTypesPerDay = [];

    for (const day of skeleton.days) {
      totalSlots += day.slots.length;
      const mtSet = new Set(day.slots.map(s => s.mealType));
      mealTypesPerDay.push([...mtSet].sort().join(','));

      for (const slot of day.slots) {
        if (slot.link) slotsWithLinks++;
        if (slot.isFlexMeal) flexMeals++;
        if (slot.templateId) templateIdsUsed.add(slot.templateId);
      }
    }

    checks.push(`Total slots: ${totalSlots}`);
    checks.push(`Slots con links: ${slotsWithLinks}`);
    checks.push(`Flex meals: ${flexMeals}`);
    checks.push(`Templates unicos usados: ${templateIdsUsed.size}`);
    checks.push(`Tipos de comida por dia: ${mealTypesPerDay.join(' | ')}`);
  }

  if (rawDishes) {
    const dishCount = Object.keys(rawDishes).length;
    checks.push(`Platos unicos (rawDishes): ${dishCount}`);
    
    let totalIngs = 0;
    for (const dish of Object.values(rawDishes)) {
      totalIngs += (dish.ingredientes || []).length;
    }
    checks.push(`Promedio ingredientes por plato: ${(totalIngs / dishCount).toFixed(1)}`);
    
    const prepTimes = Object.values(rawDishes).map(d => d.tiempo_prep).filter(Boolean);
    if (prepTimes.length) {
      checks.push(`Tiempo prep min/max/avg: ${Math.min(...prepTimes)}/${Math.max(...prepTimes)}/${(prepTimes.reduce((a,b)=>a+b,0)/prepTimes.length).toFixed(0)}min`);
    }
  }

  checks.push(`Tiempo de respuesta API: ${elapsed}ms`);
  for (const c of checks) add('  CHECK', c);

  // Write full output
  writeFileSync('test-plan-output.txt', log.join('\n'), 'utf8');
  console.log('\n✓ Resultado guardado en test-plan-output.txt');
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
