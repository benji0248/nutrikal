import { useState, useMemo } from 'react';
import { Plus, Trash2, Edit3, ChevronDown, ChevronUp, Coffee, Utensils, Apple, Moon } from 'lucide-react';
import { clsx } from 'clsx';
import { useCalendarStore } from '../../store/useCalendarStore';
import { MealForm } from './MealForm';
import { BottomSheet } from '../ui/BottomSheet';
import { Modal } from '../ui/Modal';
import { MEAL_TYPE_LABELS } from '../../types';
import type { Meal, MealType } from '../../types';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useIngredientsStore } from '../../store/useIngredientsStore';
import { INGREDIENTS_DB } from '../../data/ingredients';
import { useRecipesStore } from '../../store/useRecipesStore';
import { getMealCalories } from '../../utils/macroHelpers';
import { getDishHumanIngredients, formatPortionDisplay, formatNamedIngredientPortion } from '../../utils/portionHelpers';

interface MealSlotProps {
  date: string;
  mealType: MealType;
  meals: Meal[];
  domId?: string;
  /** Opens NutriKal chat scoped to this meal slot. */
  onOpenMealChat?: (date: string, mealType: MealType, existingMealName?: string) => void;
  embedded?: boolean;
  isActiveSlot?: boolean;
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
    cardClass: '',
  },
  snack: {
    icon: <Apple size={18} />,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-700',
    cardClass: 'border-l-4 border-l-amber-500 rounded-l-md',
  },
  cena: {
    icon: <Moon size={18} />,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-700',
    cardClass: 'border-l-4 border-l-emerald-600 rounded-l-md',
  },
};

