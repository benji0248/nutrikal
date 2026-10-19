import { useEffect, useRef, useState } from 'react';
import { MessageSquare, Search, SquarePen, X } from 'lucide-react';
import type { AssistantBetaState } from '../../types/assistantBeta.js';

export function ExperimentalHistory({ history, selectedId, busy, onOpen, onNew, onClose }: {
  history: AssistantBetaState['conversations']; selectedId?: string; busy: boolean;
  onOpen: (id: string) => void; onNew: () => void; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  useEffect(() => {
    const node = dialog.current;
    const previousOverflow = document.body.style.overflow;
    node?.showModal(); search.current?.focus(); document.body.style.overflow = 'hidden';
    return () => { node?.close(); document.body.style.overflow = previousOverflow; };
  }, []);
  const filtered = history.filter((item) => item.title.toLocaleLowerCase('es').includes(query.trim().toLocaleLowerCase('es')));
  return <dialog ref={dialog} aria-labelledby="experimental-history-title" onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }} className="m-0 ml-auto h-dvh max-h-dvh w-full max-w-sm border-0 bg-bg p-0 text-text-primary shadow-ambient backdrop:bg-[#191c17]/25 backdrop:backdrop-blur-sm">
    <div className="flex h-full flex-col p-5">
      <header className="mb-5 flex items-center justify-between gap-3"><h2 id="experimental-history-title" className="text-lg font-semibold">Tus conversaciones</h2><button type="button" aria-label="Cerrar historial" onClick={onClose} className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-muted hover:bg-surface2"><X size={20} aria-hidden="true" /></button></header>
      <button type="button" disabled={busy} onClick={onNew} className="mb-4 flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-accent px-4 text-sm font-semibold text-surface disabled:opacity-40"><SquarePen size={18} aria-hidden="true" />Nueva conversación</button>
      <label className="mb-4 flex items-center gap-2 rounded-2xl bg-surface px-4 text-muted"><Search size={17} aria-hidden="true" /><span className="sr-only">Buscar conversación</span><input ref={search} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar conversación" className="min-h-12 min-w-0 flex-1 border-0 bg-transparent px-0 text-sm text-text-primary placeholder:text-muted focus:ring-0" /></label>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <ul className="space-y-1">{filtered.map((item) => <li key={item.id}><button type="button" disabled={busy} aria-current={selectedId === item.id ? 'true' : undefined} onClick={() => onOpen(item.id)} className={`flex min-h-16 w-full items-start gap-3 rounded-2xl px-3 py-3 text-left disabled:opacity-40 ${selectedId === item.id ? 'bg-surface2' : 'hover:bg-surface'}`}><MessageSquare size={17} className="mt-1 shrink-0 text-muted" aria-hidden="true" /><span className="min-w-0"><span className="line-clamp-2 text-sm font-medium">{item.title}</span><span className="mt-1 block text-xs text-muted">{new Date(item.updatedAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}</span></span></button></li>)}</ul>
        {!filtered.length && <p className="px-3 py-8 text-sm text-muted">{query ? 'No encontré conversaciones con ese nombre.' : 'Tus conversaciones van a aparecer acá.'}</p>}
      </div>
    </div>
  </dialog>;
}
