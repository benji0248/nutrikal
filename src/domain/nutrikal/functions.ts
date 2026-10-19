import { differenceInCalendarDays, parseISO } from 'date-fns';
import { ALL_CATEGORIES, MEAL_TYPE_ORDER } from '../../types/index.js';
import type { CalculatorEntry, Ingredient, IngredientSignalEntry } from '../../types/index.js';
import { filterIngredientsForUser } from '../../services/ingredientFilter.js';
import { buildIngredientTasteScores } from '../../services/ingredientTasteModel.js';
import { computeMetabolism } from '../../services/metabolicService.js';
import { getActiveMealSlots, getMealSlotBudgetForPattern } from '../../services/portionEngine.js';
import { normalizeWeekPlanningProfile } from '../../utils/flexDayHelpers.js';
import { isIngredientDisliked } from '../../utils/foodPreferences.js';
import { computeMacrosForEntry, computeTotalMacros } from '../../utils/macroHelpers.js';
import type { AfinidadIngrediente, ComidaRegistrada, ConsultaComidas, ContextoUsuario, CriteriosSeleccion, FiltrosIngredientes, Intervalo, Pagina, PreferenciasUsuario, UsoReciente } from './types.js';
import { exigir, fechaValida, normalizarNombre, validarIds, validarIntervalo } from './validation.js';

function pagina<T>(elementos: T[], offset = 0, limite = 50): Pagina<T> {
  exigir(Number.isSafeInteger(offset) && offset >= 0, 'El offset debe ser un entero no negativo.');
  exigir(Number.isInteger(limite) && limite >= 1 && limite <= 200, 'El límite debe estar entre 1 y 200.');
  return { elementos: elementos.slice(offset, offset + limite), total: elementos.length, offset, limite, hayMas: offset + limite < elementos.length };
}

/** Saved facts are distinct from calculated application targets. Missing profiles are never invented. */
export function obtenerObjetivo(contexto: ContextoUsuario) {
  const calculo = contexto.perfilMetabolico ? computeMetabolism(contexto.perfilMetabolico) : null;
  return { perfilDisponible: contexto.existe, objetivo: contexto.objetivo,
    calculo: calculo ? { presupuestoDiarioKcal: calculo.budget, mantenimientoKcal: calculo.tdee, macrosObjetivoGramos: calculo.macroSplit, origen: 'reglas_actuales_nutrikal' as const } : null };
}

export function obtenerPreferencias(contexto: ContextoUsuario) {
  return { perfilDisponible: contexto.existe, preferencias: contexto.preferencias ? structuredClone(contexto.preferencias) : null };
}

export function obtenerRutina(contexto: ContextoUsuario) {
  const rutina = contexto.rutina ? normalizeWeekPlanningProfile(structuredClone(contexto.rutina)) : null;
  const presupuesto = contexto.perfilMetabolico ? computeMetabolism(contexto.perfilMetabolico).budget : null;
  const horarios = rutina ? getActiveMealSlots(rutina.mealPattern) : [];
  return { configurada: rutina !== null, rutina, horarios,
    presupuestosPorHorario: rutina && presupuesto !== null ? Object.fromEntries(horarios.map((tipo) => [tipo, getMealSlotBudgetForPattern(presupuesto, tipo, rutina.mealPattern)])) : null };
}

export function obtenerComidas(comidas: ComidaRegistrada[], consulta: ConsultaComidas): Pagina<ComidaRegistrada> {
  validarIntervalo(consulta);
  if (consulta.tipos !== undefined) exigir(Array.isArray(consulta.tipos) && consulta.tipos.every((tipo) => MEAL_TYPE_ORDER.includes(tipo)), 'Los horarios de comida son inválidos.');
  if (consulta.incluirAlternativas !== undefined) exigir(typeof consulta.incluirAlternativas === 'boolean', 'incluirAlternativas debe ser booleano.');
  if (consulta.soloRealizadas !== undefined) exigir(typeof consulta.soloRealizadas === 'boolean', 'soloRealizadas debe ser booleano.');
  const elegidas = comidas.filter((comida) => comida.fecha >= consulta.desde && comida.fecha <= consulta.hasta
    && (!consulta.tipos?.length || consulta.tipos.includes(comida.tipo))
    && (consulta.incluirAlternativas !== false || !comida.alternativa)
    && (!consulta.soloRealizadas || comida.realizada))
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || MEAL_TYPE_ORDER.indexOf(a.tipo) - MEAL_TYPE_ORDER.indexOf(b.tipo) || a.id.localeCompare(b.id));
  return structuredClone(pagina(elegidas, consulta.offset, consulta.limite));
}

