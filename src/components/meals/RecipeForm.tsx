import { useState, useMemo, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { BottomSheet } from '../ui/BottomSheet';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { IngredientSearch } from '../calculator/IngredientSearch';
import { INGREDIENTS_DB } from '../../data/ingredients';
import { useIngredientsStore } from '../../store/useIngredientsStore';
import type { Dish, DishCategory, DishTag, DishIngredient, Ingredient } from '../../types';

interface RecipeFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Dish, 'id' | 'isCustom' | 'createdBy'>) => void;
  existingDish?: Dish;
}

const CATEGORY_OPTIONS: { value: DishCategory; label: string }[] = [
  { value: 'desayuno', label: 'Desayuno' },
  { value: 'almuerzo', label: 'Almuerzo' },
  { value: 'cena', label: 'Cena' },
  { value: 'snack', label: 'Snack' },
  { value: 'postre', label: 'Postre' },
];

const TAG_OPTIONS: { value: DishTag; label: string }[] = [
  { value: 'rapido', label: 'Rápido' },
  { value: 'economico', label: 'Económico' },
  { value: 'alto_proteina', label: 'Alto proteína' },
  { value: 'bajo_carb', label: 'Bajo carb' },
  { value: 'vegetariano', label: 'Vegetariano' },
  { value: 'vegano', label: 'Vegano' },
  { value: 'sin_gluten', label: 'Sin gluten' },
  { value: 'sin_lactosa', label: 'Sin lactosa' },
  { value: 'comfort', label: 'Comfort' },
  { value: 'liviano', label: 'Liviano' },
];

