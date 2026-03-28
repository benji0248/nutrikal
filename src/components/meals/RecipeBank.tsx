import { useState, useMemo } from 'react';
import { Send, Clock, Users, Plus, Pencil, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { useCalendarStore } from '../../store/useCalendarStore';
import { useIngredientsStore } from '../../store/useIngredientsStore';
import { useRecipesStore } from '../../store/useRecipesStore';
import { useAuthStore } from '../../store/useAuthStore';
import { INGREDIENTS_DB } from '../../data/ingredients';
import { DISHES_DB } from '../../data/dishes';
import { getDishHumanIngredients } from '../../utils/portionHelpers';
import { generateId } from '../../utils/dateHelpers';
import { computeDishMacros } from '../../services/dishMatchService';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { BottomSheet } from '../ui/BottomSheet';
import { Modal } from '../ui/Modal';
import { RecipeForm } from './RecipeForm';
import {
  MEAL_TYPE_LABELS,
  MEAL_TYPE_ORDER,
  DISH_CATEGORY_LABELS,
} from '../../types';
import type { Dish, DishCategory, MealType, Ingredient } from '../../types';

type FilterValue = DishCategory | 'all' | 'custom';

const CATEGORY_FILTERS: { value: FilterValue; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'custom', label: 'Mis recetas' },
  { value: 'desayuno', label: 'Desayuno' },
  { value: 'almuerzo', label: 'Almuerzo' },
  { value: 'cena', label: 'Cena' },
  { value: 'snack', label: 'Snack' },
  { value: 'postre', label: 'Postre' },
];

