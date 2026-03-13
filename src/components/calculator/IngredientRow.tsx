import { Minus, Plus, Trash2 } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { CATEGORY_LABELS } from '../../types';
import type { Ingredient } from '../../types';
import { computeMacrosForEntry } from '../../utils/macroHelpers';

interface IngredientRowProps {
  ingredient: Ingredient;
  grams: number;
  onUpdateGrams: (grams: number) => void;
  onRemove: () => void;
}

export function IngredientRow({ ingredient, grams, onUpdateGrams, onRemove }: IngredientRowProps) {
  const macros = computeMacrosForEntry(ingredient, grams);

  return (
    <div className="bg-surface2/50 rounded-2xl border border-border/50 p-3 space-y-2 transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-body font-medium text-text-primary truncate">
              {ingredient.name}
            </span>
            <Badge variant="accent" size="sm">
              {CATEGORY_LABELS[ingredient.category]}
            </Badge>
            {ingredient.isCustom && (
              <Badge variant="warning" size="sm">personalizado</Badge>
            )}
          </div>
        </div>
        <button
          onClick={onRemove}
          className="p-2 rounded-xl hover:bg-red-500/10 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center flex-shrink-0"
          aria-label={`Eliminar ${ingredient.name}`}
        >
          <Trash2 size={15} className="text-red-400" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onUpdateGrams(Math.max(0, grams - 5))}
          className="p-2 rounded-xl bg-surface hover:bg-surface2 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
          aria-label="Reducir 5g"
        >
          <Minus size={14} className="text-muted" />
        </button>
        <div className="relative flex-1">
          <input
            type="number"
            value={grams}
            onChange={(e) => onUpdateGrams(Math.max(0, Number(e.target.value)))}
            min={0}
            className="w-full bg-surface text-center text-text-primary font-mono text-sm border border-border rounded-xl py-2 min-h-[40px] outline-none focus:border-accent focus:ring-1 focus:ring-accent/40"
            aria-label={`Gramos de ${ingredient.name}`}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted font-mono">g</span>
        </div>
        <button
          onClick={() => onUpdateGrams(grams + 5)}
          className="p-2 rounded-xl bg-surface hover:bg-surface2 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
          aria-label="Agregar 5g"
        >
          <Plus size={14} className="text-accent" />
        </button>
      </div>

      <div className="flex items-center gap-3 text-[11px] font-mono px-1">
        <span className="text-accent font-medium">{Math.round(macros.calories)} kcal</span>
        <span className="text-green">P: {macros.protein.toFixed(1)}g</span>
        <span className="text-amber">C: {macros.carbs.toFixed(1)}g</span>
        <span className="text-pink">G: {macros.fat.toFixed(1)}g</span>
      </div>
    </div>
  );
}
