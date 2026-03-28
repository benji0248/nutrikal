import { useState, useMemo } from 'react';
import { Plus, Trash2, Edit3, ChevronDown, ChevronUp, Calculator, List } from 'lucide-react';
import { useCalendarStore } from '../../store/useCalendarStore';
import { MealForm } from './MealForm';
import { CalorieCalculator } from '../calculator/CalorieCalculator';
import { BottomSheet } from '../ui/BottomSheet';
import { Modal } from '../ui/Modal';
import { MEAL_TYPE_LABELS } from '../../types';
import type { Meal, MealType } from '../../types';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useIngredientsStore } from '../../store/useIngredientsStore';
import { INGREDIENTS_DB } from '../../data/ingredients';
import { DISHES_DB } from '../../data/dishes';
import { getMealCalories } from '../../utils/macroHelpers';
import { gramsToHumanPortion, getDishHumanIngredients } from '../../utils/portionHelpers';

interface MealSlotProps {
  date: string;
  mealType: MealType;
  meals: Meal[];
}

const MEAL_ICONS: Record<MealType, string> = {
  desayuno: '🌅',
  almuerzo: '☀️',
  cena: '🌙',
  snack: '🍎',
};

export function MealSlot({ date, mealType, meals }: MealSlotProps) {
  const [expanded, setExpanded] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showCalc, setShowCalc] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [expandedMealId, setExpandedMealId] = useState<string | null>(null);
  const showCalories = useSettingsStore((s) => s.showCalories);
  const customIngredients = useIngredientsStore((s) => s.customIngredients);
  const allIngredients = useMemo(() => [...INGREDIENTS_DB, ...customIngredients], [customIngredients]);
  const upsertMeal = useCalendarStore((s) => s.upsertMeal);
  const deleteMeal = useCalendarStore((s) => s.deleteMeal);

  const totalCals = meals.reduce((sum, m) => sum + (getMealCalories(m, allIngredients) ?? 0), 0);

  const handleMealSubmit = (meal: Meal) => {
    upsertMeal(date, mealType, meal);
    setShowForm(false);
    setEditingMeal(null);
  };

  const formContent = (
    <MealForm
      editingMeal={editingMeal}
      onSubmit={handleMealSubmit}
      onCancel={() => {
        setShowForm(false);
        setEditingMeal(null);
      }}
    />
  );

  const calcContent = (
    <CalorieCalculator
      targetDate={date}
      targetMealType={mealType}
      onSentToMeal={() => setShowCalc(false)}
    />
  );

  return (
    <div className="bg-surface2/40 backdrop-blur-sm rounded-2xl border border-border/40 overflow-hidden transition-all">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface2/60 transition-colors min-h-[48px]"
        aria-label={`${MEAL_TYPE_LABELS[mealType]}: ${meals.length} comidas`}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-base">{MEAL_ICONS[mealType]}</span>
          <span className="font-body font-medium text-sm text-text-primary">
            {MEAL_TYPE_LABELS[mealType]}
          </span>
          {meals.length > 0 && (
            <span className="text-xs text-muted bg-surface px-2 py-0.5 rounded-lg font-mono">
              {meals.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {showCalories && totalCals > 0 && (
            <span className="text-xs font-mono text-accent">{totalCals} kcal</span>
          )}
          {expanded ? (
            <ChevronUp size={16} className="text-muted" />
          ) : (
            <ChevronDown size={16} className="text-muted" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-2">
          {meals.map((meal) => {
            const hasIngredients = !!(meal.entries?.length || meal.linkedRecipeId);
            const isMealExpanded = expandedMealId === meal.id;

            return (
              <div key={meal.id} className="bg-surface/50 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2.5 group">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {hasIngredients && (
                      <button
                        onClick={() => setExpandedMealId(isMealExpanded ? null : meal.id)}
                        className="p-1 rounded-lg hover:bg-surface2 transition-colors flex-shrink-0"
                        aria-label={isMealExpanded ? 'Ocultar ingredientes' : 'Ver ingredientes'}
                      >
                        <List size={14} className={isMealExpanded ? 'text-accent' : 'text-muted'} />
                      </button>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-body text-text-primary truncate">{meal.name}</p>
                      {showCalories && getMealCalories(meal, allIngredients) !== undefined && (
                        <span className="text-[10px] font-mono text-muted">{getMealCalories(meal, allIngredients)} kcal</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setEditingMeal(meal);
                        setShowForm(true);
                      }}
                      className="p-2 rounded-lg hover:bg-surface2 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
                      aria-label={`Editar ${meal.name}`}
                    >
                      <Edit3 size={14} className="text-muted" />
                    </button>
                    <button
                      onClick={() => deleteMeal(date, mealType, meal.id)}
                      className="p-2 rounded-lg hover:bg-red-500/10 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
                      aria-label={`Eliminar ${meal.name}`}
                    >
                      <Trash2 size={14} className="text-red-400" />
                    </button>
                  </div>
                </div>

                {isMealExpanded && hasIngredients && (
                  <MealIngredients meal={meal} allIngredients={allIngredients} />
                )}
              </div>
            );
          })}

          <div className="flex gap-2">
            <button
              onClick={() => {
                setEditingMeal(null);
                setShowForm(true);
              }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-border hover:border-accent/40 hover:bg-accent/5 transition-all text-muted hover:text-accent min-h-[48px]"
              aria-label={`Agregar comida a ${MEAL_TYPE_LABELS[mealType]}`}
            >
              <Plus size={16} />
              <span className="text-xs font-body font-medium">Agregar</span>
            </button>
            {showCalories && (
              <button
                onClick={() => setShowCalc(true)}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-border hover:border-accent/40 hover:bg-accent/5 transition-all text-muted hover:text-accent min-h-[48px]"
                aria-label="Calculadora"
              >
                <Calculator size={16} />
                <span className="text-xs font-body font-medium hidden sm:inline">Calcular</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Meal form */}
      <BottomSheet
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingMeal(null); }}
        title={editingMeal ? 'Editar comida' : 'Agregar comida'}
      >
        {formContent}
      </BottomSheet>
      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingMeal(null); }}
        title={editingMeal ? 'Editar comida' : 'Agregar comida'}
      >
        {formContent}
      </Modal>

      {/* Calculator */}
      <BottomSheet
        isOpen={showCalc}
        onClose={() => setShowCalc(false)}
        title="Calculadora"
        snap="full"
      >
        {calcContent}
      </BottomSheet>
      <Modal
        isOpen={showCalc}
        onClose={() => setShowCalc(false)}
        title="Calculadora"
      >
        {calcContent}
      </Modal>
    </div>
  );
}

function MealIngredients({ meal, allIngredients }: { meal: Meal; allIngredients: import('../../types').Ingredient[] }) {
  const ingredients = useMemo(() => {
    // If linked to a dish, use dish ingredients with human portions
    if (meal.linkedRecipeId) {
      const dish = DISHES_DB.find((d) => d.id === meal.linkedRecipeId);
      if (dish) {
        // Detect servings from meal name (e.g. "Dish (x2)" → 2)
        const servingsMatch = meal.name.match(/\(x([\d.]+)\)$/);
        const servings = servingsMatch ? parseFloat(servingsMatch[1]) : dish.defaultServings;
        return getDishHumanIngredients(dish, servings, allIngredients);
      }
    }

    // Fallback: use entries directly
    if (meal.entries?.length) {
      return meal.entries.map((entry) => {
        const ing = allIngredients.find((i) => i.id === entry.ingredientId);
        return {
          name: ing?.name ?? entry.ingredientId,
          humanPortion: gramsToHumanPortion(entry.ingredientId, entry.grams, ing),
        };
      });
    }

    return [];
  }, [meal, allIngredients]);

  if (ingredients.length === 0) return null;

  return (
    <div className="px-3 pb-3 pt-1 border-t border-border/20">
      <ul className="space-y-1">
        {ingredients.map((ing, idx) => (
          <li key={idx} className="flex items-baseline justify-between gap-2 text-xs font-body">
            <span className="text-text-primary">{ing.name}</span>
            <span className="text-muted flex-shrink-0">{ing.humanPortion}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
