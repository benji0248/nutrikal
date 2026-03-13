import { useState, useMemo, useRef } from 'react';
import { Plus } from 'lucide-react';
import { clsx } from 'clsx';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { ALL_CATEGORIES, CATEGORY_LABELS } from '../../types';
import type { Ingredient, IngredientCategory } from '../../types';

interface IngredientSearchProps {
  allIngredients: Ingredient[];
  onSelect: (ingredient: Ingredient) => void;
  onAddCustom: () => void;
}

export function IngredientSearch({ allIngredients, onSelect, onAddCustom }: IngredientSearchProps) {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<IngredientCategory | null>(null);
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    let filtered = allIngredients;
    if (activeCategory) {
      filtered = filtered.filter((i) => i.category === activeCategory);
    }
    if (query.trim()) {
      const q = query.toLowerCase().trim();
      filtered = filtered.filter((i) => i.name.toLowerCase().includes(q));
    }
    return filtered.slice(0, 8);
  }, [allIngredients, query, activeCategory]);

  const handleSelect = (ing: Ingredient) => {
    onSelect(ing);
    setQuery('');
    setShowResults(false);
    inputRef.current?.blur();
  };

  return (
    <div className="space-y-2">
      <Input
        ref={inputRef}
        variant="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setShowResults(true);
        }}
        onFocus={() => setShowResults(true)}
        placeholder="Buscar ingrediente..."
        clearable
        onClear={() => {
          setQuery('');
          setShowResults(false);
        }}
        aria-label="Buscar ingrediente"
      />

      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveCategory(null)}
          className={clsx(
            'px-3 py-1.5 rounded-xl text-xs font-body font-medium whitespace-nowrap transition-colors min-h-[36px]',
            activeCategory === null
              ? 'bg-accent text-white'
              : 'bg-surface2 text-muted hover:text-text-primary',
          )}
          aria-label="Todas las categorías"
        >
          Todas
        </button>
        {ALL_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
            className={clsx(
              'px-3 py-1.5 rounded-xl text-xs font-body font-medium whitespace-nowrap transition-colors min-h-[36px]',
              activeCategory === cat
                ? 'bg-accent text-white'
                : 'bg-surface2 text-muted hover:text-text-primary',
            )}
            aria-label={CATEGORY_LABELS[cat]}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {showResults && (query.trim() || activeCategory) && (
        <div className="bg-surface border border-border rounded-2xl overflow-hidden max-h-72 overflow-y-auto shadow-xl">
          {results.length > 0 ? (
            results.map((ing) => (
              <button
                key={ing.id}
                onClick={() => handleSelect(ing)}
                className="w-full text-left px-4 py-3 hover:bg-surface2 transition-colors flex items-center justify-between gap-2 min-h-[48px] border-b border-border/30 last:border-b-0"
                aria-label={`Agregar ${ing.name}`}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-sm font-body text-text-primary truncate">{ing.name}</span>
                  {ing.isCustom && <Badge variant="warning" size="sm">personalizado</Badge>}
                </div>
                <span className="text-xs font-mono text-muted whitespace-nowrap">
                  {ing.calories} kcal
                </span>
              </button>
            ))
          ) : (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-muted font-body">Sin resultados</p>
            </div>
          )}
          <button
            onClick={() => {
              setShowResults(false);
              onAddCustom();
            }}
            className="w-full text-left px-4 py-3 hover:bg-accent/10 transition-colors flex items-center gap-2 min-h-[48px] text-accent border-t border-border"
            aria-label="Agregar ingrediente personalizado"
          >
            <Plus size={16} />
            <span className="text-sm font-body font-medium">Agregar ingrediente personalizado</span>
          </button>
        </div>
      )}
    </div>
  );
}
