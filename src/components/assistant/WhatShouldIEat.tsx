import { useState, useMemo } from 'react';
import { Sparkles, UserCircle } from 'lucide-react';
import { clsx } from 'clsx';
import type { Dish, MealType, Ingredient } from '../../types';
import { useProfileStore } from '../../store/useProfileStore';
import { useCalendarStore } from '../../store/useCalendarStore';
import { useIngredientsStore } from '../../store/useIngredientsStore';
import { INGREDIENTS_DB } from '../../data/ingredients';
import { DISHES_DB } from '../../data/dishes';
import { getEnergyLevel, getEnergyRatio } from '../../services/metabolicService';
import { matchDishes, computeDayConsumed, computeRemainingBudget, mealTypeToDishCategory } from '../../services/dishMatchService';
import { todayKey } from '../../utils/dateHelpers';
import { DayEnergyBar } from './DayEnergyBar';
import { DishCard } from './DishCard';
import { DishSearch } from './DishSearch';
import { PortionAdjuster } from './PortionAdjuster';
import { ActivityLog } from './ActivityLog';
import { ProfileSetup } from '../profile/ProfileSetup';
import { Button } from '../ui/Button';
import { BottomSheet } from '../ui/BottomSheet';
import { Modal } from '../ui/Modal';

type ViewMode = 'suggest' | 'search';

const MEAL_OPTIONS: { type: MealType; label: string }[] = [
  { type: 'desayuno', label: 'Desayuno' },
  { type: 'almuerzo', label: 'Almuerzo' },
  { type: 'cena', label: 'Cena' },
  { type: 'snack', label: 'Snack' },
];

