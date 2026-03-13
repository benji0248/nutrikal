import { Clock } from 'lucide-react';
import { clsx } from 'clsx';
import type { Dish, DishTag } from '../../types';

interface DishCardProps {
  dish: Dish;
  onClick?: (dish: Dish) => void;
  compact?: boolean;
}

const TAG_LABELS: Partial<Record<DishTag, string>> = {
  rapido: 'Rápido',
  economico: 'Económico',
  alto_proteina: 'Proteico',
  bajo_carb: 'Low carb',
  vegetariano: 'Vegetariano',
  vegano: 'Vegano',
  sin_gluten: 'Sin gluten',
  sin_lactosa: 'Sin lactosa',
  comfort: 'Comfort',
  liviano: 'Liviano',
};

/**
 * Shows dish name + human portion + prep time + tags.
 * NEVER shows calories or macro numbers.
 */
export function DishCard({ dish, onClick, compact }: DishCardProps) {
  return (
    <button
      type="button"
      onClick={() => onClick?.(dish)}
      className={clsx(
        'w-full text-left rounded-2xl border border-border/40 bg-surface2/30 hover:bg-surface2/60 transition-all',
        compact ? 'p-3' : 'p-4',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className={clsx('font-body font-medium text-text-primary', compact ? 'text-sm' : 'text-base')}>
            {dish.name}
          </p>
          <p className="text-xs font-body text-muted mt-0.5">{dish.humanPortion}</p>
        </div>
        {dish.prepMinutes > 0 && (
          <span className="flex items-center gap-1 text-xs font-body text-muted flex-shrink-0">
            <Clock size={12} />
            {dish.prepMinutes}'
          </span>
        )}
      </div>

      {dish.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {dish.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 rounded-md text-[10px] font-body font-medium bg-surface2 text-muted"
            >
              {TAG_LABELS[tag] ?? tag}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}
