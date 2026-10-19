import { useRef, useState } from 'react';
import { format } from 'date-fns';
import type { PropuestaGuardada } from '../../domain/nutrikal/proposals.js';
import type { PrevisualizacionPropuesta } from '../../domain/nutrikal/proposalOperations.js';
import type { OverlapPolicy } from '../../services/calendarPlanTypes.js';
import { previewAssistantProposal, applyAssistantPreview, undoAssistantOperation } from '../../services/assistantBetaService.js';
import { useCalendarPlanStore } from '../../store/useCalendarPlanStore.js';
import { useAuthStore } from '../../store/useAuthStore.js';

const button = 'min-h-11 rounded-xl bg-[#226046] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50';
const acciones = { agregar: 'Se agrega', reemplazar: 'Se reemplaza', alternativa: 'Se agrega como alternativa', conservar: 'Se conserva lo actual', protegido: 'Se conserva: comida realizada o fecha pasada' };

export function ProposalCard({ propuesta, onAdjust }: { propuesta: PropuestaGuardada; onAdjust: (text: string) => void }) {
  const { contenido, validacion } = propuesta;
  const inicial = contenido.asignaciones.map((a) => a.fecha).sort()[0] ?? '';
  const [inicio, setInicio] = useState(inicial);
  const [politica, setPolitica] = useState<OverlapPolicy>('fill');
  const [review, setReview] = useState<PrevisualizacionPropuesta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const undoAttempt = useRef<{ operation: string; id: string } | null>(null);
  const snapshot = useCalendarPlanStore((s) => s.snapshot);
  const calendarBusy = useCalendarPlanStore((s) => s.busy);
  const planId = `proposal-${propuesta.id}`;
  const applied = Boolean(snapshot?.plans.some((p) => p.id === planId));
  const appliedOperation = snapshot?.meals.find((m) => m.planId === planId)?.id.split(':')[0];

  async function run(action: () => Promise<void>) {
    if (busy || useCalendarPlanStore.getState().busy) return;
    setBusy(true); setError(null); setFeedback(null);
    useCalendarPlanStore.setState({ busy: true });
    try { await action(); }
    catch (e) { setError(e instanceof Error ? e.message : 'No pude completar la operación.'); }
    finally { setBusy(false); useCalendarPlanStore.setState({ busy: false }); }
  }
  const preview = () => run(async () => { setReview(null); setReview(await previewAssistantProposal({ propuestaId: propuesta.id, politica, inicio })); });
  const apply = () => run(async () => {
    if (!review) return;
    const userId = useAuthStore.getState().user?.id;
    const result = await applyAssistantPreview(review.id);
    if (userId !== useAuthStore.getState().user?.id) return;
    useCalendarPlanStore.getState().acceptResult(result, contenido.titulo);
    setReview(null); setFeedback('Agregado al calendario. Podés deshacer este cambio.');
  });
  const undo = () => run(async () => {
    if (!appliedOperation) return;
    const userId = useAuthStore.getState().user?.id;
    const current = await useCalendarPlanStore.getState().refresh();
    if (undoAttempt.current?.operation !== appliedOperation) undoAttempt.current = { operation: appliedOperation, id: crypto.randomUUID() };
    const result = await undoAssistantOperation(appliedOperation, current.version, undoAttempt.current.id);
    if (userId !== useAuthStore.getState().user?.id) return;
    useCalendarPlanStore.getState().acceptResult(result, contenido.titulo, true);
    setReview(null); setFeedback('Cambio deshecho. El borrador sigue guardado.');
  });
  const disabled = busy || calendarBusy;
  return <article className="mt-4 rounded-2xl border border-[#c1c9bb] bg-white p-4 sm:p-6" aria-label={contenido.titulo}>
    <div className="mb-3 flex flex-wrap justify-between gap-2"><h3 className="font-semibold">{contenido.titulo}</h3><span className="rounded-full bg-[#e8ebe3] px-3 py-1 text-xs">{applied ? 'En tu calendario' : 'Borrador'}</span></div>
    <div className="space-y-3">{contenido.platos.map((plato) => {
      const calculo = validacion.platos.find((p) => p.clave === plato.clave)?.nutrientes;
      return <details key={plato.clave} className="rounded-xl border border-[#e1e5dc] p-3">
        <summary className="cursor-pointer text-sm font-semibold">{plato.nombre} · {calculo?.porPorcion.calories ?? '—'} kcal por porción</summary>
        <p className="mt-2 text-xs">Receta para {plato.porciones} porciones{plato.tiempoMinutos !== undefined ? ` · ${plato.tiempoMinutos} min` : ''}. Cada comida del calendario usa una porción.</p>
        <ul className="my-2 text-sm">{calculo?.ingredientes.map((i) => <li key={i.ingredientId}>{i.nombre}: {i.grams} g en total · {Math.round(i.grams / plato.porciones * 10) / 10} g por porción</li>)}</ul>
        {calculo && <p className="text-xs">Por porción: proteínas {calculo.porPorcion.protein} g · carbohidratos {calculo.porPorcion.carbs} g · grasas {calculo.porPorcion.fat} g</p>}
        {plato.preparacion && <p className="mt-2 whitespace-pre-wrap text-sm">{plato.preparacion}</p>}
      </details>;
    })}</div>
    {contenido.asignaciones.length > 0 ? <details className="mt-3 text-sm"><summary className="cursor-pointer">Ver {contenido.asignaciones.length} comidas y sus fechas</summary><ul className="mt-2 space-y-1">{contenido.asignaciones.map((a) => <li key={`${a.fecha}:${a.tipo}`}>{a.fecha} · {a.tipo}: {contenido.platos.find((p) => p.clave === a.platoClave)?.nombre}</li>)}</ul></details> : <p className="mt-3 text-sm">Receta guardada sin fechas. Podés pedirme que la agregue a una propuesta con días y horarios.</p>}
    {validacion.incidencias.some((i) => i.nivel === 'aviso') && <details className="mt-3 rounded-xl bg-amber-50 p-3 text-sm"><summary className="cursor-pointer">Observaciones para revisar</summary><ul className="mt-2 space-y-1">{validacion.incidencias.filter((i) => i.nivel === 'aviso').map((i, n) => <li key={n}>{i.mensaje}{i.ruta ? ` (${i.ruta})` : ''}</li>)}</ul></details>}
    <button type="button" disabled={disabled} onClick={() => onAdjust(`Quiero ajustar la propuesta ${propuesta.id}: `)} className="mt-3 min-h-11 text-sm underline disabled:opacity-50">Pedir un ajuste</button>
    {!applied && contenido.asignaciones.length > 0 && <div className="mt-4 space-y-3 border-t border-[#e1e5dc] pt-4">
      <label className="block text-sm">Empezar el<input type="date" value={inicio} min={format(new Date(), 'yyyy-MM-dd')} disabled={disabled} onChange={(e) => { setInicio(e.target.value); setReview(null); }} className="mt-1 block min-h-11 w-full rounded-xl border-[#c1c9bb]" /></label>
      <label className="block text-sm">Si ya hay una comida<select value={politica} disabled={disabled} onChange={(e) => { setPolitica(e.target.value as OverlapPolicy); setReview(null); }} className="mt-1 block min-h-11 w-full rounded-xl border-[#c1c9bb]">
        <option value="fill">Conservar y completar solo huecos</option><option value="replace">Reemplazar las comidas coincidentes</option><option value="alternatives">Guardar como otra opción</option>
      </select></label>
      <p className="text-xs text-[#40493d]">Se desplazan todas las fechas juntas. Las comidas realizadas se conservan. Las alternativas se cuentan cuando las elegís.</p>
      <button type="button" disabled={disabled || !inicio} onClick={() => void preview()} className={button}>Revisar cambios</button>
    </div>}
    {review && !applied && <div className="mt-4 space-y-3 rounded-xl bg-[#f3f5eb] p-4">
      <h4 className="font-semibold">Esto es lo que va a cambiar</h4>
      <p className="text-sm">{review.resumen.added} horarios nuevos · {review.resumen.replaced} reemplazos · {review.resumen.alternatives} alternativas · {review.resumen.preserved} conservados · {review.resumen.protected} protegidos.</p>
      <ul className="space-y-3 text-sm">{review.cambios.map((c) => <li key={`${c.fecha}:${c.tipo}`}><strong>{c.fecha} · {c.tipo}: {acciones[c.accion]}</strong><p>Antes: {c.antes.join(' + ') || 'Sin comida'}</p><p>Después: {c.despues.join(' + ') || 'Sin comida'}</p>{c.alternativasDespues.length > 0 && <p>Otras opciones: {c.alternativasDespues.join(' / ')}</p>}</li>)}</ul>
      {review.validacion.incidencias.length > 0 && <ul className="space-y-1 text-sm text-amber-900">{review.validacion.incidencias.map((i, n) => <li key={n}>{i.mensaje}</li>)}</ul>}
      {review.compras.length > 0 && <details className="text-sm"><summary className="cursor-pointer">Cambios en compras</summary>{review.compras.map((l) => <div key={l.lista} className="mt-2"><strong>{l.lista}</strong><p>Antes: {l.antes.join(', ') || 'Sin lista'}</p><p>Después: {l.despues.join(', ') || 'Sin pendientes'}</p></div>)}</details>}
      <p className="text-xs">La revisión vence en 30 minutos. Las compras no descuentan lo que tenés en casa.</p>
      <button type="button" disabled={disabled} onClick={() => void apply()} className={button}>Confirmar y agregar al calendario</button>
      <button type="button" disabled={disabled} onClick={() => setReview(null)} className="ml-3 min-h-11 text-sm underline">Cancelar</button>
    </div>}
    {applied && appliedOperation && <button type="button" disabled={disabled} onClick={() => void undo()} className="mt-4 min-h-11 text-sm underline disabled:opacity-50">Deshacer este cambio</button>}
    {feedback && <p role="status" className="mt-3 text-sm text-[#226046]">{feedback}</p>}
    {error && <p role="alert" className="mt-3 text-sm text-red-800">{error}</p>}
    {busy && <p role="status" className="mt-3 text-sm">Guardando o revisando…</p>}
  </article>;
}
