import { useState } from 'react';
import { Search, Star } from 'lucide-react';
import type { Meal, MealType } from '../../types';
import { useCalendarStore } from '../../store/useCalendarStore';
import { generateId } from '../../utils/dateHelpers';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface MealFormProps {
  date: string;
  mealType: MealType;
  editingMeal: Meal | null;
  onClose: () => void;
}

const PRESET_TAGS = ['vegetariano', 'rápido', 'proteico', 'bajo en calorías', 'postre', 'preparado'];

export function MealForm({ date, mealType, editingMeal, onClose }: MealFormProps) {
  const addMealToDay = useCalendarStore((s) => s.addMealToDay);
  const updateMealInDay = useCalendarStore((s) => s.updateMealInDay);
  const recipeBank = useCalendarStore((s) => s.recipeBank);

  const [name, setName] = useState(editingMeal?.name ?? '');
  const [calories, setCalories] = useState(editingMeal?.calories?.toString() ?? '');
  const [protein, setProtein] = useState(editingMeal?.protein?.toString() ?? '');
  const [carbs, setCarbs] = useState(editingMeal?.carbs?.toString() ?? '');
  const [fat, setFat] = useState(editingMeal?.fat?.toString() ?? '');
  const [notes, setNotes] = useState(editingMeal?.notes ?? '');
  const [tags, setTags] = useState<string[]>(editingMeal?.tags ?? []);
  const [searchQuery, setSearchQuery] = useState('');
  const [showRecipes, setShowRecipes] = useState(false);

  const filteredRecipes = recipeBank.meals.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const handleSelectRecipe = (meal: Meal) => {
    setName(meal.name);
    setCalories(meal.calories?.toString() ?? '');
    setProtein(meal.protein?.toString() ?? '');
    setCarbs(meal.carbs?.toString() ?? '');
    setFat(meal.fat?.toString() ?? '');
    setNotes(meal.notes ?? '');
    setTags(meal.tags ?? []);
    setShowRecipes(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const mealData: Meal = {
      id: editingMeal?.id ?? generateId(),
      name: name.trim(),
      calories: calories ? Number(calories) : undefined,
      protein: protein ? Number(protein) : undefined,
      carbs: carbs ? Number(carbs) : undefined,
      fat: fat ? Number(fat) : undefined,
      notes: notes.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
    };

    if (editingMeal) {
      updateMealInDay(date, mealType, editingMeal.id, mealData);
    } else {
      addMealToDay(date, mealType, mealData);
    }
    onClose();
  };

  const toggleTag = (tag: string) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!editingMeal && (
        <div>
          <button
            type="button"
            onClick={() => setShowRecipes(!showRecipes)}
            className="text-xs text-accent hover:text-accent/80 transition-colors mb-2 flex items-center gap-1"
          >
            <Star size={12} />
            {showRecipes ? 'Ocultar recetas' : 'Buscar en recetas guardadas'}
          </button>
          {showRecipes && (
            <div className="space-y-2 mb-4 p-3 bg-surface rounded-xl border border-border">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar receta..."
                  className="w-full pl-9 pr-4 py-2.5 bg-surface-elevated rounded-xl text-sm text-text-primary placeholder-text-secondary border border-border focus:border-accent focus:ring-1 focus:ring-accent/50 outline-none transition-all min-h-[48px]"
                  aria-label="Buscar receta"
                />
              </div>
              {filteredRecipes.length > 0 ? (
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {filteredRecipes.map((recipe) => (
                    <button
                      key={recipe.id}
                      type="button"
                      onClick={() => handleSelectRecipe(recipe)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-surface-elevated transition-colors text-sm text-text-primary min-h-[44px]"
                    >
                      <span>{recipe.name}</span>
                      {recipe.calories !== undefined && (
                        <span className="text-xs font-mono text-text-secondary ml-2">
                          {recipe.calories} kcal
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-text-secondary text-center py-2">
                  {searchQuery ? 'Sin resultados' : 'No hay recetas guardadas'}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <div>
        <label htmlFor="meal-name" className="block text-sm font-medium text-text-primary mb-1.5">
          Nombre *
        </label>
        <input
          id="meal-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Avena con frutas"
          required
          className="w-full px-4 py-3 bg-surface-elevated rounded-xl text-sm text-text-primary placeholder-text-secondary border border-border focus:border-accent focus:ring-1 focus:ring-accent/50 outline-none transition-all min-h-[48px]"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="meal-cal" className="block text-xs font-medium text-text-secondary mb-1">
            Calorías
          </label>
          <input
            id="meal-cal"
            type="number"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            placeholder="kcal"
            min="0"
            className="w-full px-3 py-2.5 bg-surface-elevated rounded-xl text-sm font-mono text-text-primary placeholder-text-secondary border border-border focus:border-accent focus:ring-1 focus:ring-accent/50 outline-none transition-all min-h-[48px]"
          />
        </div>
        <div>
          <label htmlFor="meal-prot" className="block text-xs font-medium text-text-secondary mb-1">
            Proteína (g)
          </label>
          <input
            id="meal-prot"
            type="number"
            value={protein}
            onChange={(e) => setProtein(e.target.value)}
            placeholder="g"
            min="0"
            className="w-full px-3 py-2.5 bg-surface-elevated rounded-xl text-sm font-mono text-text-primary placeholder-text-secondary border border-border focus:border-accent focus:ring-1 focus:ring-accent/50 outline-none transition-all min-h-[48px]"
          />
        </div>
        <div>
          <label htmlFor="meal-carbs" className="block text-xs font-medium text-text-secondary mb-1">
            Carbohidratos (g)
          </label>
          <input
            id="meal-carbs"
            type="number"
            value={carbs}
            onChange={(e) => setCarbs(e.target.value)}
            placeholder="g"
            min="0"
            className="w-full px-3 py-2.5 bg-surface-elevated rounded-xl text-sm font-mono text-text-primary placeholder-text-secondary border border-border focus:border-accent focus:ring-1 focus:ring-accent/50 outline-none transition-all min-h-[48px]"
          />
        </div>
        <div>
          <label htmlFor="meal-fat" className="block text-xs font-medium text-text-secondary mb-1">
            Grasas (g)
          </label>
          <input
            id="meal-fat"
            type="number"
            value={fat}
            onChange={(e) => setFat(e.target.value)}
            placeholder="g"
            min="0"
            className="w-full px-3 py-2.5 bg-surface-elevated rounded-xl text-sm font-mono text-text-primary placeholder-text-secondary border border-border focus:border-accent focus:ring-1 focus:ring-accent/50 outline-none transition-all min-h-[48px]"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1.5">Etiquetas</label>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className="min-h-[36px]"
            >
              <Badge variant={tags.includes(tag) ? 'accent' : 'default'}>{tag}</Badge>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="meal-notes" className="block text-xs font-medium text-text-secondary mb-1">
          Notas
        </label>
        <textarea
          id="meal-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas adicionales..."
          rows={2}
          className="w-full px-4 py-3 bg-surface-elevated rounded-xl text-sm text-text-primary placeholder-text-secondary border border-border focus:border-accent focus:ring-1 focus:ring-accent/50 outline-none transition-all resize-none"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onClose} fullWidth>
          Cancelar
        </Button>
        <Button type="submit" fullWidth disabled={!name.trim()}>
          {editingMeal ? 'Guardar cambios' : 'Agregar'}
        </Button>
      </div>
    </form>
  );
}