export function buscarIngredientes(catalogo: Ingredient[], filtros: FiltrosIngredientes = {}): Pagina<Ingredient> {
  if (filtros.texto !== undefined) exigir(typeof filtros.texto === 'string' && filtros.texto.length <= 150, 'El texto de búsqueda admite hasta 150 caracteres.');
  if (filtros.ids !== undefined) validarIds(filtros.ids);
  if (filtros.categorias !== undefined) exigir(Array.isArray(filtros.categorias) && filtros.categorias.every((c) => ALL_CATEGORIES.includes(c)), 'Categoría inválida.');
  if (filtros.cocinas !== undefined) exigir(Array.isArray(filtros.cocinas) && filtros.cocinas.every((c) => ['ar', 'asian', 'mediterranean', 'latin', 'international'].includes(c)), 'Cocina inválida.');
  const palabras = normalizarNombre(filtros.texto ?? '').split(' ').filter(Boolean);
  const encontrados = catalogo.filter((ing) => (!filtros.ids?.length || filtros.ids.includes(ing.id))
    && (!filtros.categorias?.length || filtros.categorias.includes(ing.category))
    && (!filtros.cocinas?.length || (ing.cuisine && filtros.cocinas.includes(ing.cuisine)))
    && palabras.every((palabra) => normalizarNombre(ing.name).includes(palabra)))
    .sort((a, b) => a.name.localeCompare(b.name, 'es') || a.id.localeCompare(b.id));
  return structuredClone(pagina(encontrados, filtros.offset, filtros.limite));
}

/** Soft affinity comes from signals only. Rotation is calculated separately, not mistaken for dislike. */
export function obtenerAfinidadIngredientes(catalogo: Ingredient[], preferencias: PreferenciasUsuario, senales: IngredientSignalEntry[], fechaReferencia: string): AfinidadIngrediente[] {
  exigir(fechaValida(fechaReferencia), 'La fecha de referencia es inválida.');
  const vigentes = senales.filter((senal) => fechaValida(senal.fecha) && senal.fecha <= fechaReferencia && differenceInCalendarDays(parseISO(fechaReferencia), parseISO(senal.fecha)) < 120);
  const puntajes = buildIngredientTasteScores(catalogo, { signals: vigentes, recentPoolHistory: [], referenceDate: fechaReferencia });
  const permitidos = new Set(filterIngredientsForUser(catalogo, preferencias).map((ing) => ing.id));
  return catalogo.map((ing) => {
    const referencias = new Set([ing.id, normalizarNombre(ing.name)]);
    const evidencia = vigentes.filter((senal) => [...senal.ingredientes_sugeridos, ...senal.ingredientes_finales, ...senal.ingredientes_agregados, ...senal.ingredientes_removidos]
      .some((ref) => referencias.has(ref) || referencias.has(normalizarNombre(ref)))).length;
    const permitido = permitidos.has(ing.id);
    return { ingredienteId: ing.id, nombre: ing.name, permitido, puntuacion: permitido ? Math.round((puntajes.get(ing.id) ?? 1) * 1000) / 1000 : null,
      fuente: !permitido ? isIngredientDisliked(ing, preferencias) ? 'exclusion_explicita' : 'restriccion' : evidencia ? 'senales_de_uso' : 'sin_evidencia', senales: evidencia };
  });
}

