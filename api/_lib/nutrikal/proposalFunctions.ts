import { createHash, randomUUID } from 'node:crypto';
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { getSupabase } from '../supabase.js';
import { readSnapshot, toClient, toDatabase, undoChanges, version, type Snapshot } from '../calendarPlanning.js';
import { changeCalendarPlan } from '../../../src/services/calendarPlanService.js';
import type { CalendarOperationResult } from '../../../src/services/calendarPlanTypes.js';
import type { WeekPlan, CalculatorEntry } from '../../../src/types/index.js';
import { INGREDIENTS_DB } from '../../../src/data/ingredients.js';
import { crearFuncionesNutrikal } from '../../../src/domain/nutrikal/createFunctions.js';
import { ErrorFuncionesNutrikal, exigir, fechaValida } from '../../../src/domain/nutrikal/validation.js';
import type { Propuesta, PropuestaGuardada, ValidacionPropuesta } from '../../../src/domain/nutrikal/proposals.js';
import type { CambioPropuesto, FuncionesPropuestas, PrevisualizacionPropuesta } from '../../../src/domain/nutrikal/proposalOperations.js';
import { crearRepositorioSupabase } from './repository.js';

const uuid = (s: unknown): s is string => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
const fail = (message: string): never => { throw new ErrorFuncionesNutrikal('conflicto', message); };
const dbCheck = (error: unknown) => { if (error) throw new Error('proposal_storage_error'); };
const resumenVacio = () => ({ added: 0, replaced: 0, preserved: 0, alternatives: 0, protected: 0 });
function guardada(row: Record<string, unknown>): PropuestaGuardada {
  return { id: String(row.id), contenido: row.content as Propuesta, validacion: row.validation as ValidacionPropuesta, creadaEn: String(row.created_at) };
}

