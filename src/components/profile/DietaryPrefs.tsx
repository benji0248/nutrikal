import { useState } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import type { DietaryRestriction, Ingredient } from '../../types';
import { Input } from '../ui/Input';

interface DietaryPrefsProps {
  restrictions: DietaryRestriction[];
  onRestrictionsChange: (restrictions: DietaryRestriction[]) => void;
  dislikedIds: string[];
  onDislikedChange: (ids: string[]) => void;
  allIngredients: Ingredient[];
}

const RESTRICTION_OPTIONS: { value: DietaryRestriction; label: string }[] = [
  { value: 'vegetarian', label: 'Vegetariano' },
  { value: 'vegan', label: 'Vegano' },
  { value: 'gluten_free', label: 'Sin gluten' },
  { value: 'lactose_free', label: 'Sin lactosa' },
  { value: 'low_sodium', label: 'Bajo en sodio' },
  { value: 'diabetic', label: 'Diabético' },
];

export function DietaryPrefs({
  restrictions,
  onRestrictionsChange,
  dislikedIds,
  onDislikedChange,
  allIngredients,
}: DietaryPrefsProps) {
  const [search, setSearch] = useState('');

  const toggleRestriction = (r: DietaryRestriction) => {
    if (restrictions.includes(r)) {
      onRestrictionsChange(restrictions.filter((x) => x !== r));
    } else {
      onRestrictionsChange([...restrictions, r]);
    }
  };

  const removeDisliked = (id: string) => {
    onDislikedChange(dislikedIds.filter((x) => x !== id));
  };

  const addDisliked = (id: string) => {
    if (!dislikedIds.includes(id)) {
      onDislikedChange([...dislikedIds, id]);
    }
    setSearch('');
  };

  const filteredIngredients = search.length >= 2
    ? allIngredients
        .filter((i) => !dislikedIds.includes(i.id))
        .filter((i) =>
          i.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .includes(search.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')),
        )
        .slice(0, 8)
    : [];

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-body font-medium text-text-primary mb-2">
          Restricciones alimentarias
        </p>
        <div className="flex flex-wrap gap-2">
          {RESTRICTION_OPTIONS.map(({ value, label }) => {
            const active = restrictions.includes(value);
            return (
              <button
                key={value}
                type="button"
                onClick={() => toggleRestriction(value)}
                className={clsx(
                  'px-3 py-1.5 rounded-xl text-xs font-body font-medium transition-all border',
                  active
                    ? 'bg-accent/15 text-accent border-accent/30'
                    : 'bg-surface2/30 text-muted border-border hover:text-text-primary',
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-sm font-body font-medium text-text-primary mb-2">
          Alimentos que no te gustan
        </p>

        {dislikedIds.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {dislikedIds.map((id) => {
              const ing = allIngredients.find((i) => i.id === id);
              if (!ing) return null;
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-body bg-red-500/10 text-red-400"
                >
                  {ing.name}
                  <button type="button" onClick={() => removeDisliked(id)} className="hover:text-red-300">
                    <X size={12} />
                  </button>
                </span>
              );
            })}
          </div>
        )}

        <div className="relative">
          <Input
            variant="search"
            placeholder="Buscar ingrediente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            clearable
            onClear={() => setSearch('')}
          />
          {filteredIngredients.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-surface border border-border rounded-2xl shadow-lg max-h-48 overflow-y-auto">
              {filteredIngredients.map((ing) => (
                <button
                  key={ing.id}
                  type="button"
                  onClick={() => addDisliked(ing.id)}
                  className="w-full text-left px-4 py-2.5 text-sm font-body text-text-primary hover:bg-surface2/50 transition-colors first:rounded-t-2xl last:rounded-b-2xl"
                >
                  {ing.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