/** Counts registered meals; a planned meal is never presented as food actually eaten. */
export function obtenerUsoRecienteIngredientes(catalogo: Ingredient[], comidas: ComidaRegistrada[], intervalo: Intervalo): UsoReciente {
  validarIntervalo(intervalo, 120);
  const porId = new Map(catalogo.map((ing) => [ing.id, ing]));
  const porNombre = new Map<string, Ingredient[]>();
  for (const ing of catalogo) { const nombre = normalizarNombre(ing.name); porNombre.set(nombre, [...(porNombre.get(nombre) ?? []), ing]); }
  const uso = new Map<string, UsoReciente['ingredientes'][number]>();
  const sinResolver: UsoReciente['sinResolver'] = [];
  let alternativasExcluidas = 0;
  for (const comida of comidas) {
    if (comida.fecha < intervalo.desde || comida.fecha > intervalo.hasta) continue;
    if (comida.alternativa) { alternativasExcluidas++; continue; }
    const ids = new Set<string>();
    const sinResolverEnComida = new Set<string>();
    for (const entrada of comida.ingredientes) {
      if (porId.has(entrada.ingredientId)) ids.add(entrada.ingredientId);
      else sinResolverEnComida.add(entrada.ingredientId);
    }
    for (const entrada of comida.ingredientesIA) {
      const matches = porNombre.get(normalizarNombre(entrada.name));
      if (matches?.length === 1) ids.add(matches[0].id);
      else sinResolverEnComida.add(entrada.name);
    }
    for (const referencia of sinResolverEnComida) sinResolver.push({ comidaId: comida.id, fecha: comida.fecha, referencia });
    for (const id of ids) {
      const registro = uso.get(id) ?? { ingredienteId: id, nombre: porId.get(id)!.name, comidasRealizadas: 0, comidasPlanificadas: 0, ultimaRealizada: null, ultimaPlanificada: null };
      if (comida.realizada) {
        registro.comidasRealizadas++;
        if (!registro.ultimaRealizada || registro.ultimaRealizada < comida.fecha) registro.ultimaRealizada = comida.fecha;
      } else {
        registro.comidasPlanificadas++;
        if (!registro.ultimaPlanificada || registro.ultimaPlanificada < comida.fecha) registro.ultimaPlanificada = comida.fecha;
      }
      uso.set(id, registro);
    }
  }
  return { ...intervalo, ingredientes: [...uso.values()].sort((a, b) => a.ingredienteId.localeCompare(b.ingredienteId)), sinResolver, alternativasExcluidas };
}

function variacion(semilla: string, id: string): number {
  let hash = 2166136261;
  for (const letra of `${semilla}:${id}`) hash = Math.imul(hash ^ letra.charCodeAt(0), 16777619);
  return (hash >>> 0) / 4294967296 * 0.35;
}

/** Candidate selection is read-only and independent of weeks, dates of a plan or model provider. */
export function seleccionarIngredientes(catalogo: Ingredient[], preferencias: PreferenciasUsuario, afinidades: AfinidadIngrediente[], uso: UsoReciente, criterios: CriteriosSeleccion, historialCanastas: string[][] = []) {
  exigir(Number.isInteger(criterios.cantidad) && criterios.cantidad >= 1 && criterios.cantidad <= 100, 'La cantidad debe estar entre 1 y 100.');
  exigir(typeof criterios.semilla === 'string' && criterios.semilla.length > 0 && criterios.semilla.length <= 200, 'Indicá una semilla de entre 1 y 200 caracteres.');
  if (criterios.excluirIds !== undefined) validarIds(criterios.excluirIds);
  if (criterios.priorizarIds !== undefined) validarIds(criterios.priorizarIds);
  exigir(criterios.filtros?.offset === undefined && criterios.filtros?.limite === undefined, 'La selección usa cantidad; no admite paginación en sus filtros.');
  // Apply the exact same search semantics without silently losing candidates after the first page.
  const candidatos: Ingredient[] = [];
  for (let offset = 0; ; offset += 200) {
    const pagina = buscarIngredientes(catalogo, { ...criterios.filtros, offset, limite: 200 });
    candidatos.push(...pagina.elementos);
    if (!pagina.hayMas) break;
  }
  const permitidos = filterIngredientsForUser(candidatos, preferencias).filter((ing) => !criterios.excluirIds?.includes(ing.id));
  const porAfinidad = new Map(afinidades.map((item) => [item.ingredienteId, item]));
  const porUso = new Map(uso.ingredientes.map((item) => [item.ingredienteId, item]));
  const ordenados = permitidos.map((ingrediente) => {
    const afinidad = porAfinidad.get(ingrediente.id);
    const reciente = porUso.get(ingrediente.id);
    const penalizacionUso = reciente ? Math.min(3, reciente.comidasRealizadas * 0.35 + reciente.comidasPlanificadas * 0.15) : 0;
    const aparicionesCanasta = historialCanastas.slice(-5).filter((ids) => ids.includes(ingrediente.id)).length;
    const prioridad = criterios.priorizarIds?.includes(ingrediente.id) ? 2 : 0;
    const puntuacion = Math.max(0.08, afinidad?.puntuacion ?? 1) - penalizacionUso - aparicionesCanasta * 0.5 + prioridad + variacion(criterios.semilla, ingrediente.id);
    return { ingrediente: structuredClone(ingrediente), puntuacion: Math.round(puntuacion * 1000) / 1000,
      motivos: { afinidad: afinidad?.fuente ?? 'sin_evidencia', puntuacionAfinidad: afinidad?.puntuacion ?? 1, comidasRealizadasRecientes: reciente?.comidasRealizadas ?? 0, comidasPlanificadasRecientes: reciente?.comidasPlanificadas ?? 0, aparicionesCanasta, priorizado: prioridad > 0 } };
  }).sort((a, b) => b.puntuacion - a.puntuacion || a.ingrediente.id.localeCompare(b.ingrediente.id));
  return { candidatos: ordenados.slice(0, criterios.cantidad), disponibles: ordenados.length, solicitados: criterios.cantidad,
    faltan: Math.max(0, criterios.cantidad - ordenados.length), semilla: criterios.semilla, intervaloUso: { desde: uso.desde, hasta: uso.hasta },
    advertencia: 'Son candidatos del catálogo, no existencias confirmadas ni una receta. La afinidad es una heurística de uso.' };
}

