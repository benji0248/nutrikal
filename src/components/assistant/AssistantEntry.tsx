import { Component, lazy, Suspense, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { AppTab } from '../../types';
import { useAuthStore } from '../../store/useAuthStore';
import { getAssistantBetaAccess } from '../../services/assistantBetaService';
import { ChatAssistant } from './ChatAssistant';

const ExperimentalAssistant = lazy(() => import('./ExperimentalAssistant'));

class BetaBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed
      ? <p role="alert" className="rounded-xl bg-[#f3f5eb] p-5 text-sm">No pude abrir el asistente experimental. Podés volver al Chat actual con el selector de arriba.</p>
      : this.props.children;
  }
}

export function AssistantEntry({ onTabChange }: { onTabChange: (tab: AppTab) => void }) {
  const userId = useAuthStore((state) => state.user?.id);
  return <AssistantForUser key={userId} onTabChange={onTabChange} />;
}

function AssistantForUser({ onTabChange }: { onTabChange: (tab: AppTab) => void }) {
  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState<'classic' | 'beta'>('classic');
  useEffect(() => {
    let cancelled = false;
    getAssistantBetaAccess().then((result) => { if (!cancelled) setEnabled(result.enabled); }).catch(() => { /* Classic remains usable if the pilot endpoint is unavailable. */ });
    return () => { cancelled = true; };
  }, []);
  return <>
    {enabled && <div className="mx-auto mb-5 max-w-4xl">
      <div aria-label="Elegir asistente" className="inline-flex flex-wrap gap-1 rounded-2xl bg-[#e8ebe3] p-1">
        {([['classic', 'Chat actual'], ['beta', 'Asistente experimental']] as const).map(([value, label]) => <button
          key={value} type="button" aria-pressed={mode === value} onClick={() => setMode(value)}
          className={`min-h-11 rounded-xl px-4 text-sm font-medium ${mode === value ? 'bg-[#226046] text-white' : 'text-[#40493d]'}`}>
          {label}
        </button>)}
      </div>
    </div>}
    {enabled && mode === 'beta'
      ? <BetaBoundary><Suspense fallback={<p role="status" className="p-6 text-sm">Abriendo tu asistente…</p>}><ExperimentalAssistant onTabChange={onTabChange} /></Suspense></BetaBoundary>
      : <ChatAssistant onTabChange={onTabChange} />}
  </>;
}
