import { useEffect, useRef } from 'react';
import { MoreHorizontal, Plug, RefreshCw } from 'lucide-react';

export function AssistantOptions({ onReload, disabled = false }: { onReload?: () => void; disabled?: boolean }) {
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => { if (menu.current && event.target instanceof Node && !menu.current.contains(event.target)) menu.current.open = false; };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && menu.current?.open) { menu.current.open = false; menu.current.querySelector('summary')?.focus(); } };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', closeOutside); document.removeEventListener('keydown', escape); };
  }, []);
  return <details ref={menu} className="relative shrink-0">
    <summary aria-label="Más opciones del asistente" title="Más opciones" className="flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center rounded-full text-muted hover:bg-surface2 focus-visible:outline-2 focus-visible:outline-accent [&::-webkit-details-marker]:hidden"><MoreHorizontal size={21} aria-hidden="true" /></summary>
    <div className="absolute right-0 top-full z-40 mt-2 w-60 rounded-2xl bg-surface p-2 shadow-ambient ring-1 ring-border">
      {onReload && <button type="button" disabled={disabled} onClick={() => { if (menu.current) menu.current.open = false; onReload(); }} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-text-primary hover:bg-surface2 disabled:opacity-40"><RefreshCw size={17} aria-hidden="true" />Actualizar conversación</button>}
      <a href="/mcp" className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm text-text-primary hover:bg-surface2"><Plug size={17} aria-hidden="true" />Conexiones y accesos</a>
    </div>
  </details>;
}