/** Request-scoped, authenticated application service. No HTTP, Gemini or chat dependency. */
export function crearFuncionesPropuestas(usuarioId: string, hoy: string): FuncionesPropuestas {
  exigir(typeof usuarioId === 'string' && usuarioId.length > 0 && fechaValida(hoy), 'Falta usuario o fecha de referencia.');
  const db = getSupabase();
  const repositorio = crearRepositorioSupabase(db);
  // Fresh instance on each command also re-reads profile and catalogue at confirmation time.
  const funciones = () => crearFuncionesNutrikal({ usuarioId, fechaReferencia: hoy, catalogoBase: INGREDIENTS_DB, repositorio });
  async function validar(contenido: Propuesta) {
    const f = funciones();
    const validacion = await f.validarPropuesta(contenido);
    if (!validacion.valida) throw new ErrorFuncionesNutrikal('propuesta_invalida', validacion.incidencias.filter((i) => i.nivel === 'error').map((i) => i.mensaje).slice(0, 5).join(' '));
    const [preferencias, rutina, objetivo] = await Promise.all([f.obtenerPreferencias(), f.obtenerRutina(), f.obtenerObjetivo()]);
    const hash = createHash('sha256').update(JSON.stringify({ preferencias, rutina, objetivo, nutrientes: validacion.platos })).digest('hex');
    return { validacion, hash };
  }
  async function leerPropuesta(id: string) {
    exigir(uuid(id), 'Propuesta inválida.');
    const result = await db.from('nutrikal_proposals').select('*').eq('user_id', usuarioId).eq('id', id).maybeSingle();
    dbCheck(result.error);
    exigir(result.data, 'No encontré esa propuesta.');
    return guardada(result.data);
  }
  async function commit(antes: Snapshot, despues: Snapshot, id: string, resumen: CalendarOperationResult['summary'], undo: string | null = null): Promise<CalendarOperationResult> {
    const result = await db.rpc('commit_calendar_operation', { p_user_id: usuarioId, p_before: antes, p_after: despues, p_operation_id: id, p_undo_of: undo });
    if (result.error?.code === '40001') fail('El calendario cambió. Volvé a revisar antes de confirmar.');
    dbCheck(result.error);
    return { ...toClient(result.data as Snapshot), operationId: id, summary: resumen };
  }
  async function aplicada(id: string) {
    const result = await db.from('calendar_operations').select('id').eq('user_id', usuarioId).eq('id', id).maybeSingle();
    dbCheck(result.error);
    return Boolean(result.data);
  }
  return {
    leerPropuesta,
    async guardarPropuesta(raw, requestId) {
      exigir(typeof requestId === 'string' && requestId.length > 0 && requestId.length <= 150, 'Identificador de guardado inválido.');
      const existing = await db.from('nutrikal_proposals').select('*').eq('user_id', usuarioId).eq('request_id', requestId).maybeSingle();
      dbCheck(existing.error);
      if (existing.data) return guardada(existing.data);
      const validacion = await funciones().validarPropuesta(raw);
      if (!validacion.valida) throw new ErrorFuncionesNutrikal('propuesta_invalida', validacion.incidencias.filter((i) => i.nivel === 'error').map((i) => `${i.ruta}: ${i.mensaje}`).slice(0, 8).join(' '));
      const saved = await db.from('nutrikal_proposals').insert({ user_id: usuarioId, request_id: requestId, content: raw, validation: validacion }).select('*').single();
      if (saved.error?.code === '23505') {
        const raced = await db.from('nutrikal_proposals').select('*').eq('user_id', usuarioId).eq('request_id', requestId).single();
        dbCheck(raced.error); return guardada(raced.data!);
      }
      dbCheck(saved.error);
      return guardada(saved.data!);
    },
    async previsualizarCambios(consulta) {
      exigir(consulta && ['fill', 'replace', 'alternatives'].includes(consulta.politica), 'Elegí cómo resolver superposiciones.');
      const saved = await leerPropuesta(consulta.propuestaId);
      const propuesta = structuredClone(saved.contenido);
      exigir(propuesta.asignaciones.length > 0, 'Este borrador es una receta sin fechas. Pedí al asistente que la organice en el calendario.');
      const original = propuesta.asignaciones.map((a) => a.fecha).sort()[0];
      if (consulta.inicio !== undefined) {
        exigir(fechaValida(consulta.inicio), 'Fecha de inicio inválida.');
        const offset = differenceInCalendarDays(parseISO(consulta.inicio), parseISO(original));
        propuesta.asignaciones.forEach((a) => { a.fecha = format(addDays(parseISO(a.fecha), offset), 'yyyy-MM-dd'); });
      }
      const { validacion, hash } = await validar(propuesta);
      const before = await readSnapshot(usuarioId);
      const client = toClient(before);
      const id = randomUUID();
      const planId = `proposal-${saved.id}`;
      const days: WeekPlan['days'] = [];
      const entries: Record<string, CalculatorEntry[]> = {};
      for (const a of [...propuesta.asignaciones].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
        const plato = propuesta.platos.find((p) => p.clave === a.platoClave)!;
        const nutrientes = validacion.platos.find((p) => p.clave === plato.clave)!.nutrientes;
        let day = days.find((d) => d.date === a.fecha);
        if (!day) { day = { date: a.fecha, meals: {} }; days.push(day); }
        entries[`${a.fecha}:${a.tipo}`] = nutrientes.ingredientes.map((i) => ({ ingredientId: i.ingredientId, grams: i.grams / plato.porciones }));
        day.meals[a.tipo] = { name: plato.nombre, totalKcal: Number(nutrientes.porPorcion.calories),
          ingredients: nutrientes.ingredientes.map((i) => ({ name: i.nombre, grams: i.grams / plato.porciones, kcal: i.nutrientes.calories / plato.porciones })),
          preparation: plato.preparacion, prepMinutes: plato.tiempoMinutos, humanPortion: '1 porción' };
      }
      const custom = await repositorio.leerIngredientesPropios(usuarioId);
      let changed: ReturnType<typeof changeCalendarPlan>;
      try {
        changed = changeCalendarPlan(client, { kind: 'applyMeals', plan: { days, applied: false }, planId, title: propuesta.titulo, policy: consulta.politica, entries },
          { today: hoy, now: new Date().toISOString(), operationId: id, ingredients: [...INGREDIENTS_DB, ...custom] });
      } catch (e) { throw new ErrorFuncionesNutrikal('sin_cambios', e instanceof Error ? e.message : 'No hay cambios disponibles.'); }
      const after = toDatabase(changed.state, before);
      const cambios: CambioPropuesto[] = propuesta.asignaciones.map((a) => {
        const select = (state: typeof client) => state.meals.filter((m) => m.date === a.fecha && m.mealType === a.tipo);
        const old = select(client), next = select({ ...client, ...changed.state });
        const active = old.filter((m) => !m.isAlternative);
        return { fecha: a.fecha, tipo: a.tipo, antes: active.map((m) => m.name), despues: next.filter((m) => !m.isAlternative).map((m) => m.name),
          alternativasAntes: old.filter((m) => m.isAlternative).map((m) => m.name), alternativasDespues: next.filter((m) => m.isAlternative).map((m) => m.name),
          accion: a.fecha < hoy || active.some((m) => m.completed) ? 'protegido' : active.length ? consulta.politica === 'fill' ? 'conservar' : consulta.politica === 'replace' ? 'reemplazar' : 'alternativa' : 'agregar' };
      });
      const listIds = new Set([...client.shoppingLists, ...changed.state.shoppingLists].map((l) => l.id));
      const compras = [...listIds].flatMap((listId) => {
        const old = client.shoppingLists.find((l) => l.id === listId), next = changed.state.shoppingLists.find((l) => l.id === listId);
        const items = (l: typeof old) => l?.items.map((i) => `${i.name}: ${i.quantity}`) ?? [];
        return JSON.stringify(items(old)) === JSON.stringify(items(next)) ? [] : [{ lista: next?.name ?? old!.name, antes: items(old), despues: items(next) }];
      });
      const review: PrevisualizacionPropuesta = { id, propuestaId: saved.id, versionCalendario: client.version, politica: consulta.politica,
        venceEn: new Date(Date.now() + 30 * 60_000).toISOString(), resumen: changed.summary, cambios, validacion, compras };
      const stored = await db.from('nutrikal_previews').insert({ id, user_id: usuarioId, proposal_id: saved.id, proposal: propuesta, context_hash: hash, before_state: before, after_state: after, review, expires_at: review.venceEn });
      dbCheck(stored.error);
      return review;
    },
    async aplicarCambios(id) {
      exigir(uuid(id), 'Previsualización inválida.');
      const saved = await db.from('nutrikal_previews').select('*').eq('user_id', usuarioId).eq('id', id).maybeSingle();
      dbCheck(saved.error); exigir(saved.data, 'No encontré esa previsualización.');
      const row = saved.data;
      const review = row.review as PrevisualizacionPropuesta;
      if (await aplicada(id)) return { ...toClient(await readSnapshot(usuarioId)), operationId: id, summary: review.resumen };
      if (Date.parse(row.expires_at) <= Date.now()) fail('La revisión venció. Volvé a previsualizar las fechas y comidas.');
      const { hash } = await validar(row.proposal as Propuesta);
      if (hash !== row.context_hash) fail('Tus preferencias, objetivos o ingredientes cambiaron. Volvé a revisar la propuesta.');
      return commit(row.before_state as Snapshot, row.after_state as Snapshot, id, review.resumen);
    },
    async deshacerOperacion(operacionId, versionCalendario, requestId) {
      exigir(uuid(operacionId) && uuid(requestId), 'Operación inválida.');
      if (await aplicada(requestId)) return { ...toClient(await readSnapshot(usuarioId)), operationId: requestId, summary: resumenVacio() };
      const before = await readSnapshot(usuarioId);
      if (versionCalendario !== version(before)) fail('El calendario cambió. Actualizalo antes de deshacer.');
      const history = await db.from('calendar_operations').select('before_state,after_state,undone_by').eq('user_id', usuarioId).eq('id', operacionId).maybeSingle();
      dbCheck(history.error);
      exigir(history.data, 'El cambio no está disponible.');
      if (history.data.undone_by) fail('El cambio ya fue deshecho.');
      const original = history.data.before_state as Snapshot, after = history.data.after_state as Snapshot;
      // Undo cannot remove consumed meals or alter history. undoChanges also protects subsequent edits.
      const changedIds = new Set([...original.meals, ...after.meals].filter((m) => JSON.stringify(original.meals.find((x) => x.id === m.id)) !== JSON.stringify(after.meals.find((x) => x.id === m.id))).map((m) => m.id));
      if ([...original.meals, ...after.meals, ...before.meals].some((m) => changedIds.has(m.id) && (m.completed || String(m.date) < hoy))) fail('El cambio incluye fechas pasadas o comidas realizadas y no puede deshacerse automáticamente.');
      let restored: Snapshot;
      try { restored = undoChanges(before, original, after); } catch (e) { fail(e instanceof Error ? e.message : 'Hay cambios posteriores.'); }
      return commit(before, restored!, requestId, resumenVacio(), operacionId);
    },
  };
}
