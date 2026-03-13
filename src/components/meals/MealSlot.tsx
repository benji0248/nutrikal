import { useState } from 'react';
import { Plus, Trash2, Edit3, ChevronDown, ChevronUp } from 'lucide-react';
import type { Meal, MealType } from '../../types';
import { MEAL_TYPE_LABELS } from '../../types';
import { useCalendarStore } from '../../store/useCalendarStore';
import { MealForm } from './MealForm';
import { Modal } from '../ui/Modal';

interface MealSlotProps {
  date: string;
  mealType: MealType;
  meals: Meal[];
}

const MEAL_ICONS: Record<MealType, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍎',
};

export function MealSlot({ date, mealType, meals }: MealSlotProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const removeMealFromDay = useCalendarStore((s) => s.removeMealFromDay);

  const totalCalories = meals.reduce((sum, m) => sum + (m.calories ?? 0), 0);

  return (
    <div className="bg-surface-elevated/50 backdrop-blur-sm rounded-xl border border-border/50 overflow-hidden transition-all duration-200">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-elevated/80 transition-colors min-h-[48px]"
        aria-label={`${MEAL_TYPE_LABELS[mealType]}: ${meals.length} comidas`}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-lg">{MEAL_ICONS[mealType]}</span>
          <span className="font-medium text-sm text-text-primary">
            {MEAL_TYPE_LABELS[mealType]}
          </span>
          {meals.length > 0 && (
            <span className="text-xs text-text-secondary bg-surface px-2 py-0.5 rounded-md">
              {meals.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {totalCalories > 0 && (
            <span className="text-xs font-mono text-accent">{totalCalories} kcal</span>
          )}
          {isExpanded ? (
            <ChevronUp size={16} className="text-text-secondary" />
          ) : (
            <ChevronDown size={16} className="text-text-secondary" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-3 space-y-2">
          {meals.map((meal) => (
            <div
              key={meal.id}
              className="flex items-center justify-between bg-surface/50 rounded-lg px-3 py-2.5 group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary truncate">{meal.name}</p>
                {(meal.calories !== undefined || meal.protein !== undefined) && (
                  <div className="flex gap-2 mt-0.5">
                    {meal.calories !== undefined && (
                      <span className="text-[10px] font-mono text-text-secondary">
                        {meal.calories} kcal
                      </span>
                    )}
                    {meal.protein !== undefined && (
                      <span className="text-[10px] font-mono text-accent-secondary">
                        {meal.protein}g prot
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => {
                    setEditingMeal(meal);
                    setShowForm(true);
                  }}
                  className="p-2 rounded-lg hover:bg-surface-elevated transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
                  aria-label={`Editar ${meal.name}`}
                >
                  <Edit3 size={14} className="text-text-secondary" />
                </button>
                <button
                  onClick={() => removeMealFromDay(date, mealType, meal.id)}
                  className="p-2 rounded-lg hover:bg-red-500/10 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
                  aria-label={`Eliminar ${meal.name}`}
                >
                  <Trash2 size={14} className="text-red-400" />
                </button>
              </div>
            </div>
          ))}

          <button
            onClick={() => {
              setEditingMeal(null);
              setShowForm(true);
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-border hover:border-accent/50 hover:bg-accent/5 transition-all text-text-secondary hover:text-accent min-h-[48px]"
            aria-label={`Agregar comida a ${MEAL_TYPE_LABELS[mealType]}`}
          >
            <Plus size={16} />
            <span className="text-xs font-medium">Agregar</span>
          </button>
        </div>
      )}

      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingMeal(null);
        }}
        title={editingMeal ? 'Editar comida' : 'Agregar comida'}
      >
        <MealForm
          date={date}
          mealType={mealType}
          editingMeal={editingMeal}
          onClose={() => {
            setShowForm(false);
            setEditingMeal(null);
          }}
        />
      </Modal>
    </div>
  );
}
