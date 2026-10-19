import { Component, lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { AppTab } from '../../types';
import { useAuthStore } from '../../store/useAuthStore';
import { getAssistantBetaAccess } from '../../services/assistantBetaService';
import { ChatAssistant } from './ChatAssistant';
import { AssistantOptions } from './AssistantOptions.js';
import { AssistantModeSelect, type AssistantMode } from './AssistantModeSelect.js';

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
  const modeTrigger = useRef<HTMLButtonElement>(null);
  const [mode, setMode] = useState<AssistantMode>(() => {
    try { return sessionStorage.getItem(`nutrikal-assistant-mode:${userId}`) === 'beta' ? 'beta' : 'classic'; } catch { return 'classic'; }
  });
  useEffect(() => {
    let cancelled = false;
    getAssistantBetaAccess().then((result) => { if (!cancelled) setEnabled(result.enabled); }).catch(() => { if (!cancelled) setEnabled(false); });
    return () => { cancelled = true; };
  }, []);
  const modeControl = <AssistantModeSelect value={mode} triggerRef={modeTrigger} onChange={(value) => {
    setMode(value);
    try { sessionStorage.setItem(`nutrikal-assistant-mode:${userId}`, value); } catch { /* The selector also works without browser storage. */ }
    requestAnimationFrame(() => modeTrigger.current?.focus());
  }} />;
  return <>
    {enabled && mode === 'classic' && <div className="mx-auto mb-4 flex max-w-4xl items-center justify-between">{modeControl}<AssistantOptions /></div>}
    {enabled === null && mode === 'beta' ? <p role="status" className="p-6 text-sm text-muted">Abriendo tu asistente…</p> : enabled && mode === 'beta'
      ? <BetaBoundary><Suspense fallback={<p role="status" className="p-6 text-sm">Abriendo tu asistente…</p>}><ExperimentalAssistant onTabChange={onTabChange} modeControl={modeControl} /></Suspense></BetaBoundary>
      : <ChatAssistant onTabChange={onTabChange} />}
  </>;
}
