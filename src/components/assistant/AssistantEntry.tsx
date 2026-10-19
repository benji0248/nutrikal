import { Component, lazy, Suspense, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { AppTab } from '../../types';
import { useAuthStore } from '../../store/useAuthStore';
import { getAssistantBetaAccess } from '../../services/assistantBetaService';
import { ChatAssistant } from './ChatAssistant';
import { AssistantOptions } from './AssistantOptions.js';

const ExperimentalAssistant = lazy(() => import('./ExperimentalAssistant'));

class BetaBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed
      ? <p role="alert" className="rounded-xl bg-surface2 p-5 text-sm">No pude abrir el nuevo asistente. Recargá la página para volver al chat actual.</p>
      : this.props.children;
  }
}

export function AssistantEntry({ onTabChange }: { onTabChange: (tab: AppTab) => void }) {
  const userId = useAuthStore((state) => state.user?.id);
  return <AssistantForUser key={userId} userId={userId} onTabChange={onTabChange} />;
}

function AssistantForUser({ onTabChange, userId }: { onTabChange: (tab: AppTab) => void; userId?: string }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [mode, setMode] = useState<'classic' | 'beta'>(() => {
    try { return sessionStorage.getItem(`nutrikal-assistant-mode:${userId}`) === 'beta' ? 'beta' : 'classic'; } catch { return 'classic'; }
  });
  useEffect(() => {
    let cancelled = false;
    getAssistantBetaAccess().then((result) => { if (!cancelled) setEnabled(result.enabled); }).catch(() => { if (!cancelled) setEnabled(false); });
    return () => { cancelled = true; };
  }, []);
  const modeControl = <label className="min-w-0"><span className="sr-only">Elegir asistente</span><select aria-label="Elegir asistente" value={mode} onChange={(event) => {
    const value = event.target.value as 'classic' | 'beta'; setMode(value);
    try { sessionStorage.setItem(`nutrikal-assistant-mode:${userId}`, value); } catch { /* The selector also works without browser storage. */ }
  }} className="min-h-11 max-w-full cursor-pointer rounded-xl border-0 bg-transparent py-2 pl-2 pr-9 text-sm font-semibold text-text-primary focus:ring-accent/20"><option value="classic">Chat actual</option><option value="beta">Nuevo asistente</option></select></label>;
  return <>
    {enabled && mode === 'classic' && <div className="mx-auto mb-4 flex max-w-4xl items-center justify-between">{modeControl}<AssistantOptions /></div>}
    {enabled === null && mode === 'beta' ? <p role="status" className="p-6 text-sm text-muted">Abriendo tu asistente…</p> : enabled && mode === 'beta'
      ? <BetaBoundary><Suspense fallback={<p role="status" className="p-6 text-sm">Abriendo tu asistente…</p>}><ExperimentalAssistant onTabChange={onTabChange} modeControl={modeControl} /></Suspense></BetaBoundary>
      : <ChatAssistant onTabChange={onTabChange} />}
  </>;
}
