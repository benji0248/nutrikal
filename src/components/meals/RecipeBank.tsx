import { useState } from 'react';
import { Search, Plus, Star, Trash2, Edit3 } from 'lucide-react';
import { clsx } from 'clsx';
import { useCalendarStore } from '../../store/useCalendarStore';
import { generateId } from '../../utils/dateHelpers';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import type { Meal } from '../../types';

const PRESET_TAGS = ['vegetariano', 'rápido', 'proteico', 'bajo en calorías', 'postre', 'preparado'];

export function RecipeBank() {
  const recipeBank = useCalendarStore((s) => s.recipeBank);
  const addRecipe = useCalendarStore((s) => s.addRecipe);
  const removeRecipe = useCalendarStore((s) => s.removeRecipe);
  const updateRecipe = useCalendarStore((s) => s.updateRecipe);
  const toggleFavorite = useCalendarStore((s) => s.toggleFavorite);

  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Meal | null>(null);
  const [filterFavorites, setFilterFavorites] = useState(false);

  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  const filtered = recipeBank.meals
    .filter((m) => {
      if (filterFavorites && !recipeBank.favorites.includes(m.id)) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        m.name.toLowerCase().includes(q) ||
        m.tags?.some((t) => t.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      const aFav = recipeBank.favorites.includes(a.id) ? 0 : 1;
      const bFav = recipeBank.favorites.includes(b.id) ? 0 : 1;
      return aFav - bFav;
    });

  const resetForm = () => {
    setName('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFat('');
    setNotes('');
    setTags([]);
  };

  const openEdit = (meal: Meal) => {
    setEditingRecipe(meal);
    setName(meal.name);
    setCalories(meal.calories?.toString() ?? '');
    setProtein(meal.protein?.toString() ?? '');
    setCarbs(meal.carbs?.toString() ?? '');
    setFat(meal.fat?.toString() ?? '');
    setNotes(meal.notes ?? '');
    setTags(meal.tags ?? []);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const mealData: Omit<Meal, 'id'> = {
      name: name.trim(),
      calories: calories ? Number(calories) : undefined,
      protein: protein ? Number(protein) : undefined,
      carbs: carbs ? Number(carbs) : undefined,
      fat: fat ? Number(fat) : undefined,
      notes: notes.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
    };

    if (editingRecipe) {
      updateRecipe(editingRecipe.id, mealData);
    } else {
      addRecipe({ ...mealData, id: generateId() });
    }
    setShowForm(false);
    setEditingRecipe(null);
    resetForm();
  };

  const toggleTag = (tag: string) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-bold text-text-primary">Recetas</h2>
        <Button
          size="sm"
          icon={<Plus size={16} />}
          onClick={() => {
            resetForm();
            setEditingRecipe(null);
            setShowForm(true);
          }}
        >
          Nueva
        </Button>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar recetas..."
            className="w-full pl-9 pr-4 py-2.5 bg-surface-elevated rounded-xl text-sm text-text-primary placeholder-text-secondary border border-border focus:border-accent focus:ring-1 focus:ring-accent/50 outline-none transition-all min-h-[48px]"
            aria-label="Buscar recetas"
          />
        </div>
        <button
          onClick={() => setFilterFavorites(!filterFavorites)}
          className={clsx(
            'p-3 rounded-xl border transition-all min-w-[48px] min-h-[48px] flex items-center justify-center',
            filterFavorites
              ? 'bg-warning/10 border-warning/30 text-warning'
              : 'bg-surface-elevated border-border text-text-secondary hover:text-text-primary',
          )}
          aria-label={filterFavorites ? 'Mostrar todas' : 'Solo favoritas'}
        >
          <Star size={18} fill={filterFavorites ? 'currentColor' : 'none'} />
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-text-secondary text-sm">
            {searchQuery ? 'Sin resultados' : 'No hay recetas guardadas aún'}
          </p>
          <p className="text-text-secondary/60 text-xs mt-1">
            Agrega tu primera receta para empezar
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((recipe) => {
            const isFav = recipeBank.favorites.includes(recipe.id);
            return (
              <div
                key={recipe.id}
                className="bg-surface-elevated/50 backdrop-blur-sm rounded-xl border border-border/50 p-4 group transition-all duration-200 hover:border-border"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-text-primary truncate">{recipe.name}</h3>
                    {(recipe.calories !== undefined || recipe.protein !== undefined) && (
                      <div className="flex gap-3 mt-1">
                        {recipe.calories !== undefined && (
                          <span className="text-xs font-mono text-text-secondary">
                            {recipe.calories} kcal
                          </span>
                        )}
                        {recipe.protein !== undefined && (
                          <span className="text-xs font-mono text-accent-secondary">
                            P: {recipe.protein}g
                          </span>
                        )}
                        {recipe.carbs !== undefined && (
                          <span className="text-xs font-mono text-warning">
                            C: {recipe.carbs}g
                          </span>
                        )}
                        {recipe.fat !== undefined && (
                          <span className="text-xs font-mono text-success">
                            G: {recipe.fat}g
                          </span>
                        )}
                      </div>
                    )}
                    {recipe.tags && recipe.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {recipe.tags.map((tag) => (
                          <Badge key={tag} variant="accent">{tag}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleFavorite(recipe.id)}
                      className="p-2 rounded-lg hover:bg-surface transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
                      aria-label={isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                    >
                      <Star
                        size={16}
                        className={isFav ? 'text-warning' : 'text-text-secondary'}
                        fill={isFav ? 'currentColor' : 'none'}
                      />
                    </button>
                    <button
                      onClick={() => openEdit(recipe)}
                      className="p-2 rounded-lg hover:bg-surface transition-colors opacity-0 group-hover:opacity-100 min-w-[40px] min-h-[40px] flex items-center justify-center"
                      aria-label={`Editar ${recipe.name}`}
                    >
                      <Edit3 size={14} className="text-text-secondary" />
                    </button>
                    <button
                      onClick={() => removeRecipe(recipe.id)}
                      className="p-2 rounded-lg hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100 min-w-[40px] min-h-[40px] flex items-center justify-center"
                      aria-label={`Eliminar ${recipe.name}`}
                    >
                      <Trash2 size={14} className="text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingRecipe(null);
          resetForm();
        }}
        title={editingRecipe ? 'Editar receta' : 'Nueva receta'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="recipe-name" className="block text-sm font-medium text-text-primary mb-1.5">
              Nombre *
            </label>
            <input
              id="recipe-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Ensalada César"
              required
              className="w-full px-4 py-3 bg-surface-elevated rounded-xl text-sm text-text-primary placeholder-text-secondary border border-border focus:border-accent focus:ring-1 focus:ring-accent/50 outline-none transition-all min-h-[48px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="recipe-cal" className="block text-xs font-medium text-text-secondary mb-1">
                Calorías
              </label>
              <input
                id="recipe-cal"
                type="number"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                placeholder="kcal"
                min="0"
                className="w-full px-3 py-2.5 bg-surface-elevated rounded-xl text-sm font-mono text-text-primary placeholder-text-secondary border border-border focus:border-accent focus:ring-1 focus:ring-accent/50 outline-none transition-all min-h-[48px]"
              />
            </div>
            <div>
              <label htmlFor="recipe-prot" className="block text-xs font-medium text-text-secondary mb-1">
                Proteína (g)
              </label>
              <input
                id="recipe-prot"
                type="number"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                placeholder="g"
                min="0"
                className="w-full px-3 py-2.5 bg-surface-elevated rounded-xl text-sm font-mono text-text-primary placeholder-text-secondary border border-border focus:border-accent focus:ring-1 focus:ring-accent/50 outline-none transition-all min-h-[48px]"
              />
            </div>
            <div>
              <label htmlFor="recipe-carbs" className="block text-xs font-medium text-text-secondary mb-1">
                Carbohidratos (g)
              </label>
              <input
                id="recipe-carbs"
                type="number"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
                placeholder="g"
                min="0"
                className="w-full px-3 py-2.5 bg-surface-elevated rounded-xl text-sm font-mono text-text-primary placeholder-text-secondary border border-border focus:border-accent focus:ring-1 focus:ring-accent/50 outline-none transition-all min-h-[48px]"
              />
            </div>
            <div>
              <label htmlFor="recipe-fat" className="block text-xs font-medium text-text-secondary mb-1">
                Grasas (g)
              </label>
              <input
                id="recipe-fat"
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
                <button key={tag} type="button" onClick={() => toggleTag(tag)} className="min-h-[36px]">
                  <Badge variant={tags.includes(tag) ? 'accent' : 'default'}>{tag}</Badge>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="recipe-notes" className="block text-xs font-medium text-text-secondary mb-1">
              Notas
            </label>
            <textarea
              id="recipe-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Instrucciones, variaciones..."
              rows={2}
              className="w-full px-4 py-3 bg-surface-elevated rounded-xl text-sm text-text-primary placeholder-text-secondary border border-border focus:border-accent focus:ring-1 focus:ring-accent/50 outline-none transition-all resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowForm(false);
                setEditingRecipe(null);
                resetForm();
              }}
              fullWidth
            >
              Cancelar
            </Button>
            <Button type="submit" fullWidth disabled={!name.trim()}>
              {editingRecipe ? 'Guardar' : 'Agregar'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