export function RecipeBank() {
  const upsertMeal = useCalendarStore((s) => s.upsertMeal);
  const currentDate = useCalendarStore((s) => s.currentDate);
  const customIngredients = useIngredientsStore((s) => s.customIngredients);
  const customDishes = useRecipesStore((s) => s.customDishes);
  const addDish = useRecipesStore((s) => s.addDish);
  const updateDish = useRecipesStore((s) => s.updateDish);
  const deleteDish = useRecipesStore((s) => s.deleteDish);
  const userId = useAuthStore((s) => s.user?.id);

  const allIngredients: Ingredient[] = useMemo(
    () => [...INGREDIENTS_DB, ...customIngredients],
    [customIngredients],
  );

  const allDishes: Dish[] = useMemo(
    () => [...DISHES_DB, ...customDishes],
    [customDishes],
  );

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<FilterValue>('all');
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [sendingDish, setSendingDish] = useState<Dish | null>(null);
  const [sendDate, setSendDate] = useState(currentDate);
  const [sendMealType, setSendMealType] = useState<MealType>('almuerzo');
  const [showRecipeForm, setShowRecipeForm] = useState(false);
  const [editingDish, setEditingDish] = useState<Dish | undefined>(undefined);
  const [deletingDish, setDeletingDish] = useState<Dish | null>(null);

  const isOwner = (dish: Dish) =>
    dish.isCustom === true && dish.createdBy === userId;

  const filtered = useMemo(() => {
    let dishes = allDishes;
    if (categoryFilter === 'custom') {
      dishes = dishes.filter((d) => d.isCustom);
    } else if (categoryFilter !== 'all') {
      dishes = dishes.filter((d) => d.category === categoryFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      dishes = dishes.filter((d) => d.name.toLowerCase().includes(q));
    }
    return dishes;
  }, [search, categoryFilter, allDishes]);

  const handleSend = () => {
    if (!sendingDish) return;
    const macros = computeDishMacros(sendingDish, allIngredients);
    upsertMeal(sendDate, sendMealType, {
      id: generateId(),
      name: sendingDish.name,
      calories: Math.round(macros.calories),
      entries: sendingDish.ingredients.map((ing) => ({
        ingredientId: ing.ingredientId,
        grams: ing.grams,
      })),
    });
    setSendingDish(null);
  };

  const handleCreateRecipe = (data: Omit<Dish, 'id' | 'isCustom' | 'createdBy'>) => {
    addDish(data);
    setShowRecipeForm(false);
    setEditingDish(undefined);
  };

  const handleEditRecipe = (data: Omit<Dish, 'id' | 'isCustom' | 'createdBy'>) => {
    if (editingDish) {
      updateDish(editingDish.id, data);
    }
    setShowRecipeForm(false);
    setEditingDish(undefined);
  };

  const handleDeleteConfirm = () => {
    if (deletingDish) {
      deleteDish(deletingDish.id);
      setDeletingDish(null);
      setSelectedDish(null);
    }
  };

  const openEdit = (dish: Dish) => {
    setSelectedDish(null);
    setEditingDish(dish);
    setShowRecipeForm(true);
  };

  const openCreate = () => {
    setEditingDish(undefined);
    setShowRecipeForm(true);
  };

  const sendForm = (
    <div className="space-y-4">
      <p className="text-sm text-muted font-body">
        Agregar <strong className="text-text-primary">{sendingDish?.name}</strong> al calendario
      </p>
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5 font-body">Fecha</label>
        <input
          type="date"
          value={sendDate}
          onChange={(e) => setSendDate(e.target.value)}
          className="w-full bg-surface2 text-text-primary border border-border rounded-2xl px-4 py-3 min-h-[48px] font-body text-sm outline-none focus:border-accent"
          aria-label="Fecha"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5 font-body">Comida</label>
        <div className="grid grid-cols-2 gap-2">
          {MEAL_TYPE_ORDER.map((mt) => (
            <button
              key={mt}
              onClick={() => setSendMealType(mt)}
              className={clsx(
                'px-3 py-2.5 rounded-xl text-sm font-body font-medium transition-colors min-h-[48px]',
                sendMealType === mt ? 'bg-accent text-white' : 'bg-surface2 text-muted hover:text-text-primary',
              )}
              aria-label={MEAL_TYPE_LABELS[mt]}
            >
              {MEAL_TYPE_LABELS[mt]}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => setSendingDish(null)} fullWidth>Cancelar</Button>
        <Button onClick={handleSend} fullWidth>Agregar</Button>
      </div>
    </div>
  );

  const deleteConfirmContent = (
    <div className="space-y-4">
      <p className="text-sm font-body text-muted">
        Vas a eliminar <strong className="text-text-primary">{deletingDish?.name}</strong>. Esta acción no se puede deshacer.
      </p>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => setDeletingDish(null)} fullWidth>
          Dejalo así
        </Button>
        <Button variant="danger" onClick={handleDeleteConfirm} fullWidth>
          Eliminar
        </Button>
      </div>
    </div>
  );

  const detailContent = selectedDish ? (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-muted">
        <div className="flex items-center gap-1.5">
          <Clock size={14} />
          <span className="text-xs font-body">{selectedDish.prepMinutes} min</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users size={14} />
          <span className="text-xs font-body">{selectedDish.defaultServings} {selectedDish.defaultServings === 1 ? 'porción' : 'porciones'}</span>
        </div>
        <Badge variant="accent">{DISH_CATEGORY_LABELS[selectedDish.category]}</Badge>
        {selectedDish.isCustom && <Badge variant="success">Mía</Badge>}
      </div>

      {selectedDish.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedDish.tags.map((tag) => (
            <Badge key={tag} variant="neutral">{tag.replace('_', ' ')}</Badge>
          ))}
        </div>
      )}

      <div>
        <h4 className="text-sm font-body font-medium text-text-primary mb-2">Ingredientes</h4>
        <ul className="space-y-1.5">
          {getDishHumanIngredients(selectedDish, selectedDish.defaultServings, allIngredients).map((item) => (
            <li key={item.name} className="text-sm font-body text-muted flex justify-between">
              <span>{item.name}</span>
              <span className="text-text-primary">{item.humanPortion}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <Button
          icon={<Send size={16} />}
          onClick={() => { setSendingDish(selectedDish); setSelectedDish(null); }}
          fullWidth
        >
          Agregar al calendario
        </Button>

        {isOwner(selectedDish) && (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              icon={<Pencil size={16} />}
              onClick={() => openEdit(selectedDish)}
              fullWidth
            >
              Editar
            </Button>
            <Button
              variant="danger"
              icon={<Trash2 size={16} />}
              onClick={() => { setDeletingDish(selectedDish); setSelectedDish(null); }}
              fullWidth
            >
              Eliminar
            </Button>
          </div>
        )}
      </div>
    </div>
  ) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-heading font-bold text-text-primary">Recetas</h2>
        <Button size="sm" icon={<Plus size={16} />} onClick={openCreate}>
          Nueva
        </Button>
      </div>

      <Input
        variant="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar receta..."
        clearable
        onClear={() => setSearch('')}
      />

      {/* Category filter pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
        {CATEGORY_FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setCategoryFilter(value)}
            className={clsx(
              'shrink-0 px-3 py-1.5 rounded-full text-xs font-body font-medium transition-colors min-h-[36px]',
              categoryFilter === value
                ? 'bg-accent text-white'
                : 'bg-surface2 text-muted hover:text-text-primary',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Results count */}
      <p className="text-xs font-body text-muted">{filtered.length} recetas</p>

      {/* Dish cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted text-sm font-body">Sin resultados</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((dish) => (
            <button
              key={dish.id}
              onClick={() => setSelectedDish(dish)}
              className="bg-surface2/40 backdrop-blur-sm rounded-2xl border border-border/40 p-4 text-left transition-all hover:border-accent/30 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-body font-medium text-text-primary leading-snug">{dish.name}</h3>
                {dish.isCustom && <Badge variant="success" size="sm">Mía</Badge>}
              </div>
              <div className="flex items-center gap-2 text-muted">
                <span className="text-[10px] font-body">{dish.prepMinutes} min</span>
                <span className="text-[10px] font-body">·</span>
                <span className="text-[10px] font-body">{dish.humanPortion}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                <Badge variant="accent">{DISH_CATEGORY_LABELS[dish.category]}</Badge>
                {dish.tags.slice(0, 2).map((tag) => (
                  <Badge key={tag} variant="neutral">{tag.replace('_', ' ')}</Badge>
                ))}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Dish detail */}
      <BottomSheet isOpen={!!selectedDish} onClose={() => setSelectedDish(null)} title={selectedDish?.name ?? ''}>
        {detailContent}
      </BottomSheet>
      <Modal isOpen={!!selectedDish} onClose={() => setSelectedDish(null)} title={selectedDish?.name ?? ''}>
        {detailContent}
      </Modal>

      {/* Send to calendar */}
      <BottomSheet isOpen={!!sendingDish} onClose={() => setSendingDish(null)} title="Agregar al calendario">
        {sendForm}
      </BottomSheet>
      <Modal isOpen={!!sendingDish} onClose={() => setSendingDish(null)} title="Agregar al calendario">
        {sendForm}
      </Modal>

      {/* Delete confirmation */}
      <BottomSheet isOpen={!!deletingDish} onClose={() => setDeletingDish(null)} title="Eliminar receta">
        {deleteConfirmContent}
      </BottomSheet>
      <Modal isOpen={!!deletingDish} onClose={() => setDeletingDish(null)} title="Eliminar receta">
        {deleteConfirmContent}
      </Modal>

      {/* Recipe form */}
      <RecipeForm
        isOpen={showRecipeForm}
        onClose={() => { setShowRecipeForm(false); setEditingDish(undefined); }}
        onSave={editingDish ? handleEditRecipe : handleCreateRecipe}
        existingDish={editingDish}
      />
    </div>
  );
}
