import { RefreshCw, Check, AlertCircle, WifiOff, Cloud } from 'lucide-react';
import { clsx } from 'clsx';
import { useGistSyncStore } from '../../store/useGistSyncStore';

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'justo ahora';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${Math.floor(hours / 24)}d`;
}

export function SyncIndicator() {
  const syncStatus = useGistSyncStore((s) => s.syncStatus);
  const lastSyncedAt = useGistSyncStore((s) => s.lastSyncedAt);
  const pendingSync = useGistSyncStore((s) => s.pendingSync);
  const push = useGistSyncStore((s) => s.push);

  const isClickable = syncStatus === 'error';

  const handleClick = () => {
    if (isClickable) push();
  };

  const tooltip = lastSyncedAt
    ? `Último guardado: ${formatRelativeTime(lastSyncedAt)}`
    : 'Sin sincronizar aún';

  return (
    <button
      onClick={handleClick}
      disabled={!isClickable}
      title={tooltip}
      className={clsx(
        'flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-body transition-all min-h-[32px]',
        isClickable && 'hover:bg-surface2/60 cursor-pointer',
        !isClickable && 'cursor-default',
      )}
    >
      {syncStatus === 'idle' && (
        <>
          <Cloud size={12} className="text-muted/60" />
          <span className="text-muted/60 hidden sm:inline">Sincronizado</span>
        </>
      )}
      {syncStatus === 'syncing' && (
        <>
          <RefreshCw size={12} className="text-accent animate-spin" />
          <span className="text-accent hidden sm:inline">Guardando...</span>
        </>
      )}
      {syncStatus === 'success' && (
        <>
          <Check size={12} className="text-green-400" />
          <span className="text-green-400 hidden sm:inline">Guardado</span>
        </>
      )}
      {syncStatus === 'error' && (
        <>
          <AlertCircle size={12} className="text-red-400" />
          <span className="text-red-400 hidden sm:inline">Error</span>
          <RefreshCw size={10} className="text-red-400" />
        </>
      )}
      {syncStatus === 'offline' && (
        <>
          <WifiOff size={12} className="text-amber-400" />
          <span className="text-amber-400 hidden sm:inline">Sin conexión</span>
          {pendingSync && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          )}
        </>
      )}
    </button>
  );
}
