import { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useIngredientsStore } from '../../store/useIngredientsStore';
import { ALL_CATEGORIES, CATEGORY_LABELS } from '../../types';
import type { IngredientCategory } from '../../types';

interface AddCustomIngredientProps {
  onClose: () => void;
}

export function AddCustomIngredient({ onClose }: AddCustomIngredientProps) {
  const addCustom = useIngredientsStore((s) => s.addCustomIngredient);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<IngredientCategory>('otros');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  const valid =
    name.trim() !== '' &&
    calories !== '' &&
    protein !== '' &&
    carbs !== '' &&
    fat !== '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    addCustom({
      name: name.trim(),
      category,
      calories: Number(calories),
      protein: Number(protein),
      carbs: Number(carbs),
      fat: Number(fat),
    });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Nombre *"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ej: Granola casera"
        required
      />

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5 font-body">
          Categoría *
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as IngredientCategory)}
          className="w-full bg-surface2 text-text-primary border border-border rounded-2xl px-4 py-3 min-h-[48px] font-body text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/40"
          aria-label="Categoría"
        >
          {ALL_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {CATEGORY_LABELS[cat]}
            </option>
          ))}
        </select>
      </div>

      <p className="text-xs text-muted font-body">Valores por cada 100g</p>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Calorías *"
          type="number"
          value={calories}
          onChange={(e) => setCalories(e.target.value)}
          placeholder="kcal"
          min={0}
          required
        />
        <Input
          label="Proteína *"
          type="number"
          value={protein}
          onChange={(e) => setProtein(e.target.value)}
          placeholder="g"
          min={0}
          step="0.1"
          required
        />
        <Input
          label="Carbohidratos *"
          type="number"
          value={carbs}
          onChange={(e) => setCarbs(e.target.value)}
          placeholder="g"
          min={0}
          step="0.1"
          required
        />
        <Input
          label="Grasas *"
          type="number"
          value={fat}
          onChange={(e) => setFat(e.target.value)}
          placeholder="g"
          min={0}
          step="0.1"
          required
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onClose} fullWidth>
          Cancelar
        </Button>
        <Button type="submit" fullWidth disabled={!valid}>
          Agregar
        </Button>
      </div>
    </form>
  );
}
