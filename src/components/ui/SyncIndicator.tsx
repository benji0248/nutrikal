import { Cloud } from 'lucide-react';

/** Legacy sync indicator — now data is persisted per-action via REST API */
export function SyncIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-body min-h-[32px]">
      <Cloud size={12} className="text-muted/60" />
      <span className="text-muted/60 hidden sm:inline">Sincronizado</span>
    </div>
  );
}
