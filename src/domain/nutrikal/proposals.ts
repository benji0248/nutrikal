import type { CalculatorEntry, Ingredient, MealType } from '../../types/index.js';
import { MEAL_TYPE_ORDER } from '../../types/index.js';
import { filterIngredientsForUser } from '../../services/ingredientFilter.js';
import { computeMetabolism } from '../../services/metabolicService.js';
import { getActiveMealSlots, getMealSlotBudgetForPattern } from '../../services/portionEngine.js';
import { getFlexModeForDate, normalizeWeekPlanningProfile } from '../../utils/flexDayHelpers.js';
import type { ContextoUsuario } from './types.js';
import { calcularNutrientes } from './functions.js';
import { exigir, fechaValida, normalizarNombre } from './validation.js';

export interface PlatoPropuesto {
  clave: string;
  nombre: string;
  /** Quantities for the entire recipe, not for each serving. */
  ingredientes: CalculatorEntry[];
  porciones: number;
  preparacion?: string;
  tiempoMinutos?: number;
}
export interface Propuesta {
  titulo: string;
  platos: PlatoPropuesto[];
  /** Each assignment is ONE serving for the authenticated person. Empty means recipe only. */
  asignaciones: Array<{ platoClave: string; fecha: string; tipo: MealType }>;
}
export interface IncidenciaPropuesta { nivel: 'error' | 'aviso'; codigo: string; ruta: string; mensaje: string }
export interface ValidacionPropuesta {
  valida: boolean;
  incidencias: IncidenciaPropuesta[];
  platos: Array<{ clave: string; nutrientes: ReturnType<typeof calcularNutrientes> }>;
}
export interface PropuestaGuardada { id: string; contenido: Propuesta; validacion: ValidacionPropuesta; creadaEn: string }

/** Only a unique exact catalogue name resolves automatically. Partial matches remain candidates. */
export function resolverIngrediente(catalogo: Ingredient[], nombre: string) {
  exigir(typeof nombre === 'string' && nombre.trim().length > 0 && nombre.length <= 150, 'Indicá un nombre de ingrediente de hasta 150 caracteres.');
  const texto = normalizarNombre(nombre);
  const alias: Record<string, string> = { aguacate: 'palta', fresa: 'frutilla', fresas: 'frutilla', pimiento: 'morron', judias: 'porotos', cacahuete: 'mani', cacahuetes: 'mani' };
  const sinonimo = texto.split(' ').map((p) => alias[p] ?? p).join(' ');
  const exactos = catalogo.filter((i) => normalizarNombre(i.name) === texto || i.id === nombre);
  const palabras = texto.split(' ').filter(Boolean);
  const parciales = catalogo.filter((i) => palabras.every((p) => normalizarNombre(i.name).includes(p)) || (sinonimo !== texto && sinonimo.split(' ').every((p) => normalizarNombre(i.name).includes(p))));
  const candidatos = exactos.length ? exactos : parciales;
  return { estado: exactos.length === 1 ? 'resuelto' : candidatos.length ? 'requiere_eleccion' : 'sin_coincidencias',
    ingredienteId: exactos.length === 1 ? exactos[0].id : null, candidatos: candidatos.slice(0, 20), totalCandidatos: candidatos.length,
    aliasConsultado: sinonimo !== texto ? sinonimo : null,
    criterio: 'Nombre exacto normalizado o ID. Alias regionales y coincidencias parciales solo proponen candidatos; comprobar estado crudo/cocido y variedad.' };
}

export function obtenerPresupuestoComida(contexto: ContextoUsuario, fecha: string, tipo: MealType) {
  exigir(fechaValida(fecha) && MEAL_TYPE_ORDER.includes(tipo), 'Indicá una fecha y un horario válidos.');
  const rutina = contexto.rutina ? normalizeWeekPlanningProfile(contexto.rutina) : null;
  const modo = rutina ? getFlexModeForDate(fecha, rutina.weekdayFlexRules) : null;
  const activo = rutina ? getActiveMealSlots(rutina.mealPattern).includes(tipo) : null;
  const metabolismo = contexto.perfilMetabolico ? computeMetabolism(contexto.perfilMetabolico) : null;
  const diario = metabolismo && modo && modo !== 'full_free' ? (modo === 'maintenance' ? metabolismo.tdee : metabolismo.budget) : null;
  return { fecha, tipo, modo, horarioActivo: activo, presupuestoDiarioKcal: diario,
    presupuestoComidaKcal: diario !== null && rutina && activo ? getMealSlotBudgetForPattern(diario, tipo, rutina.mealPattern) : null,
    motivo: !rutina || !metabolismo ? 'Falta perfil o rutina; no se inventó un presupuesto.' : modo === 'full_free' ? 'Día libre sin presupuesto de menú.' : !activo ? 'Horario fuera de tu rutina guardada.' : 'Objetivo de Nutrikal para esa fecha y horario; no es el saldo de calorías consumidas.' };
}

