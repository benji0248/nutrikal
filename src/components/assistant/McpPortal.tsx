import { useEffect, useState } from 'react';
import { loadMcpManagement, createPersonalMcpToken, revokePersonalMcpToken, loadMcpReview, loadMcpProposal, confirmMcpReview } from '../../services/mcpService.js';
import type { McpToken, McpReview } from '../../services/mcpService.js';
import type { PropuestaGuardada } from '../../domain/nutrikal/proposals.js';
import { ProposalCard } from './ProposalCard.js';
import { useCalendarPlanStore } from '../../store/useCalendarPlanStore.js';
import { useAuthStore } from '../../store/useAuthStore.js';

const button = 'min-h-11 rounded-xl bg-[#226046] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50';
export default function McpPortal() {
  const [tokens, setTokens] = useState<McpToken[]>([]);
  const [proposals, setProposals] = useState<Array<{ id: string; titulo: string }>>([]);
  const [proposal, setProposal] = useState<PropuestaGuardada | null>(null);
  const [review, setReview] = useState<McpReview | null>(null);
  const [name, setName] = useState('Mi asistente');
  const [canPropose, setCanPropose] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    const params = new URLSearchParams(window.location.search);
    Promise.allSettled([loadMcpManagement(), params.get('review') ? loadMcpReview(params.get('review')!) : Promise.resolve(null), params.get('proposal') ? loadMcpProposal(params.get('proposal')!) : Promise.resolve(null)])
      .then(([state, request, draft]) => {
        if (!alive) return;
        if (state.status === 'fulfilled') { setTokens(state.value.tokens); setProposals(state.value.proposals); }
        if (request.status === 'fulfilled') setReview(request.value);
        if (draft.status === 'fulfilled') setProposal(draft.value);
        const failed = [state, request, draft].find((r) => r.status === 'rejected');
        if (failed?.status === 'rejected') setError(failed.reason instanceof Error ? failed.reason.message : 'No pude abrir una parte de la conexión.');
      })
      .finally(() => { if (alive) setBusy(false); });
    void useCalendarPlanStore.getState().refresh().catch(() => {});
    return () => { alive = false; };
  }, []);
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError(null); setFeedback(null);
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : 'No pude completar la operación.'); }
    finally { setBusy(false); }
  }
  const create = () => run(async () => { const result = await createPersonalMcpToken(name, canPropose); setSecret(result.secret); setTokens((rows) => [result.token, ...rows]); });
  const revoke = (id: string) => run(async () => { await revokePersonalMcpToken(id); setTokens((rows) => rows.map((t) => t.id === id ? { ...t, revoked_at: new Date().toISOString() } : t)); setSecret(null); });
  const confirm = () => run(async () => {
    if (!review) return;
    const userId = useAuthStore.getState().user?.id;
    const result = await confirmMcpReview(review.id);
    if (userId !== useAuthStore.getState().user?.id) return;
    useCalendarPlanStore.getState().acceptResult(result, review.title, review.kind === 'undo');
    setReview({ ...review, applied: true }); setFeedback('Cambio aplicado. El asistente ya puede consultar el resultado.');
  });
  const slots = review?.slots ?? review?.preview?.cambios.map((c) => ({ fecha: c.fecha, tipo: c.tipo, antes: [...c.antes, ...c.alternativasAntes.map((a) => `${a} (alternativa)`)], despues: [...c.despues, ...c.alternativasDespues.map((a) => `${a} (alternativa)`)] })) ?? [];
  return <main className="min-h-screen bg-[#faf9f4] px-4 py-8 text-[#191c17]"><div className="mx-auto max-w-3xl space-y-6">
    <a href="/" className="inline-block min-h-11 text-sm underline">Volver a Nutrikal</a>
    <header><h1 className="font-heading text-2xl font-bold">Conectar tu asistente con Nutrikal</h1><p className="mt-2 text-sm">Tus preferencias, ingredientes, calendario y borradores disponibles para un asistente mediante MCP. Los cambios del calendario se revisan y confirman acá.</p></header>
    {error && <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}<button onClick={() => window.location.reload()} className="ml-3 min-h-11 underline">Recargar estado</button></div>}
    {feedback && <p role="status" className="rounded-xl bg-green-50 p-4 text-sm">{feedback}</p>}
    {busy && <p role="status" className="text-sm">Cargando o guardando…</p>}
    {review && <section className="space-y-4 rounded-2xl border border-[#c1c9bb] bg-white p-5"><h2 className="text-lg font-semibold">{review.title}</h2>
      <p className="text-sm">{review.undone ? 'Esta operación fue ejecutada y luego deshecha.' : review.applied ? 'Esta operación ya fue ejecutada.' : 'Un asistente preparó este cambio. Revisá el detalle antes de confirmarlo.'}</p>
      <ul className="space-y-3 text-sm">{slots.map((s) => <li key={`${s.fecha}:${s.tipo}`}><strong>{s.fecha} · {s.tipo}</strong><p>Antes: {s.antes.join(' + ') || 'Sin comida'}</p><p>Después: {s.despues.join(' + ') || 'Sin comida'}</p></li>)}</ul>
      {review.preview?.validacion.incidencias.map((i, n) => <p key={n} className="text-sm text-amber-900">{i.mensaje}</p>)}
      {(review.preview?.compras.length || review.shopping) ? <details className="text-sm"><summary className="cursor-pointer">Cambios en compras</summary>{review.preview?.compras.map((l) => <div key={l.lista} className="mt-2"><strong>{l.lista}</strong><p>Antes: {l.antes.join(', ') || 'Sin pendientes'}</p><p>Después: {l.despues.join(', ') || 'Sin pendientes'}</p></div>)}{review.shopping && <div className="mt-2"><p>Antes: {review.shopping.antes.join(', ') || 'Sin pendientes'}</p><p>Después: {review.shopping.despues.join(', ') || 'Sin pendientes'}</p></div>}</details> : null}
      <p className="text-xs">Vence: {new Date(review.expiresAt).toLocaleString()}. Si el calendario o tus preferencias cambian, deberás revisar una propuesta actualizada.</p>
      {!review.applied && <button type="button" disabled={busy || Date.parse(review.expiresAt) <= Date.now()} onClick={() => void confirm()} className={button}>{review.kind === 'undo' ? 'Confirmar deshacer' : 'Confirmar y agregar'}</button>}
      <a href="/" className="ml-3 inline-block min-h-11 text-sm underline">Cerrar sin cambiar nada</a>
    </section>}
    <section className="space-y-3 rounded-2xl bg-white p-5"><h2 className="font-semibold">Borradores recientes</h2><select aria-label="Elegir borrador" value={proposal?.id ?? ''} disabled={busy} onChange={(e) => { const id = e.target.value; if (id) void run(async () => setProposal(await loadMcpProposal(id))); }} className="min-h-11 w-full rounded-xl border-[#c1c9bb]"><option value="">Elegí un borrador</option>{proposals.map((p) => <option key={p.id} value={p.id}>{p.titulo}</option>)}</select>
      {proposal && <ProposalCard propuesta={proposal} onAdjust={() => setFeedback(`Pedile al asistente que lea la propuesta ${proposal.id} y guarde una nueva con los cambios que quieras.`)} />}
    </section>
    <section className="space-y-4 rounded-2xl bg-white p-5"><h2 className="font-semibold">Crear un acceso</h2>
      <label className="block text-sm">Nombre<input value={name} maxLength={80} onChange={(e) => setName(e.target.value)} disabled={busy} className="mt-1 min-h-11 w-full rounded-xl border-[#c1c9bb]" /></label>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={canPropose} onChange={(e) => setCanPropose(e.target.checked)} disabled={busy} className="mt-1" /><span>Permitir guardar borradores y pedir cambios para revisar. Si lo dejás desmarcado, el acceso es de solo lectura y cálculo.</span></label>
      <button type="button" disabled={busy || !name.trim()} onClick={() => void create()} className={button}>Crear acceso por 30 días</button>
      {secret && <div className="space-y-2 rounded-xl bg-[#f3f5eb] p-4"><p className="text-sm">Copiá este acceso ahora. Se muestra una sola vez y no se guarda en este navegador.</p><textarea aria-label="Acceso MCP generado" readOnly value={secret} spellCheck={false} className="w-full break-all rounded-xl border-[#c1c9bb] font-mono text-xs" /><button type="button" className={button} onClick={() => void navigator.clipboard.writeText(secret).then(() => setFeedback('Acceso copiado.')).catch(() => setError('Seleccioná el acceso y copialo manualmente.'))}>Copiar acceso</button><button type="button" onClick={() => setSecret(null)} className="ml-3 min-h-11 text-sm underline">Ocultar</button></div>}
      <p className="text-sm">URL MCP: <code className="break-all">https://nutrikal.vercel.app/api/mcp</code></p><p className="text-sm">Usá el acceso como <code>Authorization: Bearer TU_ACCESO</code> en un cliente compatible con Streamable HTTP y acceso manual. Para clientes locales hay un puente stdio en el repositorio: <code>node scripts/nutrikal-mcp.mjs</code>, con <code>NUTRIKAL_MCP_TOKEN</code>.</p>
    </section>
    <section className="space-y-3 rounded-2xl bg-white p-5"><h2 className="font-semibold">Tus accesos</h2>{!tokens.length && <p className="text-sm">Todavía no creaste accesos.</p>}{tokens.map((t) => <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e1e5dc] py-3"><div><p className="text-sm font-semibold">{t.name}</p><p className="text-xs">{t.can_propose ? 'Lectura y borradores' : 'Solo lectura'} · {t.revoked_at ? 'Revocado' : `Vence ${new Date(t.expires_at).toLocaleDateString()}`}</p></div>{!t.revoked_at && <button type="button" disabled={busy} onClick={() => void revoke(t.id)} className="min-h-11 px-3 text-sm underline disabled:opacity-50">Revocar</button>}</div>)}</section>
  </div></main>;
}
