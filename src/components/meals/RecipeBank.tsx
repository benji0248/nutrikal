import { useState, useMemo } from 'react';
import { Send, Clock, Users } from 'lucide-react';
import { clsx } from 'clsx';
import { useCalendarStore } from '../../store/useCalendarStore';
import { useIngredientsStore } from '../../store/useIngredientsStore';
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
import {
  MEAL_TYPE_LABELS,
  MEAL_TYPE_ORDER,
  DISH_CATEGORY_LABELS,
} from '../../types';
import type { Dish, DishCategory, MealType, Ingredient } from '../../types';

const CATEGORY_FILTERS: { value: DishCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'Todas' },
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

  const allIngredients: Ingredient[] = useMemo(
    () => [...INGREDIENTS_DB, ...customIngredients],
    [customIngredients],
  );

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<DishCategory | 'all'>('all');
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [sendingDish, setSendingDish] = useState<Dish | null>(null);
  const [sendDate, setSendDate] = useState(currentDate);
  const [sendMealType, setSendMealType] = useState<MealType>('almuerzo');

  const filtered = useMemo(() => {
    let dishes = DISHES_DB;
    if (categoryFilter !== 'all') {
      dishes = dishes.filter((d) => d.category === categoryFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      dishes = dishes.filter((d) => d.name.toLowerCase().includes(q));
    }
    return dishes;
  }, [search, categoryFilter]);

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
      </div>

      {selectedDish.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedDish.tags.map((tag) => (
            <Badge key={tag} variant="default">{tag.replace('_', ' ')}</Badge>
          ))}
        </div>
      )}

      <div>
        <h4 className="text-sm font-body font-medium text-text-primary mb-2">Ingredientes</h4>
        <ul className="space-y-1.5">
          {getDishHumanIngredients(selectedDish, allIngredients).map((item) => (
            <li key={item.name} className="text-sm font-body text-muted flex justify-between">
              <span>{item.name}</span>
              <span className="text-text-primary">{item.humanPortion}</span>
            </li>
          ))}
        </ul>
      </div>

      <Button
        icon={<Send size={16} />}
        onClick={() => { setSendingDish(selectedDish); setSelectedDish(null); }}
        fullWidth
      >
        Agregar al calendario
      </Button>
    </div>
  ) : null;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-heading font-bold text-text-primary">Recetas</h2>

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
              <h3 className="text-sm font-body font-medium text-text-primary leading-snug">{dish.name}</h3>
              <div className="flex items-center gap-2 text-muted">
                <span className="text-[10px] font-body">{dish.prepMinutes} min</span>
                <span className="text-[10px] font-body">·</span>
                <span className="text-[10px] font-body">{dish.humanPortion}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                <Badge variant="accent">{DISH_CATEGORY_LABELS[dish.category]}</Badge>
                {dish.tags.slice(0, 2).map((tag) => (
                  <Badge key={tag} variant="default">{tag.replace('_', ' ')}</Badge>
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
    </div>
  );
}