export interface AjusteCantidades {
  ingredientes: CalculatorEntry[];
  porcionesActuales: number;
  porcionesDeseadas?: number;
  /** Target per serving. Mutually exclusive with porcionesDeseadas. */
  objetivoKcal?: number;
  limites?: Array<{ ingredientId: string; minimoGramos: number; maximoGramos: number }>;
}
export function ajustarCantidades(catalogo: Ingredient[], ajuste: AjusteCantidades) {
  exigir(ajuste && typeof ajuste === 'object', 'Indicá las cantidades a ajustar.');
  const base = calcularNutrientes(catalogo, ajuste.ingredientes, ajuste.porcionesActuales);
  exigir((ajuste.porcionesDeseadas === undefined) !== (ajuste.objetivoKcal === undefined), 'Elegí ajustar por porciones o por calorías por porción.');
  if (ajuste.porcionesDeseadas !== undefined) exigir(Number.isFinite(ajuste.porcionesDeseadas) && ajuste.porcionesDeseadas > 0 && ajuste.porcionesDeseadas <= 1000, 'Cantidad de porciones inválida.');
  if (ajuste.objetivoKcal !== undefined) exigir(Number.isFinite(ajuste.objetivoKcal) && ajuste.objetivoKcal > 0 && ajuste.objetivoKcal <= 10000 && base.total.calories > 0, 'Objetivo calórico inválido o receta sin calorías.');
  const porciones = ajuste.porcionesDeseadas ?? ajuste.porcionesActuales;
  const factor = ajuste.porcionesDeseadas !== undefined ? porciones / ajuste.porcionesActuales : ajuste.objetivoKcal! * porciones / base.total.calories;
  exigir(factor >= 0.05 && factor <= 20, 'El ajuste excede el factor permitido (0,05–20). Revisá las cantidades iniciales.');
  const limites = ajuste.limites ?? [];
  exigir(Array.isArray(limites) && limites.length <= 100 && new Set(limites.map((l) => l.ingredientId)).size === limites.length, 'Límites inválidos o duplicados.');
  for (const l of limites) exigir(base.ingredientes.some((i) => i.ingredientId === l.ingredientId) && Number.isFinite(l.minimoGramos) && Number.isFinite(l.maximoGramos) && l.minimoGramos >= 0 && l.maximoGramos >= l.minimoGramos && l.maximoGramos <= 100000, 'Límites de gramos inválidos.');
  const limitados: string[] = [];
  const ingredientes = base.ingredientes.map((i) => {
    const l = limites.find((l) => l.ingredientId === i.ingredientId);
    const escalados = Math.round(i.grams * factor * 10) / 10;
    const grams = l ? Math.min(l.maximoGramos, Math.max(l.minimoGramos, escalados)) : escalados;
    if (grams !== escalados) limitados.push(i.ingredientId);
    return { ingredientId: i.ingredientId, grams };
  });
  const nutrientes = calcularNutrientes(catalogo, ingredientes, porciones);
  return { ingredientes, porciones, factor, limitados, nutrientes,
    diferenciaObjetivoKcal: ajuste.objetivoKcal === undefined ? null : Math.round((Number(nutrientes.porPorcion.calories) - ajuste.objetivoKcal) * 10) / 10,
    criterio: 'Escalado proporcional con límites explícitos. No optimiza macros ni garantiza sabor, textura, cocción o disponibilidad.' };
}

