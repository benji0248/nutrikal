import { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { generateId } from '../../utils/dateHelpers';
import type { Meal } from '../../types';

interface MealFormProps {
  editingMeal?: Meal | null;
  onSubmit: (meal: Meal) => void;
  onCancel: () => void;
}

export function MealForm({ editingMeal, onSubmit, onCancel }: MealFormProps) {
  const [name, setName] = useState(editingMeal?.name ?? '');
  const [calories, setCalories] = useState(editingMeal?.calories?.toString() ?? '');
  const [notes, setNotes] = useState(editingMeal?.notes ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      id: editingMeal?.id ?? generateId(),
      name: name.trim(),
      calories: calories ? Number(calories) : undefined,
      notes: notes.trim() || undefined,
      linkedRecipeId: editingMeal?.linkedRecipeId,
      entries: editingMeal?.entries,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Nombre *"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ej: Avena con frutas"
        required
      />
      <Input
        label="Calorías"
        type="number"
        value={calories}
        onChange={(e) => setCalories(e.target.value)}
        placeholder="kcal (opcional)"
        min={0}
      />
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5 font-body">
          Notas
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas adicionales..."
          rows={2}
          className="w-full px-4 py-3 bg-surface2 rounded-2xl text-sm font-body text-text-primary placeholder-muted border border-border focus:border-accent focus:ring-1 focus:ring-accent/40 outline-none transition-all resize-none min-h-[60px]"
          aria-label="Notas de la comida"
        />
      </div>
      <div className="flex gap-3 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel} fullWidth>
          Cancelar
        </Button>
        <Button type="submit" fullWidth disabled={!name.trim()}>
          {editingMeal ? 'Guardar' : 'Agregar'}
        </Button>
      </div>
    </form>
  );
}