export function RecipeForm({ isOpen, onClose, onSave, existingDish }: RecipeFormProps) {
  const customIngredients = useIngredientsStore((s) => s.customIngredients);
  const allIngredients: Ingredient[] = useMemo(
    () => [...INGREDIENTS_DB, ...customIngredients],
    [customIngredients],
  );

  const [name, setName] = useState(existingDish?.name ?? '');
  const [category, setCategory] = useState<DishCategory>(existingDish?.category ?? 'almuerzo');
  const [prepMinutes, setPrepMinutes] = useState(existingDish?.prepMinutes ?? 30);
  const [humanPortion, setHumanPortion] = useState(existingDish?.humanPortion ?? '1 plato');
  const [tags, setTags] = useState<DishTag[]>(existingDish?.tags ?? []);
  const [ingredients, setIngredients] = useState<DishIngredient[]>(existingDish?.ingredients ?? []);
  const [showIngredientSearch, setShowIngredientSearch] = useState(false);

  const isEditing = !!existingDish;
  const title = isEditing ? 'Editar receta' : 'Nueva receta';

  const canSave = name.trim().length > 0 && ingredients.length > 0;

  const toggleTag = useCallback((tag: DishTag) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }, []);

  const handleAddIngredient = useCallback((ingredient: Ingredient) => {
    setIngredients((prev) => {
      if (prev.some((i) => i.ingredientId === ingredient.id)) return prev;
      return [...prev, { ingredientId: ingredient.id, grams: 100 }];
    });
    setShowIngredientSearch(false);
  }, []);

  const handleUpdateGrams = useCallback((ingredientId: string, grams: number) => {
    setIngredients((prev) =>
      prev.map((i) => (i.ingredientId === ingredientId ? { ...i, grams } : i)),
    );
  }, []);

  const handleRemoveIngredient = useCallback((ingredientId: string) => {
    setIngredients((prev) => prev.filter((i) => i.ingredientId !== ingredientId));
  }, []);

  const getIngredientName = useCallback(
    (id: string) => allIngredients.find((i) => i.id === id)?.name ?? id,
    [allIngredients],
  );

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      name: name.trim(),
      category,
      tags,
      ingredients,
      defaultServings: 1,
      prepMinutes,
      humanPortion: humanPortion.trim() || '1 porción',
    });
    onClose();
  };

  const handleClose = () => {
    onClose();
  };

  const formContent = (
    <div className="space-y-5">
      {/* Name */}
      <Input
        label="Nombre de la receta"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ej: Milanesas con puré"
      />

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2 font-body">Categoría</label>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setCategory(value)}
              className={clsx(
                'px-3 py-2 rounded-xl text-xs font-body font-medium transition-colors min-h-[40px]',
                category === value
                  ? 'bg-accent text-white'
                  : 'bg-surface2 text-muted hover:text-text-primary',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Prep time + portion */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Tiempo (min)"
          type="number"
          value={prepMinutes.toString()}
          onChange={(e) => setPrepMinutes(Math.max(1, Number(e.target.value) || 1))}
          placeholder="30"
        />
        <Input
          label="Porción"
          value={humanPortion}
          onChange={(e) => setHumanPortion(e.target.value)}
          placeholder="1 plato"
        />
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2 font-body">Etiquetas</label>
        <div className="flex flex-wrap gap-1.5">
          {TAG_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => toggleTag(value)}
              className={clsx(
                'px-2.5 py-1.5 rounded-lg text-xs font-body font-medium transition-colors min-h-[36px]',
                tags.includes(value)
                  ? 'bg-accent/15 text-accent'
                  : 'bg-surface2 text-muted hover:text-text-primary',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Ingredients */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-text-primary font-body">Ingredientes</label>
          <button
            type="button"
            onClick={() => setShowIngredientSearch(true)}
            className="flex items-center gap-1 text-accent text-xs font-body font-medium min-h-[36px] px-2"
          >
            <Plus size={14} />
            Agregar
          </button>
        </div>

        {ingredients.length === 0 ? (
          <p className="text-xs text-muted font-body py-4 text-center">
            Agregá al menos un ingrediente
          </p>
        ) : (
          <div className="space-y-2">
            {ingredients.map((ing) => (
              <div
                key={ing.ingredientId}
                className="flex items-center gap-2 bg-surface2/40 rounded-xl px-3 py-2 border border-border/30"
              >
                <span className="text-sm font-body text-text-primary flex-1 truncate">
                  {getIngredientName(ing.ingredientId)}
                </span>
                <input
                  type="number"
                  value={ing.grams}
                  onChange={(e) =>
                    handleUpdateGrams(ing.ingredientId, Math.max(1, Number(e.target.value) || 1))
                  }
                  className="w-16 bg-surface2 text-text-primary border border-border rounded-lg px-2 py-1.5 text-xs font-body text-center outline-none focus:border-accent min-h-[36px]"
                  aria-label={`Gramos de ${getIngredientName(ing.ingredientId)}`}
                />
                <span className="text-xs text-muted font-body">g</span>
                <button
                  type="button"
                  onClick={() => handleRemoveIngredient(ing.ingredientId)}
                  className="p-2 rounded-lg text-muted hover:text-red-400 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                  aria-label={`Eliminar ${getIngredientName(ing.ingredientId)}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Ingredient search inline */}
        {showIngredientSearch && (
          <div className="mt-3 p-3 bg-surface border border-border rounded-2xl">
            <IngredientSearch
              allIngredients={allIngredients}
              onSelect={handleAddIngredient}
              onAddCustom={() => {}}
            />
            <button
              type="button"
              onClick={() => setShowIngredientSearch(false)}
              className="mt-2 w-full text-xs text-muted font-body py-2 min-h-[36px]"
            >
              Cerrar búsqueda
            </button>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button variant="secondary" onClick={handleClose} fullWidth>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={!canSave} fullWidth>
          {isEditing ? 'Guardar cambios' : 'Crear receta'}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <BottomSheet isOpen={isOpen} onClose={handleClose} title={title}>
        {formContent}
      </BottomSheet>
      <Modal isOpen={isOpen} onClose={handleClose} title={title}>
        {formContent}
      </Modal>
    </>
  );
}