export function MealSlot({
  date,
  mealType,
  meals,
  domId,
  onOpenMealChat,
  embedded = false,
  isActiveSlot = false,
}: MealSlotProps) {
  const [expanded, setExpanded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const showCalories = useSettingsStore((s) => s.showCalories);
  const customIngredients = useIngredientsStore((s) => s.customIngredients);
  const allIngredients = useMemo(() => [...INGREDIENTS_DB, ...customIngredients], [customIngredients]);
  const upsertMeal = useCalendarStore((s) => s.upsertMeal);
  const deleteMeal = useCalendarStore((s) => s.deleteMeal);

  const totalCals = meals.reduce((sum, m) => sum + (getMealCalories(m, allIngredients) ?? 0), 0);

  const assignedMealLabel = useMemo(() => {
    if (meals.length === 0) return null;
    const names = meals.map((m) => m.name.trim()).filter(Boolean);
    if (names.length === 0) return null;
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} · ${names[1]}`;
    return `${names[0]} · +${names.length - 1} más`;
  }, [meals]);

  const openMealChat = () => {
    const existingMealName = meals[0]?.name;
    if (onOpenMealChat) {
      onOpenMealChat(date, mealType, existingMealName);
      return;
    }
    setEditingMeal(null);
    setShowForm(true);
  };

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

  const style = MEAL_STYLE[mealType];

  const emptySubtitle = isActiveSlot
    ? 'Es tu próxima comida — contale a NutriKal qué vas a comer'
    : 'Todavía no registraste esta comida';

  return (
    <div
      id={domId}
      className={clsx(
        'overflow-hidden transition-all',
        embedded ? 'bg-transparent' : 'rounded-[1.25rem] bg-surface shadow-ambient',
        !embedded && style.cardClass,
        isActiveSlot && embedded && 'bg-accent/[0.03]',
      )}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-4 hover:bg-surface2/60 transition-colors min-h-[56px]"
        aria-label={
          meals.length === 0
            ? `${MEAL_TYPE_LABELS[mealType]}: sin comidas`
            : `${MEAL_TYPE_LABELS[mealType]}: ${assignedMealLabel ?? meals.map((m) => m.name).join(', ')}`
        }
      >
        <div className="flex min-w-0 flex-1 items-center gap-3.5">
          <div className={clsx("w-10 h-10 shrink-0 rounded-2xl flex items-center justify-center", style.iconBg, style.iconColor)}>
            {style.icon}
          </div>
          <div className="min-w-0 flex flex-col items-start">
            <span className="font-heading font-bold text-base text-text-primary">
              {MEAL_TYPE_LABELS[mealType]}
            </span>
            {meals.length === 0 ? (
              <span className={clsx(
                'text-[11px] font-body',
                isActiveSlot ? 'font-medium text-accent/80' : 'text-muted',
              )}>
                {emptySubtitle}
              </span>
            ) : (
              <span className="truncate text-[11px] font-body text-muted max-w-full">
                {assignedMealLabel && (
                  <span className="font-medium text-text-primary/85">{assignedMealLabel}</span>
                )}
                {showCalories && totalCals > 0 && (
                  <span>
                    {assignedMealLabel ? ' · ' : ''}
                    {totalCals} kcal
                  </span>
                )}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
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
            const mealKcal = getMealCalories(meal, allIngredients);

            return (
              <div key={meal.id} className="overflow-hidden rounded-xl border border-border/40 bg-surface2/25">
                {meals.length > 1 && (
                  <p className="border-b border-border/20 px-3 py-2 text-xs font-heading font-semibold text-text-primary">
                    {meal.name}
                  </p>
                )}

                <div className="flex items-center justify-between gap-2 px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    {showCalories && mealKcal !== undefined && (
                      <span className="rounded-md bg-surface px-2 py-0.5 font-mono text-[10px] text-muted">
                        {mealKcal} kcal
                      </span>
                    )}
                    {hasIngredients && (
                      <span className="text-[11px] font-body text-muted">Ingredientes</span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      onClick={() => {
                        setEditingMeal(meal);
                        setShowForm(true);
                      }}
                      className="rounded-md p-1.5 transition-colors hover:bg-surface2"
                      title="Editar"
                    >
                      <Edit3 size={14} className="text-muted" />
                    </button>
                    <button
                      onClick={() => deleteMeal(date, mealType, meal.id)}
                      className="rounded-md p-1.5 transition-colors hover:bg-red-500/10"
                      title="Eliminar"
                    >
                      <Trash2 size={14} className="text-red-400" />
                    </button>
                  </div>
                </div>

                {hasIngredients ? (
                  <MealIngredients meal={meal} allIngredients={allIngredients} />
                ) : (
                  <p className="px-3 pb-3 text-xs font-body text-muted">Sin detalle de ingredientes</p>
                )}

                {meal.preparation && (
                  <div className="border-t border-border/20 px-3 pb-3 pt-2">
                    <p className="mb-1 text-[11px] font-body font-semibold uppercase tracking-wide text-muted">
                      Preparación
                    </p>
                    <p className="whitespace-pre-wrap text-xs font-body leading-relaxed text-text-primary">
                      {meal.preparation}
                    </p>
                    {meal.tip && (
                      <p className="mt-2 text-[11px] font-body italic text-muted">{meal.tip}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <button
            type="button"
            onClick={openMealChat}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-[1rem] bg-accent text-white hover:bg-accent/90 transition-all min-h-[48px]"
          >
            <Plus size={16} />
            <span className="text-xs font-body font-bold">Agregar Comida</span>
          </button>
        </div>
      )}

      {/* Manual edit form (only for editing existing meals) */}
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
    </div>
  );
}

function MealIngredients({ meal, allIngredients }: { meal: Meal; allIngredients: import('../../types').Ingredient[] }) {
  const customDishes = useRecipesStore((s) => s.customDishes);
  const useGrams = useSettingsStore((s) => s.useGrams);
  const ingredients = useMemo(() => {
    // AI-generated ingredients
    if (meal.aiIngredients?.length) {
      return meal.aiIngredients.map((ai) => ({
        name: ai.name,
        humanPortion: formatNamedIngredientPortion(ai.name, ai.grams, allIngredients, useGrams),
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
          humanPortion: formatPortionDisplay(entry.ingredientId, entry.grams, ing, useGrams),
        };
      });
    }

    return [];
  }, [meal, allIngredients, customDishes, useGrams]);

  if (ingredients.length === 0) return null;

  return (
    <div className="px-3 pb-3 pt-1">
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
