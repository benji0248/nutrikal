/**
 * Analiza un plan semanal desde la perspectiva de un usuario promedio sin cocina.
 * Puede trabajar sobre la respuesta cruda de la API o sobre un fixture estático.
 */

/** Platos / palabras que suelen intimidar o no ser cotidianos para un cocinero novato (LATAM). */
const INTIMIDATING_PATTERNS = [
  /\bmilanesa\b/i,
  /\bpaniz/i,
  /\bempanad/i,
  /\brisotto\b/i,
  /\bsouffl/i,
  /\bconfit\b/i,
  /\breduction\b|\breducci[oó]n\b/i,
  /\bpoint\b|\ba\s+punto\b|\bmedium\s+rare\b/i,
  /\bmorcilla\b/i,
  /\bbife\b/i,
  /\bojo\s+de\s+bife\b/i,
  /\btartar\b/i,
  /\bceviche\b/i,
  /\bsushi\b/i,
  /\bpate\b|\bpat[eé]\b/i,
  /\bquenelle\b/i,
  /\btempura\b/i,
  /\bflamb/i,
];

/** Platos típicos "fáciles" que un usuario promedio reconoce y suele hacer. */
const BEGINNER_FRIENDLY_PATTERNS = [
  /\bavena\b/i,
  /\btostad/i,
  /\byogur\b|\byogurt\b/i,
  /\bhuevo\b/i,
  /\barroz\b/i,
  /\bfideo|pasta|ñoqui|ñoquis\b/i,
  /\bpapa|pur[eé]\b/i,
  /\bensalada\b/i,
  /\bpollo\b/i,
  /\btortilla\b/i,
  /\bsandwich|sándwich|tostado\b/i,
  /\bfruta|manzana|pera|banana|naranja\b/i,
  /\brevuelto\b/i,
  /\bsaltead/i,
];

const MAIN_SLOTS = new Set(['almuerzo', 'cena']);

/**
 * @param {object} plan
 * @param {object} [opts]
 * @param {object} [opts.scenario]
 * @param {object} [opts.meta]  { budget, maintenanceBudget, slots }
 */
