import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowUp, History, Leaf, LoaderCircle, SquarePen, X } from 'lucide-react';
import type { AppTab, WeekPlan } from '../../types';
import type { AssistantBetaConversation, AssistantBetaState } from '../../types/assistantBeta';
import { createAssistantBetaConversation, loadAssistantBeta, sendAssistantBetaMessage } from '../../services/assistantBetaService';
import { useCalendarPlanStore } from '../../store/useCalendarPlanStore';
import { PlanReviewGrid } from '../planner/PlanReviewGrid';
import { ProposalCard } from './ProposalCard.js';
import { AssistantOptions } from './AssistantOptions.js';
import { ExperimentalHistory } from './ExperimentalHistory.js';
import type { PropuestaGuardada } from '../../domain/nutrikal/proposals.js';

export default function ExperimentalAssistant({ onTabChange, modeControl }: { onTabChange: (tab: AppTab) => void; modeControl?: ReactNode }) {
  const [conversation, setConversation] = useState<AssistantBetaConversation | null>(null);
  const [history, setHistory] = useState<AssistantBetaState['conversations']>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [draftReference, setDraftReference] = useState<{ id: string; title: string } | null>(null);
  const alive = useRef(true);
  const sending = useRef(false);
  const attempt = useRef<{ key: string; id: string } | null>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const followBottom = useRef(true);
  const snapshot = useCalendarPlanStore((state) => state.snapshot);
  const calendarBusy = useCalendarPlanStore((state) => state.busy);
  const empty = !conversation?.messages.length && !pendingText;

  useEffect(() => {
    alive.current = true;
    loadAssistantBeta().then((result) => {
      if (!alive.current) return;
      setConversation(result.conversation); setHistory(result.conversations);
      if (!result.enabled) setError('El nuevo asistente no está habilitado para esta cuenta.');
    }).catch((err: unknown) => { if (alive.current) setError(err instanceof Error ? err.message : 'No pude cargar la conversación.'); })
      .finally(() => { if (alive.current) setBusy(false); });
    void useCalendarPlanStore.getState().refresh().catch(() => {});
    return () => { alive.current = false; };
  }, []);
  useEffect(() => {
    if (viewport.current && (followBottom.current || pendingText)) viewport.current.scrollTop = viewport.current.scrollHeight;
  }, [conversation?.messages.length, pendingText]);
  useEffect(() => {
    const node = textarea.current;
    if (node) { node.style.height = '0px'; node.style.height = `${Math.min(node.scrollHeight, 176)}px`; }
  }, [input, empty]);

  const reload = async (id?: string) => {
    if (sending.current) return;
    setShowHistory(false); setBusy(true); setError(null); followBottom.current = true;
    try {
      const result = await loadAssistantBeta(id);
      if (alive.current) { setConversation(result.conversation); setHistory(result.conversations); setInput(''); setDraftReference(null); }
    } catch (err) { if (alive.current) setError(err instanceof Error ? err.message : 'No pude cargar el historial.'); }
    finally { if (alive.current) setBusy(false); }
  };
  const startNew = async () => {
    if (sending.current || busy) return;
    setShowHistory(false); setBusy(true); setError(null); followBottom.current = true;
    try {
      const result = await createAssistantBetaConversation();
      if (alive.current) { setConversation(result.conversation); setInput(''); setDraftReference(null); setHistory((items) => [{ id: result.conversation.id, title: result.conversation.title, updatedAt: new Date().toISOString() }, ...items].slice(0, 30)); }
    } catch (err) { if (alive.current) setError(err instanceof Error ? err.message : 'No pude crear la conversación.'); }
    finally { if (alive.current) { setBusy(false); requestAnimationFrame(() => textarea.current?.focus()); } }
  };
  const send = async () => {
    const text = input.trim();
    if (!text || sending.current || busy || calendarBusy) return;
    sending.current = true; followBottom.current = true; setBusy(true); setError(null); setPendingText(text); setInput('');
    try {
      let active = conversation;
      if (!active) {
        active = (await createAssistantBetaConversation()).conversation;
        if (alive.current) { setConversation(active); setHistory((items) => [{ id: active!.id, title: active!.title, updatedAt: new Date().toISOString() }, ...items]); }
      }
      const attemptKey = `${active.id}:${active.revision}:${draftReference?.id ?? ''}:${text}`;
      if (attempt.current?.key !== attemptKey) attempt.current = { key: attemptKey, id: crypto.randomUUID() };
      const result = await sendAssistantBetaMessage(active, text, attempt.current.id, draftReference?.id);
      if (alive.current) {
        setConversation(result.conversation); setDraftReference(null); attempt.current = null;
        setHistory((items) => [{ id: result.conversation.id, title: result.conversation.title, updatedAt: new Date().toISOString() }, ...items.filter((item) => item.id !== result.conversation.id)].slice(0, 30));
      }
    } catch (err) { if (alive.current) { setInput(text); setError(err instanceof Error ? err.message : 'No pude responder. Tu calendario sigue igual.'); } }
    finally { sending.current = false; if (alive.current) { setBusy(false); setPendingText(null); } }
  };
  const apply = (plan: WeekPlan) => {
    useCalendarPlanStore.getState().requestApply(plan, () => { if (alive.current) onTabChange('calendar'); });
  };
  const adjust = (proposal: PropuestaGuardada) => { setDraftReference({ id: proposal.id, title: proposal.contenido.titulo }); requestAnimationFrame(() => textarea.current?.focus()); };
  const userBubble = (text: string) => <div className="ml-auto max-w-[88%] rounded-[1.5rem] rounded-br-md bg-surface2 px-5 py-3.5 text-[15px] leading-7 text-text-primary sm:max-w-[80%]"><span className="sr-only">Vos: </span><p className="whitespace-pre-wrap break-words">{text}</p></div>;
  const composer = <div className="mx-auto w-full max-w-3xl">
    {draftReference && <div className="mb-2 flex items-center justify-between gap-2 rounded-2xl bg-surface2 px-4 py-1 text-xs text-accent"><span className="truncate">Ajustando: {draftReference.title}</span><button type="button" disabled={busy} aria-label="Quitar referencia a la propuesta" onClick={() => setDraftReference(null)} className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full hover:bg-accent/10"><X size={16} aria-hidden="true" /></button></div>}
    {error && <div role="alert" className="mb-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800"><p>{error}</p><button type="button" disabled={busy} onClick={() => void reload(conversation?.id)} className="mt-1 min-h-11 font-semibold underline">Actualizar conversación</button></div>}
    <form aria-label="Escribir al asistente" onSubmit={(event) => { event.preventDefault(); void send(); }} className="flex items-end rounded-[1.75rem] bg-surface p-2 shadow-[0_8px_32px_rgba(25,28,23,0.05)] ring-1 ring-border transition-shadow focus-within:ring-accent/25">
      <label htmlFor="beta-message" className="sr-only">Mensaje al asistente</label>
      <textarea ref={textarea} id="beta-message" rows={1} maxLength={6000} value={input} disabled={busy} onChange={(event) => setInput(event.target.value)}
        onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && window.matchMedia('(hover: hover) and (pointer: fine)').matches) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }}
        placeholder="Contame qué tenés en mente…" className="max-h-44 min-h-14 min-w-0 flex-1 resize-none border-0 bg-transparent px-4 py-3.5 text-[15px] leading-7 text-text-primary placeholder:text-muted/75 focus:ring-0 disabled:opacity-60" />
      <button type="submit" disabled={busy || calendarBusy || !input.trim()} aria-label="Enviar mensaje" title="Enviar mensaje" className="mb-1 mr-1 flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full bg-accent text-surface transition-transform hover:opacity-90 active:scale-95 disabled:bg-surface2 disabled:text-muted/50">{pendingText ? <LoaderCircle size={20} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <ArrowUp size={22} aria-hidden="true" />}</button>
    </form>
    <div className="mt-3 flex min-h-4 items-center justify-center gap-2 text-center text-[11px] text-muted"><span>Revisás cada propuesta antes de agregarla al calendario.</span>{input.length > 5500 && <span>{input.length}/6000</span>}</div>
  </div>;

  return <section className="-mx-4 -mb-24 -mt-6 flex h-[calc(100dvh-72px-96px-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))] min-h-72 flex-col text-text-primary md:-mx-10 md:-mb-12 md:h-[calc(100dvh-60px)]" aria-label="Nuevo asistente">
    <header className="flex shrink-0 items-center justify-between gap-2 px-3 py-2 sm:px-6 md:px-8">
      {modeControl ?? <span className="px-2 text-sm font-semibold">Tu asistente</span>}
      <div className="flex items-center gap-0.5">
        <button type="button" disabled={busy} aria-label="Abrir historial de conversaciones" aria-haspopup="dialog" aria-expanded={showHistory} title="Tus conversaciones" onClick={() => setShowHistory(true)} className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-muted hover:bg-surface2 disabled:opacity-40"><History size={20} aria-hidden="true" /></button>
        <button type="button" disabled={busy} title="Nueva conversación" onClick={() => void startNew()} className="flex min-h-11 items-center gap-2 rounded-full px-3 text-sm text-muted hover:bg-surface2 disabled:opacity-40"><SquarePen size={20} aria-hidden="true" /><span className="hidden sm:inline">Nueva</span><span className="sr-only sm:hidden">Nueva conversación</span></button>
        <AssistantOptions onReload={() => void reload(conversation?.id)} disabled={busy} />
      </div>
    </header>
    {empty ? <div className="min-h-0 flex-1 overflow-y-auto px-5">
      <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-center pb-8 pt-6 sm:pb-20">
        <div className="mb-8 text-center sm:mb-10"><div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-accent/10 text-accent"><Leaf size={28} strokeWidth={1.5} aria-hidden="true" /></div><h1 className="font-heading text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">¿Qué tenés en mente?</h1><p className="mx-auto mt-4 max-w-md text-sm leading-6 text-muted">Podemos pensar una comida o acomodar tu semana.</p></div>
        {busy && <p role="status" className="mb-4 text-center text-sm text-muted">Abriendo tu conversación…</p>}
        {composer}
      </div>
    </div> : <>
      <div ref={viewport} onScroll={(e) => { followBottom.current = e.currentTarget.scrollHeight - e.currentTarget.scrollTop - e.currentTarget.clientHeight < 100; }} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5">
        <div role="log" aria-label="Conversación" aria-live="polite" aria-busy={busy} className="mx-auto max-w-3xl space-y-8 py-7 sm:space-y-10">
          {conversation?.messages.map((message) => <div key={message.id}>
            {message.role === 'user' ? <div>{message.draftReference && <p className="mb-2 text-right text-xs text-muted">Sobre: {message.draftReference.title}</p>}{userBubble(message.text)}</div> : <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-accent"><Leaf size={16} strokeWidth={1.75} aria-hidden="true" />Nutrikal</div>
              <p className="whitespace-pre-wrap break-words text-[15px] leading-7">{message.text}</p>
              {!!message.tools?.length && <details className="mt-4 text-xs text-muted"><summary className="min-h-8 cursor-pointer py-2">Consultas y cálculos</summary><ul className="mt-1 space-y-2">{message.tools.map((tool, i) => <li key={`${tool.name}-${i}`}>{tool.ok ? '✓' : 'No se completó:'} {tool.label}</li>)}</ul></details>}
            </div>}
            {message.drafts?.map((propuesta) => <ProposalCard key={propuesta.id} propuesta={propuesta} onAdjust={adjust} />)}
            {message.proposals?.map((proposal) => {
              const applied = Boolean(snapshot?.plans.some((plan) => plan.id === proposal.plan.id));
              return <article key={proposal.id} className="mt-4 rounded-[2rem] bg-surface p-4 shadow-ambient sm:p-6"><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{proposal.title}</h3><span className="rounded-full bg-surface2 px-3 py-1 text-xs">{applied ? 'En tu calendario' : 'Para revisar'}</span></div>
                <PlanReviewGrid plan={proposal.plan} onSwapMeal={(date, type) => { setInput(`Quiero cambiar el ${type} del ${date} de «${proposal.title}» y conservar el resto.`); requestAnimationFrame(() => textarea.current?.focus()); }} swapDisabled={busy || calendarBusy || applied} />
                <button type="button" disabled={busy || calendarBusy || applied} onClick={() => apply(proposal.plan)} className="mt-5 min-h-12 w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-surface disabled:opacity-50">{applied ? 'En tu calendario' : 'Revisar y agregar'}</button>
              </article>;
            })}
          </div>)}
          {pendingText && userBubble(pendingText)}
          {busy && <div role="status" className="flex items-center gap-3 py-2 text-sm text-muted"><LoaderCircle size={18} className="animate-spin text-accent motion-reduce:animate-none" aria-hidden="true" />{pendingText ? 'Pensando en tu pedido…' : 'Abriendo conversación…'}</div>}
        </div>
      </div>
      <footer className="shrink-0 px-5 pb-4 pt-3 sm:pb-5">{composer}</footer>
    </>}
    {showHistory && <ExperimentalHistory history={history} selectedId={conversation?.id} busy={busy} onClose={() => setShowHistory(false)} onOpen={(id) => void reload(id)} onNew={() => void startNew()} />}
  </section>;
}
