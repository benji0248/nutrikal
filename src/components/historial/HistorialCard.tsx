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
    <div className="bg-surface rounded-[1.25rem] shadow-ambient border border-transparent p-4 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-body font-medium text-text-primary truncate">
          {name}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[11px] font-body text-accent font-medium">
            {count} {count === 1 ? 'vez' : 'veces'}
          </span>
          <span className="text-[11px] font-body text-muted">
            · {timeAgo}
          </span>
        </div>
      </div>
      <button
        onClick={onToggleFavorite}
        className="shrink-0 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-xl hover:bg-surface2 transition-colors"
        aria-label={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
      >
        <Heart
          size={20}
          className={clsx(
            'transition-colors',
            isFavorite ? 'fill-pink text-pink' : 'text-muted',
          )}
        />
      </button>
    </div>
  );
};