/** Accept unknown input at the boundary; validation reports structured errors instead of trusting model JSON. */
export function validarPropuesta(catalogo: Ingredient[], contexto: ContextoUsuario, raw: unknown, hoy: string): ValidacionPropuesta {
  const incidencias: IncidenciaPropuesta[] = [];
  const platos: ValidacionPropuesta['platos'] = [];
  const issue = (nivel: IncidenciaPropuesta['nivel'], codigo: string, ruta: string, mensaje: string) => incidencias.push({ nivel, codigo, ruta, mensaje });
  const object = (x: unknown): x is Record<string, unknown> => x !== null && typeof x === 'object' && !Array.isArray(x);
  const text = (x: unknown, max: number) => typeof x === 'string' && x.trim().length > 0 && x.length <= max;
  if (!object(raw) || !text(raw.titulo, 120) || !Array.isArray(raw.platos) || raw.platos.length < 1 || raw.platos.length > 31 || !Array.isArray(raw.asignaciones) || raw.asignaciones.length > 124) {
    issue('error', 'estructura', '', 'Indicá título, entre 1 y 31 platos y hasta 124 asignaciones (pueden estar vacías).');
    return { valida: false, incidencias, platos };
  }
  if (Object.keys(raw).some((k) => !['titulo', 'platos', 'asignaciones'].includes(k))) issue('error', 'campos', '', 'La propuesta contiene campos no admitidos.');
  if (!contexto.preferencias) issue('error', 'perfil_requerido', '', 'Completá tus preferencias antes de guardar una propuesta.');
  const permitidos = new Set(contexto.preferencias ? filterIngredientsForUser(catalogo, contexto.preferencias).map((i) => i.id) : []);
  const claves = new Set<string>();
  raw.platos.forEach((p: unknown, n: number) => {
    const ruta = `platos.${n}`;
    if (!object(p) || !text(p.clave, 60) || !text(p.nombre, 150) || !Array.isArray(p.ingredientes) || !Number.isFinite(p.porciones) || Number(p.porciones) <= 0 || Number(p.porciones) > 1000) { issue('error', 'plato_invalido', ruta, 'El plato requiere clave, nombre, ingredientes y porciones positivas.'); return; }
    if (Object.keys(p).some((k) => !['clave', 'nombre', 'ingredientes', 'porciones', 'preparacion', 'tiempoMinutos'].includes(k))) issue('error', 'campos', ruta, 'El plato contiene campos no admitidos.');
    if (claves.has(String(p.clave))) issue('error', 'clave_duplicada', ruta, 'Cada plato debe tener una clave única.');
    claves.add(String(p.clave));
    if (p.preparacion !== undefined && !text(p.preparacion, 6000)) issue('error', 'preparacion', ruta, 'La preparación admite hasta 6000 caracteres.');
    if (p.tiempoMinutos !== undefined && (!Number.isInteger(p.tiempoMinutos) || Number(p.tiempoMinutos) < 0 || Number(p.tiempoMinutos) > 1440)) issue('error', 'tiempo', ruta, 'Tiempo de preparación inválido.');
    try {
      const entradas = p.ingredientes as CalculatorEntry[];
      for (const i of entradas) {
        exigir(object(i) && Object.keys(i).every((k) => ['ingredientId', 'grams'].includes(k)) && i.grams > 0, 'Cada ingrediente requiere un ID real y gramos mayores a cero.');
        if (!permitidos.has(i.ingredientId)) issue('error', 'ingrediente_no_permitido', ruta, `El ingrediente ${i.ingredientId} no existe o está excluido por tus preferencias o restricciones.`);
      }
      const nutrientes = calcularNutrientes(catalogo, entradas, Number(p.porciones));
      if (nutrientes.total.calories <= 0) issue('error', 'sin_energia', ruta, 'El plato no tiene aporte energético calculable.');
      platos.push({ clave: String(p.clave), nutrientes });
      if (!p.preparacion) issue('aviso', 'sin_preparacion', ruta, 'El plato no incluye instrucciones de preparación.');
    } catch (e) { issue('error', 'cantidades', ruta, e instanceof Error ? e.message : 'Cantidades inválidas.'); }
  });
  const horarios = new Set<string>();
  const fechas: string[] = [];
  raw.asignaciones.forEach((a: unknown, n: number) => {
    const ruta = `asignaciones.${n}`;
    if (!object(a) || Object.keys(a).some((k) => !['platoClave', 'fecha', 'tipo'].includes(k)) || !claves.has(String(a.platoClave)) || !fechaValida(a.fecha) || !MEAL_TYPE_ORDER.includes(a.tipo as MealType)) { issue('error', 'asignacion', ruta, 'La asignación requiere un plato existente, fecha válida y horario.'); return; }
    const key = `${a.fecha}:${a.tipo}`;
    if (horarios.has(key)) issue('error', 'horario_duplicado', ruta, 'Incluí solo una opción por horario en una propuesta. Las alternativas se eligen al aplicar.');
    horarios.add(key); fechas.push(String(a.fecha));
    if (String(a.fecha) < hoy) issue('error', 'fecha_pasada', ruta, 'No se puede agregar una propuesta en fechas pasadas.');
    const presupuesto = obtenerPresupuestoComida(contexto, String(a.fecha), a.tipo as MealType);
    if (presupuesto.modo === 'full_free' || presupuesto.horarioActivo === false) issue('aviso', 'fuera_rutina', ruta, presupuesto.motivo);
    const kcal = platos.find((p) => p.clave === a.platoClave)?.nutrientes.porPorcion.calories;
    if (presupuesto.presupuestoComidaKcal && kcal && Math.abs(Number(kcal) / presupuesto.presupuestoComidaKcal - 1) > 0.2) issue('aviso', 'presupuesto', ruta, 'Las calorías por porción difieren más del 20% del objetivo del horario.');
  });
  if (!contexto.perfilMetabolico || !contexto.rutina) issue('aviso', 'sin_presupuesto', '', 'Falta perfil o rutina para comparar contra objetivos personalizados.');
  if (fechas.length && (Date.parse(fechas.sort().at(-1)!) - Date.parse(fechas[0])) / 86400000 > 30) issue('error', 'intervalo', 'asignaciones', 'La propuesta debe abarcar como máximo 31 días.');
  return { valida: !incidencias.some((i) => i.nivel === 'error'), incidencias, platos };
}
