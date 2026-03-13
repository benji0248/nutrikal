import { useState } from 'react';
import { Plus, Trash2, Edit3, ChevronDown, ChevronUp, Calculator } from 'lucide-react';
import { useCalendarStore } from '../../store/useCalendarStore';
import { MealForm } from './MealForm';
import { CalorieCalculator } from '../calculator/CalorieCalculator';
import { BottomSheet } from '../ui/BottomSheet';
import { Modal } from '../ui/Modal';
import { MEAL_TYPE_LABELS } from '../../types';
import type { Meal, MealType } from '../../types';

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
  const upsertMeal = useCalendarStore((s) => s.upsertMeal);
  const deleteMeal = useCalendarStore((s) => s.deleteMeal);

  const totalCals = meals.reduce((sum, m) => sum + (m.calories ?? 0), 0);

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
          {totalCals > 0 && (
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
          {meals.map((meal) => (
            <div
              key={meal.id}
              className="flex items-center justify-between bg-surface/50 rounded-xl px-3 py-2.5 group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-body text-text-primary truncate">{meal.name}</p>
                {meal.calories !== undefined && (
                  <span className="text-[10px] font-mono text-muted">{meal.calories} kcal</span>
                )}
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
          ))}

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
            <button
              onClick={() => setShowCalc(true)}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-border hover:border-accent/40 hover:bg-accent/5 transition-all text-muted hover:text-accent min-h-[48px]"
              aria-label="Calcular calorías"
            >
              <Calculator size={16} />
              <span className="text-xs font-body font-medium hidden sm:inline">Calcular</span>
            </button>
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
        title="Calcular calorías"
        snap="full"
      >
        {calcContent}
      </BottomSheet>
      <Modal
        isOpen={showCalc}
        onClose={() => setShowCalc(false)}
        title="Calcular calorías"
      >
        {calcContent}
      </Modal>
    </div>
  );
}