export function calcularNutrientes(catalogo: Ingredient[], entradas: CalculatorEntry[], porciones = 1) {
  exigir(Array.isArray(entradas) && entradas.length >= 1 && entradas.length <= 100, 'Indicá entre 1 y 100 ingredientes con cantidades en gramos.');
  exigir(Number.isFinite(porciones) && porciones > 0 && porciones <= 1000, 'La cantidad de porciones debe ser positiva y no superar 1000.');
  const porId = new Map(catalogo.map((ingrediente) => [ingrediente.id, ingrediente]));
  const gramos = new Map<string, number>();
  for (const entrada of entradas) {
    exigir(entrada && typeof entrada.ingredientId === 'string' && porId.has(entrada.ingredientId), 'Hay un ingrediente que no está en el catálogo. Buscalo antes de calcular.');
    exigir(Number.isFinite(entrada.grams) && entrada.grams >= 0 && entrada.grams <= 100000, 'Las cantidades deben ser gramos finitos entre 0 y 100000.');
    const ingrediente = porId.get(entrada.ingredientId)!;
    exigir([ingrediente.calories, ingrediente.protein, ingrediente.carbs, ingrediente.fat].every((valor) => typeof valor === 'number' && Number.isFinite(valor) && valor >= 0), 'El ingrediente tiene información nutricional incompleta o inválida.');
    gramos.set(entrada.ingredientId, (gramos.get(entrada.ingredientId) ?? 0) + entrada.grams);
  }
  const agrupadas = [...gramos].map(([ingredientId, grams]) => ({ ingredientId, grams }));
  const total = computeTotalMacros(agrupadas, catalogo);
  const porPorcion = Object.fromEntries(Object.entries(total).map(([key, value]) => [key, Math.round(value / porciones * 10) / 10]));
  exigir([...Object.values(total), ...Object.values(porPorcion)].every(Number.isFinite), 'Las cantidades o los valores nutricionales producen un resultado fuera de rango.');
  return { total, porPorcion, porciones,
    ingredientes: agrupadas.map((entrada) => ({ ...entrada, nombre: porId.get(entrada.ingredientId)!.name, nutrientes: computeMacrosForEntry(porId.get(entrada.ingredientId)!, entrada.grams) })),
    base: 'Valores del catálogo por 100 g; respetar el estado crudo/cocido indicado en cada nombre. No estima ingredientes desconocidos.' };
}