export function WhatShouldIEat() {
  const profile = useProfileStore((s) => s.profile);
  const getMetabolicResult = useProfileStore((s) => s.getMetabolicResult);
  const customIngredients = useIngredientsStore((s) => s.customIngredients);
  const dayPlans = useCalendarStore((s) => s.dayPlans);

  const allIngredients: Ingredient[] = useMemo(
    () => [...INGREDIENTS_DB, ...customIngredients],
    [customIngredients],
  );

  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('suggest');
  const [selectedMeal, setSelectedMeal] = useState<MealType>('almuerzo');
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [servings, setServings] = useState(1);

  const todayPlan = dayPlans[todayKey()];
  const metabolic = getMetabolicResult();
  const budget = metabolic?.budget ?? 2000;
  const consumed = computeDayConsumed(todayPlan, allIngredients);
  const remaining = computeRemainingBudget(todayPlan, budget, allIngredients);
  const energyLevel = getEnergyLevel(consumed, budget);
  const energyRatio = getEnergyRatio(consumed, budget);

  // Suggestions: dishes that fit in remaining budget, filtered by profile prefs
  const suggestions = useMemo(() => {
    const category = mealTypeToDishCategory(selectedMeal);
    return matchDishes(DISHES_DB, allIngredients, {
      category,
      restrictions: profile?.restrictions,
      dislikedIngredientIds: profile?.dislikedIngredientIds,
      maxCalories: remaining,
    }).slice(0, 6);
  }, [selectedMeal, remaining, profile, allIngredients]);

  const handleSelectDish = (dish: Dish) => {
    setSelectedDish(dish);
    setServings(dish.defaultServings);
  };

  // No profile → warm prompt
  if (!profile) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12 space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-accent/10 flex items-center justify-center mx-auto">
            <Sparkles size={28} className="text-accent" />
          </div>
          <h2 className="text-xl font-heading font-bold text-text-primary">
            Tu asistente nutricional
          </h2>
          <p className="text-sm font-body text-muted max-w-xs mx-auto">
            Creá tu perfil para recibir sugerencias personalizadas de comidas, ajustadas a tus necesidades.
          </p>
          <Button
            variant="primary"
            icon={<UserCircle size={18} />}
            onClick={() => setShowProfileSetup(true)}
          >
            Crear perfil
          </Button>
        </div>
        <ProfileSetup
          isOpen={showProfileSetup}
          onClose={() => setShowProfileSetup(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Energy bar */}
      <DayEnergyBar level={energyLevel} ratio={energyRatio} />

      {/* View toggle */}
      <div className="flex items-center gap-1 bg-surface2 rounded-xl p-0.5">
        <button
          onClick={() => setViewMode('suggest')}
          className={clsx(
            'flex-1 py-2 rounded-lg text-xs font-body font-medium transition-all',
            viewMode === 'suggest' ? 'bg-accent text-white' : 'text-muted hover:text-text-primary',
          )}
        >
          Sugerencias
        </button>
        <button
          onClick={() => setViewMode('search')}
          className={clsx(
            'flex-1 py-2 rounded-lg text-xs font-body font-medium transition-all',
            viewMode === 'search' ? 'bg-accent text-white' : 'text-muted hover:text-text-primary',
          )}
        >
          Buscar plato
        </button>
      </div>

      {viewMode === 'suggest' ? (
        <>
          {/* Meal type selector */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {MEAL_OPTIONS.map(({ type, label }) => (
              <button
                key={type}
                onClick={() => setSelectedMeal(type)}
                className={clsx(
                  'px-3 py-1.5 rounded-xl text-xs font-body font-medium whitespace-nowrap border transition-all',
                  selectedMeal === type
                    ? 'bg-accent/15 text-accent border-accent/30'
                    : 'bg-surface2/30 text-muted border-border',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Suggestions */}
          <div className="space-y-2">
            {suggestions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm font-body text-muted">
                  {energyLevel === 'warm_orange'
                    ? 'Ya estás al tope del día. ¡Tomá agua!'
                    : 'No hay sugerencias con los filtros actuales'}
                </p>
              </div>
            ) : (
              suggestions.map((dish) => (
                <DishCard key={dish.id} dish={dish} onClick={handleSelectDish} />
              ))
            )}
          </div>
        </>
      ) : (
        <DishSearch
          dishes={DISHES_DB}
          allIngredients={allIngredients}
          onSelectDish={handleSelectDish}
        />
      )}

      {/* Activity log */}
      <ActivityLog />

      {/* Dish detail sheet */}
      {selectedDish && (
        <>
          <BottomSheet
            isOpen={!!selectedDish}
            onClose={() => setSelectedDish(null)}
            title={selectedDish.name}
          >
            <DishDetail
              dish={selectedDish}
              servings={servings}
              onServingsChange={setServings}
              energyLevel={energyLevel}
              onClose={() => setSelectedDish(null)}
            />
          </BottomSheet>
          <Modal
            isOpen={!!selectedDish}
            onClose={() => setSelectedDish(null)}
            title={selectedDish.name}
          >
            <DishDetail
              dish={selectedDish}
              servings={servings}
              onServingsChange={setServings}
              energyLevel={energyLevel}
              onClose={() => setSelectedDish(null)}
            />
          </Modal>
        </>
      )}
    </div>
  );
}

function DishDetail({
  dish,
  servings,
  onServingsChange,
  energyLevel,
  onClose,
}: {
  dish: Dish;
  servings: number;
  onServingsChange: (n: number) => void;
  energyLevel: import('../../types').EnergyLevel;
  onClose: () => void;
}) {
  const upsertMeal = useCalendarStore((s) => s.upsertMeal);
  const today = todayKey();

  const handleAddToDay = () => {
    // Determine meal type from dish category
    const mealType: MealType =
      dish.category === 'postre' ? 'snack' : (dish.category as MealType);

    const entries = dish.ingredients.map((di) => ({
      ingredientId: di.ingredientId,
      grams: Math.round(di.grams * servings),
    }));

    upsertMeal(today, mealType, {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: servings === 1 ? dish.name : `${dish.name} (x${servings})`,
      entries,
      linkedRecipeId: dish.id,
    });

    onClose();
  };

  return (
    <div className="space-y-4">
      <p className="text-xs font-body text-muted">{dish.humanPortion}</p>

      <PortionAdjuster
        servings={servings}
        onServingsChange={onServingsChange}
        energyLevel={energyLevel}
        humanPortion={dish.humanPortion}
      />

      {dish.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {dish.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-lg text-[10px] font-body font-medium bg-surface2 text-muted"
            >
              {tag.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      )}

      <Button variant="primary" onClick={handleAddToDay} fullWidth>
        Agregar al día
      </Button>
    </div>
  );
}