export function analyzeWeekPlan(plan, opts = {}) {
  const scenario = opts.scenario ?? null;
  const expectations = scenario?.expectations ?? {
    maxMainDishAppearances: 3,
    maxPrepMinutes: 25,
    minUniqueMains: 3,
  };

  const skeleton = plan.skeleton ?? { days: [] };
  const rawDishes = plan.rawDishes ?? {};
  const days = skeleton.days ?? [];

  /** Contar apariciones de cada plato (por nombre resuelto). */
  const appearanceByName = new Map();
  const appearanceByTemplate = new Map();
  const daySummaries = [];
  const allPrepTimes = [];
  let linkedSlots = 0;
  let flexSlots = 0;
  let totalSlots = 0;

  for (const day of days) {
    const slots = day.slots ?? [];
    const meals = [];
    for (const slot of slots) {
      totalSlots++;
      if (slot.link) linkedSlots++;
      if (slot.isFlexMeal) flexSlots++;

      const dish = rawDishes[slot.templateId];
      const name = dish?.nombre ?? slot.templateId ?? '?';
      const prep = dish?.tiempo_prep ?? null;
      if (typeof prep === 'number') allPrepTimes.push(prep);

      if (MAIN_SLOTS.has(slot.mealType)) {
        appearanceByName.set(name, (appearanceByName.get(name) ?? 0) + 1);
        appearanceByTemplate.set(
          slot.templateId,
          (appearanceByTemplate.get(slot.templateId) ?? 0) + 1,
        );
      }

      meals.push({
        mealType: slot.mealType,
        name,
        templateId: slot.templateId,
        prepMinutes: prep,
        link: slot.link ?? null,
        isFlexMeal: !!slot.isFlexMeal,
        ingredientCount: dish?.ingredientes?.length ?? null,
        intimidationFlags: flagIntimidating(name),
        beginnerFriendly: isBeginnerFriendly(name) && flagIntimidating(name).length === 0,
      });
    }
    daySummaries.push({
      date: day.date,
      dayMode: day.dayMode ?? 'normal',
      meals,
    });
  }

  const uniqueMains = [...appearanceByName.keys()];
  const overusedMains = [...appearanceByName.entries()]
    .filter(([, n]) => n > expectations.maxMainDishAppearances)
    .map(([name, count]) => ({ name, count }));

  const intimidatingDishes = uniqueMains.filter((n) => flagIntimidating(n).length > 0);
  const beginnerDishes = uniqueMains.filter(
    (n) => isBeginnerFriendly(n) && flagIntimidating(n).length === 0,
  );

  const prepOverLimit = Object.values(rawDishes).filter(
    (d) => typeof d.tiempo_prep === 'number' && d.tiempo_prep > expectations.maxPrepMinutes,
  );

  const avgPrep =
    allPrepTimes.length > 0
      ? Math.round(allPrepTimes.reduce((a, b) => a + b, 0) / allPrepTimes.length)
      : null;

  const checks = [];
  const pushCheck = (id, ok, detail, severity = 'warn') => {
    checks.push({ id, ok, detail, severity: ok ? 'pass' : severity });
  };

  pushCheck(
    'unique_mains',
    uniqueMains.length >= expectations.minUniqueMains,
    `${uniqueMains.length} platos principales únicos (mín ${expectations.minUniqueMains}): ${uniqueMains.join(' · ') || '—'}`,
    'fail',
  );
  pushCheck(
    'main_overuse',
    overusedMains.length === 0,
    overusedMains.length
      ? `Sobreuso (>${expectations.maxMainDishAppearances}x): ${overusedMains.map((o) => `${o.name}×${o.count}`).join(', ')}`
      : `Ningún principal supera ${expectations.maxMainDishAppearances} apariciones`,
    'fail',
  );
  pushCheck(
    'prep_time',
    prepOverLimit.length === 0,
    prepOverLimit.length
      ? `Fuera de ${expectations.maxPrepMinutes} min: ${prepOverLimit.map((d) => `${d.nombre} (${d.tiempo_prep}m)`).join(', ')}`
      : `Todos los platos ≤ ${expectations.maxPrepMinutes} min (avg ${avgPrep ?? '—'}m)`,
    'warn',
  );
  pushCheck(
    'intimidation',
    intimidatingDishes.length === 0,
    intimidatingDishes.length
      ? `Pueden intimidar a un novato: ${intimidatingDishes.join(' · ')}`
      : 'Sin flags de intimidación en nombres de platos',
    'warn',
  );
  pushCheck(
    'beginner_signal',
    beginnerDishes.length >= Math.min(2, uniqueMains.length || 2),
    `Platos con señal "fácil": ${beginnerDishes.length}/${uniqueMains.length}`,
    'info',
  );

  const failCount = checks.filter((c) => !c.ok && c.severity === 'fail').length;
  const warnCount = checks.filter((c) => !c.ok && c.severity === 'warn').length;
  const score = Math.max(0, 100 - failCount * 25 - warnCount * 10);

  const personaNotes = buildPersonaNotes({
    uniqueMains,
    overusedMains,
    intimidatingDishes,
    beginnerDishes,
    avgPrep,
    daySummaries,
    scenario,
  });

  return {
    scenarioId: scenario?.id ?? null,
    scenarioLabel: scenario?.label ?? null,
    score,
    verdict:
      score >= 80 ? 'apto_usuario_promedio' : score >= 60 ? 'mejorable' : 'poco_realista_para_novato',
    checks,
    stats: {
      days: days.length,
      totalSlots,
      linkedSlots,
      flexSlots,
      uniqueMains: uniqueMains.length,
      uniqueTemplates: Object.keys(rawDishes).length,
      appearanceByName: Object.fromEntries(appearanceByName),
      avgPrepMinutes: avgPrep,
      maxPrepMinutes: allPrepTimes.length ? Math.max(...allPrepTimes) : null,
      minPrepMinutes: allPrepTimes.length ? Math.min(...allPrepTimes) : null,
    },
    daySummaries,
    dishes: Object.fromEntries(
      Object.entries(rawDishes).map(([id, d]) => [
        id,
        {
          nombre: d.nombre,
          tiempo_prep: d.tiempo_prep,
          ingredientes: (d.ingredientes || []).map((i) => `${i.nombre} (${i.gramos}g)`),
          tip: d.tip,
          intimidationFlags: flagIntimidating(d.nombre),
          beginnerFriendly:
            isBeginnerFriendly(d.nombre) && flagIntimidating(d.nombre).length === 0,
        },
      ]),
    ),
    personaNotes,
    generatedAt: new Date().toISOString(),
  };
}

function flagIntimidating(name) {
  return INTIMIDATING_PATTERNS.filter((re) => re.test(name)).map((re) => re.source);
}

function isBeginnerFriendly(name) {
  return BEGINNER_FRIENDLY_PATTERNS.some((re) => re.test(name));
}

