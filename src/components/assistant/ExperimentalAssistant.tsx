import { useEffect, useRef, useState } from 'react';
import { Plus, RefreshCw, Send, Sparkles } from 'lucide-react';
import type { AppTab, WeekPlan } from '../../types';
import type { AssistantBetaConversation, AssistantBetaState } from '../../types/assistantBeta';
import { createAssistantBetaConversation, loadAssistantBeta, sendAssistantBetaMessage } from '../../services/assistantBetaService';
import { useCalendarPlanStore } from '../../store/useCalendarPlanStore';
import { PlanReviewGrid } from '../planner/PlanReviewGrid';
import { ProposalCard } from './ProposalCard.js';

export default function ExperimentalAssistant({ onTabChange }: { onTabChange: (tab: AppTab) => void }) {
  const [conversation, setConversation] = useState<AssistantBetaConversation | null>(null);
  const [history, setHistory] = useState<AssistantBetaState['conversations']>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingText, setPendingText] = useState<string | null>(null);
  const alive = useRef(true);
  const sending = useRef(false);
  const attempt = useRef<{ key: string; id: string } | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const snapshot = useCalendarPlanStore((state) => state.snapshot);
  const calendarBusy = useCalendarPlanStore((state) => state.busy);

  useEffect(() => {
    alive.current = true;
    loadAssistantBeta().then((result) => {
      if (!alive.current) return;
      setConversation(result.conversation); setHistory(result.conversations);
      if (!result.enabled) setError('El asistente experimental no está habilitado para esta cuenta.');
    }).catch((err: unknown) => { if (alive.current) setError(err instanceof Error ? err.message : 'No pude cargar la conversación.'); })
      .finally(() => { if (alive.current) setBusy(false); });
    // This loads current plan provenance for the cards; it does not write meals.
    void useCalendarPlanStore.getState().refresh().catch(() => {});
    return () => { alive.current = false; };
  }, []);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [conversation?.messages.length, pendingText]);

  const reload = async (id?: string) => {
    if (sending.current) return;
    setBusy(true); setError(null);
    try {
      const result = await loadAssistantBeta(id);
      if (alive.current) { setConversation(result.conversation); setHistory(result.conversations); }
    } catch (err) { if (alive.current) setError(err instanceof Error ? err.message : 'No pude cargar el historial.'); }
    finally { if (alive.current) setBusy(false); }
  };

  const startNew = async () => {
    if (sending.current || busy) return;
    setBusy(true); setError(null);
    try {
      const result = await createAssistantBetaConversation();
      if (alive.current) { setConversation(result.conversation); setInput(''); setHistory((items) => [{ id: result.conversation.id, title: result.conversation.title, updatedAt: new Date().toISOString() }, ...items].slice(0, 30)); }
    } catch (err) { if (alive.current) setError(err instanceof Error ? err.message : 'No pude crear la conversación.'); }
    finally { if (alive.current) setBusy(false); }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending.current || busy || calendarBusy) return;
    sending.current = true; setBusy(true); setError(null); setPendingText(text);
    try {
      let active = conversation;
      if (!active) {
        active = (await createAssistantBetaConversation()).conversation;
        if (alive.current) {
          setConversation(active);
          setHistory((items) => [{ id: active!.id, title: active!.title, updatedAt: new Date().toISOString() }, ...items]);
        }
      }
      const attemptKey = `${active.id}:${active.revision}:${text}`;
      if (attempt.current?.key !== attemptKey) attempt.current = { key: attemptKey, id: crypto.randomUUID() };
      const result = await sendAssistantBetaMessage(active, text, attempt.current.id);
      if (alive.current) {
        setConversation(result.conversation); setInput('');
        attempt.current = null;
        setHistory((items) => [{ id: result.conversation.id, title: result.conversation.title, updatedAt: new Date().toISOString() }, ...items.filter((item) => item.id !== result.conversation.id)].slice(0, 30));
      }
    } catch (err) { if (alive.current) setError(err instanceof Error ? err.message : 'No pude responder. Tu calendario sigue igual.'); }
    finally { sending.current = false; if (alive.current) { setBusy(false); setPendingText(null); } }
  };

  const apply = (plan: WeekPlan) => {
    useCalendarPlanStore.getState().requestApply(plan, () => { if (alive.current) onTabChange('calendar'); });
  };

  return <section className="mx-auto max-w-4xl pb-8 text-[#191c17]" aria-label="Asistente experimental">
    <div className="mb-5 rounded-2xl bg-[#f3f5eb] p-5">
      <div className="flex items-center gap-2"><Sparkles size={20} className="text-[#226046]" /><h2 className="font-heading text-lg font-bold">Organizá tus comidas conversando</h2></div>
      <p className="mt-2 text-sm leading-relaxed text-[#40493d]">Contame qué necesitás o qué tenés para cocinar. Puedo consultar tu rutina y tu calendario, y preparar opciones para que las revises.</p>
      <p className="mt-2 text-xs text-[#40493d]">Tus comidas cambian cuando elegís agregar una propuesta. Este historial está separado del chat actual.</p>
    </div>
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <label className="min-w-0 flex-1 text-sm"><span className="sr-only">Conversación experimental</span>
        <select value={conversation?.id ?? ''} disabled={busy} onChange={(event) => void reload(event.target.value)} className="min-h-11 w-full rounded-xl border-[#c1c9bb] bg-white text-sm">
          {!conversation && <option value="">Nueva conversación</option>}
          {history.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
        </select>
      </label>
      <button type="button" disabled={busy} onClick={() => void startNew()} className="flex min-h-11 items-center gap-2 rounded-xl bg-[#e8ebe3] px-3 text-sm disabled:opacity-50"><Plus size={16} />Nueva</button>
      <button type="button" disabled={busy} onClick={() => void reload(conversation?.id)} aria-label="Recargar conversación" className="min-h-11 rounded-xl bg-[#e8ebe3] px-3 disabled:opacity-50"><RefreshCw size={16} /></button>
    </div>
    <div className="space-y-5" aria-live="polite" aria-busy={busy}>
      {!conversation?.messages.length && !busy && <p className="py-5 text-sm text-[#40493d]">Podés empezar con algo como: “Tengo pollo en el freezer y quiero organizar las cenas desde mañana”.</p>}
      {conversation?.messages.map((message) => <div key={message.id}>
        <div className={`rounded-2xl px-5 py-4 ${message.role === 'user' ? 'ml-8 bg-[#226046] text-white' : 'mr-4 bg-white shadow-sm'}`}>
          <p className="mb-1 text-xs font-semibold opacity-70">{message.role === 'user' ? 'Vos' : 'Nutrikal'}</p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.text}</p>
          {!!message.tools?.length && <details className="mt-3 text-xs"><summary className="cursor-pointer">Qué consulté y preparé</summary><ul className="mt-2 space-y-1">{message.tools.map((tool, i) => <li key={`${tool.name}-${i}`}>{tool.ok ? '✓' : 'No se completó:'} {tool.label}</li>)}</ul></details>}
        </div>
        {message.drafts?.map((propuesta) => <ProposalCard key={propuesta.id} propuesta={propuesta} onAdjust={setInput} />)}
        {message.proposals?.map((proposal) => {
          const applied = Boolean(snapshot?.plans.some((plan) => plan.id === proposal.plan.id));
          return <article key={proposal.id} className="mt-4 rounded-2xl border border-[#c1c9bb] bg-white p-4 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{proposal.title}</h3><span className="rounded-full bg-[#e8ebe3] px-3 py-1 text-xs">{applied ? 'En tu calendario' : 'Propuesta'}</span></div>
            <PlanReviewGrid plan={proposal.plan} onSwapMeal={(date, type) => { setInput(`Prepará una nueva propuesta cambiando el ${type} del ${date} del plan ${proposal.id}, y conservá el resto.`); }} swapDisabled={busy || calendarBusy || applied} />
            <button type="button" disabled={busy || calendarBusy || applied} onClick={() => apply(proposal.plan)} className="mt-5 min-h-12 w-full rounded-xl bg-[#226046] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{applied ? 'Agregado al calendario' : 'Revisar y agregar'}</button>
            <p className="mt-2 text-xs text-[#40493d]">Al agregarlo podés resolver las coincidencias con tus comidas actuales. Los alimentos que tenés en casa no se descuentan automáticamente de las compras.</p>
          </article>;
        })}
      </div>)}
      {pendingText && <div className="ml-8 rounded-2xl bg-[#226046] px-5 py-4 text-sm text-white">{pendingText}</div>}
      {busy && <p role="status" className="text-sm text-[#40493d]">{pendingText ? 'Estoy revisando tu pedido… Si hay que preparar comidas, puede tomar un momento.' : 'Cargando tu conversación…'}</p>}
      <div ref={end} />
    </div>
    {error && <div role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-800"><p>{error}</p><button type="button" disabled={busy} onClick={() => void reload(conversation?.id)} className="mt-2 min-h-11 underline">Recargar conversación</button></div>}
    <form onSubmit={(event) => { event.preventDefault(); void send(); }} className="mt-6 rounded-2xl border border-[#c1c9bb] bg-white p-3">
      <label htmlFor="beta-message" className="sr-only">Mensaje al asistente experimental</label>
      <textarea id="beta-message" rows={3} maxLength={6000} value={input} disabled={busy} onChange={(event) => setInput(event.target.value)} placeholder="Contame qué necesitás organizar…" className="w-full resize-y rounded-xl border-0 bg-transparent text-sm focus:ring-[#226046] disabled:opacity-60" />
      <div className="flex justify-end"><button type="submit" disabled={busy || calendarBusy || !input.trim()} className="flex min-h-11 items-center gap-2 rounded-xl bg-[#226046] px-5 text-sm font-semibold text-white disabled:opacity-50"><Send size={16} />Enviar</button></div>
    </form>
  </section>;
}
