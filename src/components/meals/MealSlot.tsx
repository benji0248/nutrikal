import { useState, useMemo } from 'react';
import { Plus, Trash2, Edit3, ChevronDown, ChevronUp, Calculator, List, Coffee, Utensils, Apple, Moon, Camera } from 'lucide-react';
import { clsx } from 'clsx';
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
import { useRecipesStore } from '../../store/useRecipesStore';
import { getMealCalories } from '../../utils/macroHelpers';
import { gramsToHumanPortion, getDishHumanIngredients } from '../../utils/portionHelpers';

interface MealSlotProps {
  date: string;
  mealType: MealType;
  meals: Meal[];
  domId?: string;
}

const MEAL_STYLE: Record<MealType, { icon: React.ReactNode; iconBg: string; iconColor: string; cardClass: string }> = {
  desayuno: {
    icon: <Coffee size={18} />,
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
    cardClass: '',
  },
  almuerzo: {
    icon: <Utensils size={18} />,
    iconBg: 'bg-green-100',
    iconColor: 'text-green-700',
    cardClass: '', // O fondo crema según diseño
  },
  snack: {
    icon: <Apple size={18} />,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-700',
    cardClass: 'border-l-4 border-l-amber-500 rounded-l-md', // Pill a la izquierda
  },
  cena: {
    icon: <Moon size={18} />,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-700',
    cardClass: 'border-l-4 border-l-emerald-600 rounded-l-md', // Pill a la izquierda
  },
};

export function MealSlot({ date, mealType, meals, domId }: MealSlotProps) {
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

  const style = MEAL_STYLE[mealType];

  return (
    <div
      id={domId}
      className={clsx(
        "overflow-hidden rounded-[1.25rem] bg-surface shadow-ambient transition-all",
        style.cardClass
      )}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-4 hover:bg-surface2/60 transition-colors min-h-[56px]"
        aria-label={`${MEAL_TYPE_LABELS[mealType]}: ${meals.length} comidas`}
      >
        <div className="flex items-center gap-3.5">
          <div className={clsx("w-10 h-10 rounded-2xl flex items-center justify-center", style.iconBg, style.iconColor)}>
            {style.icon}
          </div>
          <div className="flex flex-col items-start">
            <span className="font-heading font-bold text-base text-text-primary">
              {MEAL_TYPE_LABELS[mealType]}
            </span>
            {meals.length === 0 ? (
              <span className="text-[11px] font-body text-muted">No registrado</span>
            ) : showCalories && totalCals > 0 && (
              <span className="text-[11px] font-body text-muted">{totalCals} kcal</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronUp size={16} className="text-muted" />
          ) : (
            <ChevronDown size={16} className="text-muted" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {meals.map((meal) => {
            const hasIngredients = !!(meal.aiIngredients?.length || meal.entries?.length || meal.linkedRecipeId);
            const isMealExpanded = expandedMealId === meal.id;

            return (
              <div key={meal.id} className="bg-surface rounded-xl overflow-hidden border border-border/40 shadow-sm relative z-0">
                <div className="flex items-start justify-between px-4 py-3 group">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-full bg-surface2 flex-shrink-0 flex items-center justify-center overflow-hidden border border-border/50">
                       <Apple size={20} className="text-muted/50" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-heading font-bold text-text-primary truncate">{meal.name}</p>
                      <p className="text-[11px] font-body text-muted truncate mt-0.5">
                        {hasIngredients ? 'Ver receta / porciones' : 'Porción sugerida'}
                      </p>
                      
                      {showCalories && getMealCalories(meal, allIngredients) !== undefined && (
                        <div className="mt-1.5 flex items-center gap-1.5">
                           <span className="text-[10px] bg-surface2 px-2 py-0.5 rounded-md font-mono text-muted">
                             {getMealCalories(meal, allIngredients)} kcal
                           </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-2 bg-surface/90 rounded-lg p-0.5 backdrop-blur-sm">
                    {hasIngredients && (
                      <button
                        onClick={() => setExpandedMealId(isMealExpanded ? null : meal.id)}
                        className="p-1.5 rounded-md hover:bg-surface2 transition-colors flex-shrink-0"
                        title="Ver ingredientes"
                      >
                        <List size={14} className={isMealExpanded ? 'text-accent' : 'text-muted'} />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setEditingMeal(meal);
                        setShowForm(true);
                      }}
                      className="p-1.5 rounded-md hover:bg-surface2 transition-colors"
                      title="Editar"
                    >
                      <Edit3 size={14} className="text-muted" />
                    </button>
                    <button
                      onClick={() => deleteMeal(date, mealType, meal.id)}
                      className="p-1.5 rounded-md hover:bg-red-500/10 transition-colors"
                      title="Eliminar"
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

          {meals.length === 0 && mealType === 'almuerzo' ? (
             <div className="w-full rounded-2xl border-2 border-dashed border-border/60 bg-surface2/30 p-6 flex flex-col items-center justify-center text-center gap-3">
               <div className="w-12 h-12 rounded-full bg-surface2 flex items-center justify-center">
                 <Camera size={20} className="text-muted/40" />
               </div>
               <p className="text-sm font-body text-text-primary">¿Qué tienes planeado para hoy?</p>
               <button
                 onClick={() => {
                   setEditingMeal(null);
                   setShowForm(true);
                 }}
                 className="px-5 py-2.5 rounded-full bg-surface2 text-accent font-semibold text-xs hover:bg-surface2/80 transition-colors"
               >
                 Log Meal
               </button>
             </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditingMeal(null);
                  setShowForm(true);
                }}
                className="flex-[2] flex items-center justify-center gap-2 py-3 rounded-[1rem] bg-accent text-white hover:bg-accent/90 transition-all min-h-[48px]"
              >
                <Plus size={16} />
                <span className="text-xs font-body font-bold">Agregar Comida</span>
              </button>
              {showCalories && (
                <button
                  onClick={() => setShowCalc(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-[1rem] bg-surface2 text-text-primary hover:bg-surface2/80 transition-all min-h-[48px]"
                  title="Calculadora"
                >
                  <Calculator size={16} />
                </button>
              )}
            </div>
          )}
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
  const customDishes = useRecipesStore((s) => s.customDishes);
  const ingredients = useMemo(() => {
    // AI-generated ingredients
    if (meal.aiIngredients?.length) {
      return meal.aiIngredients.map((ai) => ({
        name: ai.name,
        humanPortion: `${ai.grams}g`,
      }));
    }

    // If linked to a custom recipe, use its ingredients with human portions
    if (meal.linkedRecipeId) {
      const dish = customDishes.find((d) => d.id === meal.linkedRecipeId);
      if (dish) {
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
  }, [meal, allIngredients, customDishes]);

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