function buildPersonaNotes(ctx) {
  const notes = [];
  if (ctx.overusedMains.length) {
    notes.push(
      `Como usuario promedio me cansaría ver "${ctx.overusedMains[0].name}" tantas veces (${ctx.overusedMains[0].count}x). Aunque cocinar una vez y repetir ayuda, 4+ veces en la semana ya se siente monótono.`,
    );
  }
  if (ctx.intimidatingDishes.length) {
    notes.push(
      `Platos que me harían dudar al leer el nombre: ${ctx.intimidatingDishes.join(', ')}. Si no sé cocinar, "milanesa casera", "morcilla" o "bife a punto" suenan a restaurante, no a martes a la noche.`,
    );
  }
  if (ctx.beginnerDishes.length) {
    notes.push(
      `Lo que sí me cierra: ${ctx.beginnerDishes.slice(0, 4).join(', ')}. Eso lo armo sin mirar tutorial.`,
    );
  }
  if (ctx.avgPrep != null && ctx.avgPrep > 20) {
    notes.push(
      `El promedio de prep (~${ctx.avgPrep} min) es justo/alto para alguien que llega cansado. Preferiría ≤15-20 en días de semana.`,
    );
  } else if (ctx.avgPrep != null) {
    notes.push(`Tiempos de prep razonables (~${ctx.avgPrep} min promedio).`);
  }

  const sameLunchDinnerDays = ctx.daySummaries.filter((d) => {
    const lunch = d.meals.find((m) => m.mealType === 'almuerzo');
    const dinner = d.meals.find((m) => m.mealType === 'cena');
    return lunch && dinner && lunch.name === dinner.name;
  });
  if (sameLunchDinnerDays.length >= 2) {
    notes.push(
      `${sameLunchDinnerDays.length} días con el mismo plato en almuerzo y cena: práctico para meal-prep, pero psicológicamente pesado si el plato no es súper simple/rico.`,
    );
  }

  if (ctx.scenario?.weekPlanning?.cookingTime === 'rapido') {
    notes.push('Este escenario pide cocina rápida: cualquier plato >20 min o con técnica especial debería bajarse.');
  }

  if (!notes.length) {
    notes.push('Plan equilibrado desde la mirada de un usuario promedio.');
  }
  return notes;
}

/**
 * Renderiza un reporte Markdown legible para humanos.
 */
export function renderAnalysisMarkdown(analysis, extras = {}) {
  const lines = [];
  lines.push(`# Análisis de plan — ${analysis.scenarioLabel ?? analysis.scenarioId ?? 'fixture'}`);
  lines.push('');
  lines.push(`- **Score usuario promedio:** ${analysis.score}/100`);
  lines.push(`- **Veredicto:** \`${analysis.verdict}\``);
  lines.push(`- **Generado:** ${analysis.generatedAt}`);
  if (extras.elapsedMs != null) lines.push(`- **Tiempo API:** ${extras.elapsedMs}ms`);
  if (extras.persona) {
    lines.push('');
    lines.push(`> ${extras.persona}`);
  }
  lines.push('');
  lines.push('## Notas (perspectiva usuario común)');
  for (const n of analysis.personaNotes) lines.push(`- ${n}`);
  lines.push('');
  lines.push('## Checks');
  for (const c of analysis.checks) {
    const icon = c.ok ? '✅' : c.severity === 'fail' ? '❌' : '⚠️';
    lines.push(`- ${icon} **${c.id}**: ${c.detail}`);
  }
  lines.push('');
  lines.push('## Stats');
  lines.push('```json');
  lines.push(JSON.stringify(analysis.stats, null, 2));
  lines.push('```');
  lines.push('');
  lines.push('## Menú día a día');
  for (const day of analysis.daySummaries) {
    lines.push('');
    lines.push(`### ${day.date} (${day.dayMode})`);
    if (!day.meals.length) {
      lines.push('_Sin menú (día libre)_');
      continue;
    }
    for (const m of day.meals) {
      const flags = [];
      if (m.intimidationFlags?.length) flags.push('⚠️ intimida');
      if (m.beginnerFriendly) flags.push('👍 fácil');
      if (m.link) flags.push(`link:${typeof m.link === 'string' ? m.link : 'same'}`);
      const flagStr = flags.length ? ` · ${flags.join(' · ')}` : '';
      lines.push(
        `- **${m.mealType}**: ${m.name}${m.prepMinutes != null ? ` (${m.prepMinutes} min)` : ''}${flagStr}`,
      );
    }
  }
  lines.push('');
  lines.push('## Platos (templates)');
  for (const [id, d] of Object.entries(analysis.dishes)) {
    lines.push('');
    lines.push(`### ${id} — ${d.nombre}`);
    lines.push(`- Prep: ${d.tiempo_prep ?? '—'} min`);
    lines.push(`- Ingredientes: ${(d.ingredientes || []).join(', ') || '—'}`);
    if (d.tip) lines.push(`- Tip: ${d.tip}`);
  }
  lines.push('');
  return lines.join('\n');
}
