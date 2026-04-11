import { RefreshCw } from 'lucide-react';
import { useProfileStore } from '../../store/useProfileStore';
import { useAuthStore } from '../../store/useAuthStore';
import { JOURNAL } from './journalTokens';

export const ChatHeader = () => {
  const profile = useProfileStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);

  const initial =
    profile?.name?.trim()?.[0]?.toUpperCase() ??
    user?.displayName?.trim()?.[0]?.toUpperCase() ??
    user?.username?.[0]?.toUpperCase() ??
    '?';

  return (
    <header
      className="sticky top-0 z-20 px-4 py-3 backdrop-blur-xl border-b border-transparent"
      style={{
        backgroundColor: JOURNAL.glass,
        boxShadow: '0 4px 24px rgba(25, 28, 23, 0.04)',
      }}
    >
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
          style={{
            backgroundColor: 'rgba(34, 96, 70, 0.12)',
            color: JOURNAL.primary,
          }}
          aria-hidden
        >
          {initial}
        </div>
        <div className="min-w-0 flex-1 text-center">
          <h2 className="font-heading text-base font-bold tracking-tight" style={{ color: JOURNAL.primary }}>
            NutriKal
          </h2>
          <p className="truncate font-body text-[11px]" style={{ color: JOURNAL.muted }}>
            Tu asistente de nutrición
          </p>
        </div>
        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors active:scale-[0.98]"
          style={{ color: JOURNAL.primary }}
          title="Sincronizar vista"
          aria-label="Sincronizar vista"
          onClick={() => {
            /* Reservado: sync / refetch sin recargar toda la app */
          }}
        >
          <RefreshCw size={20} strokeWidth={1.75} />
        </button>
      </div>
    </header>
  );
};
