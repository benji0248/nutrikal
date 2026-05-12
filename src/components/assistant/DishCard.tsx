import { Clock, ChefHat, RefreshCw, PlusCircle } from 'lucide-react';
import type { HydratedAiDish } from '../../types';

interface DishCardProps {
  dish: HydratedAiDish;
  onApply?: (dish: HydratedAiDish) => void;
  onRegenerate?: () => void;
  chatBusy?: boolean;
}

export const DishCard = ({ dish, onApply, onRegenerate, chatBusy = false }: DishCardProps) => {
  return (
    <div className="flex mr-8 items-start gap-3 animate-fade-in">
      <div className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center flex-shrink-0 text-white">
        <ChefHat size={16} />
      </div>
      <div className="rounded-2xl bg-[var(--surface2)] border border-[var(--border)] shadow-sm overflow-hidden flex-1">
        <div className="px-5 py-4 space-y-3">
          <h3 className="font-sans text-base font-bold text-[var(--text-primary)]">
            {dish.name}
          </h3>

          <div className="space-y-1">
            <p className="font-sans text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
              Ingredientes
            </p>
            <ul className="space-y-0.5">
              {dish.humanIngredients.map((ing, idx) => (
                <li
                  key={idx}
                  className="font-body text-sm text-[var(--text-primary)] flex justify-between"
                >
                  <span>{ing.name}</span>
                  <span className="text-[var(--text-muted)] ml-3 shrink-0">
                    {ing.humanPortion}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {dish.preparation && (
            <div className="space-y-1">
              <p className="font-sans text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                Preparación
              </p>
              <p className="font-body text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
                {dish.preparation}
              </p>
            </div>
          )}

          {dish.tip && (
            <div className="bg-[var(--amber)]/10 border border-[var(--amber)]/20 rounded-xl px-3 py-2">
              <p className="font-body text-xs text-[var(--text-primary)]">
                {dish.tip}
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <Clock size={14} />
            <span>{dish.prepMinutes} min</span>
          </div>
        </div>

        <div className="flex border-t border-[var(--border)]">
          {onApply && (
            <button
              type="button"
              onClick={() => onApply(dish)}
              disabled={chatBusy}
              className="flex-1 flex items-center justify-center gap-2 min-h-[48px] font-body text-sm font-semibold text-[var(--accent)] hover:bg-[var(--accent)]/5 active:scale-[0.98] transition-all disabled:opacity-40"
            >
              <PlusCircle size={18} />
              Agregar al calendario
            </button>
          )}
          {onRegenerate && (
            <button
              type="button"
              onClick={onRegenerate}
              disabled={chatBusy}
              className="flex-1 flex items-center justify-center gap-2 min-h-[48px] font-body text-sm text-[var(--text-muted)] hover:bg-[var(--surface)] active:scale-[0.98] transition-all disabled:opacity-40 border-l border-[var(--border)]"
            >
              <RefreshCw size={16} />
              Regenerar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
