import { Clock } from 'lucide-react';
import { clsx } from 'clsx';
import type { Dish, DishTag, EnergyLevel, Ingredient } from '../../types';
import { PortionAdjuster } from './PortionAdjuster';
import { computeDishMacros } from '../../services/dishMatchService';

interface RecipeCardProps {
  dish: Dish;
  servings: number;
  onServingsChange: (servings: number) => void;
  humanIngredients: Array<{ name: string; humanPortion: string }>;
  energyLevel: EnergyLevel;
  showCalories: boolean;
  allIngredients: Ingredient[];
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

export const RecipeCard = ({
  dish,
  servings,
  onServingsChange,
  humanIngredients,
  energyLevel,
  showCalories,
  allIngredients,
}: RecipeCardProps) => {
  const macros = computeDishMacros(dish, allIngredients);
  const totalCals = Math.round(macros.calories * servings);

  return (
    <div className="bg-surface2/40 rounded-2xl border border-border/40 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-body font-semibold text-text-primary">{dish.name}</h3>
          <p className="text-xs font-body text-muted mt-0.5">{dish.humanPortion}</p>
        </div>
        {dish.prepMinutes > 0 && (
          <span className="flex items-center gap-1 text-xs font-body text-muted flex-shrink-0">
            <Clock size={12} />
            {dish.prepMinutes} min
          </span>
        )}
      </div>

      {dish.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {dish.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-lg text-[10px] font-body font-medium bg-surface2 text-muted"
            >
              {TAG_LABELS[tag] ?? tag}
            </span>
          ))}
        </div>
      )}

      <div className="space-y-1.5">
        <p className="text-xs font-heading font-bold text-text-primary">Ingredientes</p>
        <ul className="space-y-1">
          {humanIngredients.map((ing, idx) => (
            <li key={idx} className="flex items-baseline justify-between gap-2 text-sm font-body">
              <span className="text-text-primary">{ing.name}</span>
              <span className="text-muted text-xs flex-shrink-0">{ing.humanPortion}</span>
            </li>
          ))}
        </ul>
      </div>

      <PortionAdjuster
        servings={servings}
        onServingsChange={onServingsChange}
        energyLevel={energyLevel}
        humanPortion={dish.humanPortion}
      />

      {showCalories && (
        <p className={clsx(
          'text-xs font-body text-center',
          energyLevel === 'green' ? 'text-green' : energyLevel === 'amber' ? 'text-amber' : 'text-warm-orange',
        )}>
          {totalCals} kcal
        </p>
      )}
    </div>
  );
};
