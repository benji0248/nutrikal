import { useState, useMemo } from 'react';
import { Trash, Save, Send } from 'lucide-react';
import { clsx } from 'clsx';
import { useCalculatorStore } from '../../store/useCalculatorStore';
import { useCalendarStore } from '../../store/useCalendarStore';
import { useIngredientsStore } from '../../store/useIngredientsStore';
import { INGREDIENTS_DB } from '../../data/ingredients';
import { computeTotalMacros } from '../../utils/macroHelpers';
import { generateId } from '../../utils/dateHelpers';
import { IngredientSearch } from './IngredientSearch';
import { IngredientRow } from './IngredientRow';
import { MacroSummary } from './MacroSummary';
import { AddCustomIngredient } from './AddCustomIngredient';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { BottomSheet } from '../ui/BottomSheet';
import { Modal } from '../ui/Modal';
import { MEAL_TYPE_LABELS, MEAL_TYPE_ORDER } from '../../types';
import type { Ingredient, MealType } from '../../types';

interface CalorieCalculatorProps {
  targetDate?: string;
  targetMealType?: MealType;
  onSentToMeal?: () => void;
}

export function CalorieCalculator({ targetDate, targetMealType, onSentToMeal }: CalorieCalculatorProps) {
  const {
    entries,
    calculatorMode,
    recipeName,
    savedRecipes,
    addEntry,
    updateEntryGrams,
    removeEntry,
    clearEntries,
    setMode,
    setRecipeName,
    saveCurrentAsRecipe,
    loadRecipe,
  } = useCalculatorStore();

  const upsertMeal = useCalendarStore((s) => s.upsertMeal);
  const currentDate = useCalendarStore((s) => s.currentDate);
  const customIngredients = useIngredientsStore((s) => s.customIngredients);

  const allIngredients = useMemo(
    () => [...INGREDIENTS_DB, ...customIngredients],
    [customIngredients],
  );

  const totals = useMemo(
    () => computeTotalMacros(entries, allIngredients),
    [entries, allIngredients],
  );

  const [showCustomForm, setShowCustomForm] = useState(false);
  const [showSendPicker, setShowSendPicker] = useState(false);
  const [sendDate, setSendDate] = useState(targetDate ?? currentDate);
  const [sendMealType, setSendMealType] = useState<MealType>(targetMealType ?? 'almuerzo');
  const [sendName, setSendName] = useState('');

  const handleSelectIngredient = (ing: Ingredient) => {
    addEntry(ing.id, 100);
  };

  const handleSaveRecipe = () => {
    const name = recipeName.trim() || `Receta ${savedRecipes.length + 1}`;
    saveCurrentAsRecipe(name, allIngredients);
  };

  const handleSendToMeal = () => {
    const name = sendName.trim() || recipeName.trim() || 'Comida calculada';
    upsertMeal(sendDate, sendMealType, {
      id: generateId(),
      name,
      calories: Math.round(totals.calories),
      entries: [...entries],
    });
    clearEntries();
    setShowSendPicker(false);
    onSentToMeal?.();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 bg-surface2 rounded-2xl p-1">
        <button
          onClick={() => setMode('freeform')}
          className={clsx(
            'flex-1 py-2.5 rounded-xl text-sm font-body font-medium transition-all min-h-[44px]',
            calculatorMode === 'freeform'
              ? 'bg-accent text-white shadow-sm'
              : 'text-muted hover:text-text-primary',
          )}
          aria-label="Modo libre"
        >
          Libre
        </button>
        <button
          onClick={() => setMode('recipe')}
          className={clsx(
            'flex-1 py-2.5 rounded-xl text-sm font-body font-medium transition-all min-h-[44px]',
            calculatorMode === 'recipe'
              ? 'bg-accent text-white shadow-sm'
              : 'text-muted hover:text-text-primary',
          )}
          aria-label="Modo receta"
        >
          Receta
        </button>
      </div>

      {calculatorMode === 'recipe' && (
        <div className="space-y-3">
          <Input
            label="Nombre de la receta"
            value={recipeName}
            onChange={(e) => setRecipeName(e.target.value)}
            placeholder="Ej: Bowl de proteínas"
          />
          {savedRecipes.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted font-body">Recetas guardadas:</p>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {savedRecipes.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => loadRecipe(r.id)}
                    className="px-3 py-2 rounded-xl bg-surface2 text-xs font-body text-text-primary hover:bg-accent/10 transition-colors whitespace-nowrap min-h-[40px]"
                    aria-label={`Cargar receta ${r.name}`}
                  >
                    {r.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <IngredientSearch
        allIngredients={allIngredients}
        onSelect={handleSelectIngredient}
        onAddCustom={() => setShowCustomForm(true)}
      />

      {entries.length > 0 && (
        <>
          <div className="space-y-2 max-h-[40vh] overflow-y-auto">
            {entries.map((entry) => {
              const ing = allIngredients.find((i) => i.id === entry.ingredientId);
              if (!ing) return null;
              return (
                <IngredientRow
                  key={entry.ingredientId}
                  ingredient={ing}
                  grams={entry.grams}
                  onUpdateGrams={(g) => updateEntryGrams(entry.ingredientId, g)}
                  onRemove={() => removeEntry(entry.ingredientId)}
                />
              );
            })}
          </div>

          <MacroSummary totals={totals} />

          <div className="flex flex-col gap-2 sm:flex-row">
            {calculatorMode === 'recipe' && (
              <Button
                variant="secondary"
                icon={<Save size={16} />}
                onClick={handleSaveRecipe}
                fullWidth
                disabled={entries.length === 0}
              >
                Guardar receta
              </Button>
            )}
            <Button
              icon={<Send size={16} />}
              onClick={() => setShowSendPicker(true)}
              fullWidth
              disabled={entries.length === 0}
            >
              Enviar a comida
            </Button>
            <Button
              variant="ghost"
              icon={<Trash size={16} />}
              onClick={clearEntries}
              fullWidth
            >
              Limpiar
            </Button>
          </div>
        </>
      )}

      {entries.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted text-sm font-body">
            Buscá y agregá ingredientes para calcular las calorías
          </p>
        </div>
      )}

      {/* Custom ingredient form */}
      <BottomSheet
        isOpen={showCustomForm}
        onClose={() => setShowCustomForm(false)}
        title="Nuevo ingrediente"
      >
        <AddCustomIngredient onClose={() => setShowCustomForm(false)} />
      </BottomSheet>
      <Modal
        isOpen={showCustomForm}
        onClose={() => setShowCustomForm(false)}
        title="Nuevo ingrediente"
      >
        <AddCustomIngredient onClose={() => setShowCustomForm(false)} />
      </Modal>

      {/* Send to meal picker */}
      <BottomSheet
        isOpen={showSendPicker}
        onClose={() => setShowSendPicker(false)}
        title="Enviar a comida"
      >
        <SendToMealForm
          date={sendDate}
          mealType={sendMealType}
          name={sendName}
          onDateChange={setSendDate}
          onMealTypeChange={setSendMealType}
          onNameChange={setSendName}
          onSubmit={handleSendToMeal}
          onCancel={() => setShowSendPicker(false)}
          calories={Math.round(totals.calories)}
        />
      </BottomSheet>
      <Modal
        isOpen={showSendPicker}
        onClose={() => setShowSendPicker(false)}
        title="Enviar a comida"
      >
        <SendToMealForm
          date={sendDate}
          mealType={sendMealType}
          name={sendName}
          onDateChange={setSendDate}
          onMealTypeChange={setSendMealType}
          onNameChange={setSendName}
          onSubmit={handleSendToMeal}
          onCancel={() => setShowSendPicker(false)}
          calories={Math.round(totals.calories)}
        />
      </Modal>
    </div>
  );
}

interface SendFormProps {
  date: string;
  mealType: MealType;
  name: string;
  onDateChange: (d: string) => void;
  onMealTypeChange: (mt: MealType) => void;
  onNameChange: (n: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  calories: number;
}

function SendToMealForm({
  date,
  mealType,
  name,
  onDateChange,
  onMealTypeChange,
  onNameChange,
  onSubmit,
  onCancel,
  calories,
}: SendFormProps) {
  return (
    <div className="space-y-4">
      <Input
        label="Nombre de la comida"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="Ej: Almuerzo proteico"
      />
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5 font-body">
          Fecha
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className="w-full bg-surface2 text-text-primary border border-border rounded-2xl px-4 py-3 min-h-[48px] font-body text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/40"
          aria-label="Fecha"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5 font-body">
          Comida
        </label>
        <div className="grid grid-cols-2 gap-2">
          {MEAL_TYPE_ORDER.map((mt) => (
            <button
              key={mt}
              onClick={() => onMealTypeChange(mt)}
              className={clsx(
                'px-3 py-2.5 rounded-xl text-sm font-body font-medium transition-colors min-h-[48px]',
                mealType === mt
                  ? 'bg-accent text-white'
                  : 'bg-surface2 text-muted hover:text-text-primary',
              )}
              aria-label={MEAL_TYPE_LABELS[mt]}
            >
              {MEAL_TYPE_LABELS[mt]}
            </button>
          ))}
        </div>
      </div>
      <p className="text-sm font-mono text-accent text-center">
        {calories} kcal totales
      </p>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={onCancel} fullWidth>
          Cancelar
        </Button>
        <Button onClick={onSubmit} fullWidth>
          Enviar
        </Button>
      </div>
    </div>
  );
}
