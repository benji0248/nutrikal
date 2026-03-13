import { useState, useMemo } from 'react';
import { Trash2, Download, Send } from 'lucide-react';
import { useCalculatorStore } from '../../store/useCalculatorStore';
import { useCalendarStore } from '../../store/useCalendarStore';
import { generateId } from '../../utils/dateHelpers';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { BottomSheet } from '../ui/BottomSheet';
import { Modal } from '../ui/Modal';
import { MEAL_TYPE_LABELS, MEAL_TYPE_ORDER } from '../../types';
import type { CalculatorRecipe, MealType } from '../../types';

interface RecipeBankProps {
  onNavigateToCalculator?: () => void;
}

export function RecipeBank({ onNavigateToCalculator }: RecipeBankProps) {
  const savedRecipes = useCalculatorStore((s) => s.savedRecipes);
  const loadRecipe = useCalculatorStore((s) => s.loadRecipe);
  const deleteRecipe = useCalculatorStore((s) => s.deleteRecipe);
  const upsertMeal = useCalendarStore((s) => s.upsertMeal);
  const currentDate = useCalendarStore((s) => s.currentDate);

  const [search, setSearch] = useState('');
  const [sendingRecipe, setSendingRecipe] = useState<CalculatorRecipe | null>(null);
  const [sendDate, setSendDate] = useState(currentDate);
  const [sendMealType, setSendMealType] = useState<MealType>('almuerzo');

  const filtered = useMemo(() => {
    if (!search.trim()) return savedRecipes;
    const q = search.toLowerCase();
    return savedRecipes.filter((r) => r.name.toLowerCase().includes(q));
  }, [savedRecipes, search]);

  const handleSend = () => {
    if (!sendingRecipe) return;
    upsertMeal(sendDate, sendMealType, {
      id: generateId(),
      name: sendingRecipe.name,
      calories: Math.round(sendingRecipe.totalMacros.calories),
      linkedRecipeId: sendingRecipe.id,
      entries: [...sendingRecipe.entries],
    });
    setSendingRecipe(null);
  };

  const handleLoadInCalc = (id: string) => {
    loadRecipe(id);
    onNavigateToCalculator?.();
  };

  const sendForm = (
    <div className="space-y-4">
      <p className="text-sm text-muted font-body">
        Enviar <strong className="text-text-primary">{sendingRecipe?.name}</strong> ({Math.round(sendingRecipe?.totalMacros.calories ?? 0)} kcal)
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
              className={`px-3 py-2.5 rounded-xl text-sm font-body font-medium transition-colors min-h-[48px] ${
                sendMealType === mt ? 'bg-accent text-white' : 'bg-surface2 text-muted hover:text-text-primary'
              }`}
              aria-label={MEAL_TYPE_LABELS[mt]}
            >
              {MEAL_TYPE_LABELS[mt]}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => setSendingRecipe(null)} fullWidth>Cancelar</Button>
        <Button onClick={handleSend} fullWidth>Enviar</Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-heading font-bold text-text-primary">Recetas guardadas</h2>
      </div>

      {savedRecipes.length > 0 && (
        <Input
          variant="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar receta..."
          clearable
          onClear={() => setSearch('')}
        />
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted text-sm font-body">
            {search ? 'Sin resultados' : 'No hay recetas guardadas aún'}
          </p>
          <p className="text-muted/60 text-xs font-body mt-1">
            Usá la calculadora para crear y guardar recetas
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((recipe) => (
            <div
              key={recipe.id}
              className="bg-surface2/40 backdrop-blur-sm rounded-2xl border border-border/40 p-4 space-y-3 transition-all hover:border-border"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-body font-medium text-text-primary">{recipe.name}</h3>
                  <p className="text-[10px] text-muted font-body mt-0.5">
                    {new Date(recipe.savedAt).toLocaleDateString('es-AR')}
                    {' · '}
                    {recipe.entries.length} ingredientes
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="accent">{`${Math.round(recipe.totalMacros.calories)} kcal`}</Badge>
                <Badge variant="success">{`P: ${recipe.totalMacros.protein.toFixed(1)}g`}</Badge>
                <Badge variant="warning">{`C: ${recipe.totalMacros.carbs.toFixed(1)}g`}</Badge>
                <Badge variant="danger">{`G: ${recipe.totalMacros.fat.toFixed(1)}g`}</Badge>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" icon={<Download size={14} />} onClick={() => handleLoadInCalc(recipe.id)}>
                  Cargar
                </Button>
                <Button size="sm" variant="ghost" icon={<Send size={14} />} onClick={() => setSendingRecipe(recipe)}>
                  Enviar
                </Button>
                <Button size="sm" variant="ghost" icon={<Trash2 size={14} />} onClick={() => deleteRecipe(recipe.id)}>
                  Eliminar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <BottomSheet isOpen={!!sendingRecipe} onClose={() => setSendingRecipe(null)} title="Enviar a comida">
        {sendForm}
      </BottomSheet>
      <Modal isOpen={!!sendingRecipe} onClose={() => setSendingRecipe(null)} title="Enviar a comida">
        {sendForm}
      </Modal>
    </div>
  );
}
