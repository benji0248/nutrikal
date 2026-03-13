import { useState } from 'react';
import { clsx } from 'clsx';
import type { Dish, DishCategory, DishTag, Ingredient } from '../../types';
import { DISH_CATEGORY_LABELS } from '../../types';
import { Input } from '../ui/Input';
import { DishCard } from './DishCard';
import { matchDishes } from '../../services/dishMatchService';

interface DishSearchProps {
  dishes: Dish[];
  allIngredients: Ingredient[];
  onSelectDish: (dish: Dish) => void;
}

const QUICK_TAGS: { tag: DishTag; label: string }[] = [
  { tag: 'rapido', label: 'Rápido' },
  { tag: 'liviano', label: 'Liviano' },
  { tag: 'alto_proteina', label: 'Proteico' },
  { tag: 'economico', label: 'Económico' },
  { tag: 'vegetariano', label: 'Vegetariano' },
  { tag: 'comfort', label: 'Comfort' },
];

const CATEGORIES: DishCategory[] = ['desayuno', 'almuerzo', 'cena', 'snack', 'postre'];

export function DishSearch({ dishes, allIngredients, onSelectDish }: DishSearchProps) {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DishCategory | null>(null);
  const [selectedTags, setSelectedTags] = useState<DishTag[]>([]);

  const toggleTag = (tag: DishTag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const filtered = matchDishes(dishes, allIngredients, {
    category: selectedCategory ?? undefined,
    tags: selectedTags.length > 0 ? selectedTags : undefined,
    searchQuery: query || undefined,
  });

  return (
    <div className="space-y-4">
      <Input
        variant="search"
        placeholder="Buscar plato..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        clearable
        onClear={() => setQuery('')}
      />

      {/* Category pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
            className={clsx(
              'px-3 py-1.5 rounded-xl text-xs font-body font-medium whitespace-nowrap border transition-all',
              selectedCategory === cat
                ? 'bg-accent/15 text-accent border-accent/30'
                : 'bg-surface2/30 text-muted border-border hover:text-text-primary',
            )}
          >
            {DISH_CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Tag pills */}
      <div className="flex gap-1.5 flex-wrap">
        {QUICK_TAGS.map(({ tag, label }) => (
          <button
            key={tag}
            type="button"
            onClick={() => toggleTag(tag)}
            className={clsx(
              'px-2.5 py-1 rounded-lg text-[11px] font-body font-medium border transition-all',
              selectedTags.includes(tag)
                ? 'bg-accent/10 text-accent border-accent/30'
                : 'bg-surface2/20 text-muted border-transparent hover:text-text-primary',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="text-sm font-body text-muted text-center py-6">
            No se encontraron platos con esos filtros
          </p>
        ) : (
          filtered.map((dish) => (
            <DishCard key={dish.id} dish={dish} onClick={onSelectDish} compact />
          ))
        )}
      </div>
    </div>
  );
}
