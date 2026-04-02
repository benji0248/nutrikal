import { Heart } from 'lucide-react';
import { clsx } from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseISO } from 'date-fns';

interface HistorialCardProps {
  name: string;
  count: number;
  lastDate: string;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

export const HistorialCard = ({
  name,
  count,
  lastDate,
  isFavorite,
  onToggleFavorite,
}: HistorialCardProps) => {
  const timeAgo = formatDistanceToNow(parseISO(lastDate), {
    addSuffix: true,
    locale: es,
  });

  return (
    <div className="bg-[var(--surface2)]/40 backdrop-blur-sm rounded-2xl border border-[var(--border)]/40 p-4 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-body font-medium text-[var(--text-primary)] truncate">
          {name}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[11px] font-body text-[var(--accent)] font-medium">
            {count} {count === 1 ? 'vez' : 'veces'}
          </span>
          <span className="text-[11px] font-body text-[var(--text-muted)]">
            · {timeAgo}
          </span>
        </div>
      </div>
      <button
        onClick={onToggleFavorite}
        className="shrink-0 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-xl hover:bg-[var(--surface2)] transition-colors"
        aria-label={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
      >
        <Heart
          size={20}
          className={clsx(
            'transition-colors',
            isFavorite ? 'fill-[var(--pink)] text-[var(--pink)]' : 'text-[var(--text-muted)]',
          )}
        />
      </button>
    </div>
  );
};
