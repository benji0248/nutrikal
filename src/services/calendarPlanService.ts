import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { MEAL_TYPE_ORDER } from '../types';
import type { AiMeal, Ingredient, MealType, WeekPlan } from '../types';
import type { CalendarChangeSummary, CalendarMeal, CalendarOperation, CalendarPlanningState, OverlapPolicy } from './calendarPlanTypes';
import { createShoppingItemsFromAiMeals } from './shoppingService';

export const planShoppingId = (id: string): string => `calendar-plan:${id}`;
const dateKey = (date: Date) => format(date, 'yyyy-MM-dd');
export function isWholeWeekShift(plan: WeekPlan, startDate: string): boolean {
  const start = parseISO(startDate);
  const original = parseISO(plan.days[0]?.date ?? '');
  return /^\d{4}-\d{2}-\d{2}$/.test(startDate) && !Number.isNaN(start.getTime()) && !Number.isNaN(original.getTime())
    && differenceInCalendarDays(start, original) % 7 === 0;
}
export function nextAvailablePlanStart(plan: WeekPlan, today: string): string {
  const start = parseISO(plan.days[0]?.date ?? '');
  if (Number.isNaN(start.getTime())) return today;
  const anchor = parseISO(today);
  const offset = ((differenceInCalendarDays(start, anchor) % 7) + 7) % 7;
  return dateKey(addDays(anchor, offset));
}
export function shiftWeekPlan(plan: WeekPlan, startDate: string): WeekPlan {
  if (!plan.days.length || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || Number.isNaN(parseISO(startDate).getTime())) throw new Error('Elegí una fecha válida.');
  const offset = differenceInCalendarDays(parseISO(startDate), parseISO(plan.days[0].date));
  return { ...plan, days: plan.days.map((day) => ({ ...day, date: dateKey(addDays(parseISO(day.date), offset)) })) };
}
export function describePlanOverlap(plan: WeekPlan, meals: CalendarMeal[], today: string) {
  let empty = 0, conflicts = 0, protectedSlots = 0;
  const days = new Set<string>();
  for (const day of plan.days) for (const mealType of MEAL_TYPE_ORDER) {
    if (!day.meals[mealType]) continue;
    const active = meals.filter((meal) => meal.date === day.date && meal.mealType === mealType && !meal.isAlternative);
    if (day.date < today || active.some((meal) => meal.completed)) protectedSlots++;
    else if (active.length) { conflicts++; days.add(day.date); }
    else empty++;
  }
  return { empty, conflicts, protected: protectedSlots, days: [...days].sort() };
}

export function changeCalendarPlan(input: CalendarPlanningState, operation: Exclude<CalendarOperation, { kind: 'undo' }>, context: {
  today: string; now: string; operationId: string; ingredients: Ingredient[];
}): { state: CalendarPlanningState; summary: CalendarChangeSummary } {
  const state = structuredClone(input);
  const summary: CalendarChangeSummary = { added: 0, replaced: 0, preserved: 0, alternatives: 0, protected: 0 };
  let serial = 0;
  const makeId = () => `${context.operationId}:${++serial}`;
  const slot = (date: string, type: MealType) => state.meals.filter((meal) => meal.date === date && meal.mealType === type && !meal.isAlternative);
  const place = (rows: CalendarMeal[], policy: OverlapPolicy) => {
    const groups = new Map<string, CalendarMeal[]>();
    for (const row of rows) {
      const key = `${row.date}:${row.mealType}`;
      groups.set(key, [...(groups.get(key) ?? []), row]);
    }
    for (const incoming of groups.values()) {
      const { date, mealType } = incoming[0];
      const active = slot(date, mealType);
      if (date < context.today || active.some((meal) => meal.completed)) { summary.protected++; continue; }
      if (active.length && policy === 'fill') { summary.preserved++; continue; }
      if (active.length && policy === 'replace') {
        const ids = new Set(active.map((meal) => meal.id));
        state.meals = state.meals.filter((meal) => !ids.has(meal.id));
        summary.replaced++;
      } else if (active.length && policy === 'alternatives') {
        incoming.forEach((meal) => { meal.isAlternative = true; });
        summary.alternatives++;
        summary.preserved++;
      }
      if (!active.length) summary.added++;
      state.meals.push(...incoming);
    }
  };
  if (operation.kind === 'apply') {
    if (state.plans.some((plan) => plan.id === operation.planId)) throw new Error('Este plan ya está en tu calendario. Podés administrarlo desde allí.');
    const source = shiftWeekPlan(operation.plan, operation.startDate);
    if (!isWholeWeekShift(operation.plan, operation.startDate)) throw new Error('Para conservar la rutina del plan, elegí el mismo día de inicio en otra semana. Para cambiar el día de inicio, generá un plan nuevo.');
    if (source.days.length !== 7 || new Set(source.days.map((day) => day.date)).size !== 7
      || source.days.some((day, index) => day.date !== dateKey(addDays(parseISO(source.days[0].date), index)))) throw new Error('El plan debe cubrir siete días consecutivos.');
    if (source.days[0].date < context.today) throw new Error('Elegí hoy o una fecha futura.');
    const rows: CalendarMeal[] = [];
    for (const day of source.days) for (const mealType of MEAL_TYPE_ORDER) {
      const meal = day.meals[mealType];
      if (meal) rows.push({
        id: makeId(), planId: operation.planId, optionId: makeId(), date: day.date, mealType,
        name: meal.name, calories: meal.totalKcal, aiIngredients: meal.ingredients,
        prepMinutes: meal.prepMinutes, humanPortion: meal.humanPortion, preparation: meal.preparation, tip: meal.tip,
        completed: false, isAlternative: false,
      });
    }
    place(rows, operation.policy);
    if (!state.meals.some((meal) => meal.planId === operation.planId)) throw new Error('No hay horarios disponibles para agregar. Elegí reemplazar, guardar alternativas u otras fechas.');
    state.plans.push({ id: operation.planId, title: 'Plan semanal', startDate: source.days[0].date,
      endDate: source.days[6].date, createdAt: context.now, source: { ...source, id: operation.planId, applied: true } });
  } else if (operation.kind === 'remove' || operation.kind === 'move') {
    const plan = state.plans.find((candidate) => candidate.id === operation.planId);
    if (!plan) throw new Error('No encontré ese plan. Actualizá el calendario.');
    const movable = state.meals.filter((meal) => meal.planId === plan.id && meal.date >= context.today && !meal.completed);
    if (!movable.length) throw new Error('Este plan no tiene comidas futuras que se puedan modificar.');
    state.meals = state.meals.filter((meal) => !movable.some((row) => row.id === meal.id));
    if (operation.kind === 'move') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(operation.startDate) || Number.isNaN(parseISO(operation.startDate).getTime())) throw new Error('Elegí una fecha válida.');
      const offset = differenceInCalendarDays(parseISO(operation.startDate), parseISO(plan.startDate));
      if (!offset || offset % 7 !== 0 || operation.startDate < context.today) throw new Error('Elegí otra semana conservando el día de inicio.');
      const shifted = movable.map((meal) => ({ ...meal, date: dateKey(addDays(parseISO(meal.date), offset)) }));
      // Destination conflicts involving a completed meal must not make source meals disappear.
      if (shifted.some((meal) => slot(meal.date, meal.mealType).some((target) => target.completed))) throw new Error('El destino tiene comidas realizadas. Elegí otra semana.');
      if (operation.policy === 'fill' && shifted.some((meal) => !meal.isAlternative && slot(meal.date, meal.mealType).length)) throw new Error('Para mover el plan completo, elegí reemplazar, alternativas u otra semana.');
      const active = shifted.filter((meal) => !meal.isAlternative);
      const alternatives = shifted.filter((meal) => meal.isAlternative);
      place(active, operation.policy);
      state.meals.push(...alternatives);
      plan.source = shiftWeekPlan(plan.source, operation.startDate);
      plan.startDate = operation.startDate;
      plan.endDate = plan.source.days[6].date;
    }
    if (!state.meals.some((meal) => meal.planId === plan.id)) state.plans = state.plans.filter((candidate) => candidate.id !== plan.id);
  } else if (operation.kind === 'editMeal' || operation.kind === 'deleteMeal') {
    const id = operation.kind === 'deleteMeal' ? operation.mealId : operation.meal.id;
    const current = state.meals.find((meal) => meal.id === id);
    if (!current) throw new Error('La comida ya no está disponible. Actualizá el calendario.');
    if (operation.kind === 'deleteMeal') state.meals = state.meals.filter((meal) => meal.id !== id);
    else {
      const changed = operation.meal;
      if (!changed.name?.trim()) throw new Error('La comida necesita un nombre.');
      if (changed.date !== current.date || changed.mealType !== current.mealType) throw new Error('Para cambiar la fecha, usá la administración del plan.');
      Object.assign(current, { name: changed.name, calories: changed.calories, notes: changed.notes,
        entries: changed.entries, aiIngredients: changed.aiIngredients, completed: changed.completed,
        prepMinutes: changed.prepMinutes, humanPortion: changed.humanPortion, preparation: changed.preparation, tip: changed.tip });
    }
  } else if (operation.kind === 'organize') {
    const active = slot(operation.date, operation.mealType);
    if (operation.date < context.today || active.some((meal) => meal.completed)) throw new Error('Las fechas pasadas y las comidas realizadas se conservan.');
    if (active.length < 2 || !active.some((meal) => meal.id === operation.selectedMealId)) throw new Error('Las comidas cambiaron. Revisá las opciones antes de confirmar.');
    active.forEach((meal) => { meal.optionId = makeId(); meal.isAlternative = meal.id !== operation.selectedMealId; });
    summary.alternatives = active.length - 1;
    summary.preserved = 1;
  } else if (operation.kind === 'choose') {
    if (operation.date < context.today) throw new Error('No se cambian comidas de fechas pasadas.');
    const active = slot(operation.date, operation.mealType);
    if (active.some((meal) => meal.completed)) throw new Error('Esta comida ya está realizada.');
    const selected = state.meals.filter((meal) => meal.date === operation.date && meal.mealType === operation.mealType && meal.optionId === operation.optionId && meal.isAlternative);
    if (!selected.length) throw new Error('Esa alternativa ya no está disponible.');
    const oldOption = makeId();
    active.forEach((meal) => { meal.isAlternative = true; meal.optionId = oldOption; });
    selected.forEach((meal) => { meal.isAlternative = false; });
    summary.replaced = 1;
  }
  // Plan-owned shopping lists are separate from manual lists. Only the selected option counts.
  const affectedPlanIds = new Set<string>();
  for (const meal of [...input.meals, ...state.meals]) {
    if (meal.planId && JSON.stringify(input.meals.find((row) => row.id === meal.id)) !== JSON.stringify(state.meals.find((row) => row.id === meal.id))) affectedPlanIds.add(meal.planId);
  }
  for (const planId of affectedPlanIds) {
    const id = planShoppingId(planId);
    const old = input.shoppingLists.find((list) => list.id === id);
    const plan = state.plans.find((candidate) => candidate.id === planId);
    const active = state.meals.filter((meal) => meal.planId === planId && !meal.isAlternative && !meal.completed && meal.date >= context.today);
    state.shoppingLists = state.shoppingLists.filter((list) => list.id !== id);
    if (!plan || !active.length) continue;
    const aiMeals: AiMeal[] = active.map((meal) => ({ name: meal.name, totalKcal: meal.calories ?? 0, ingredients: meal.aiIngredients ?? [] }));
    const items = createShoppingItemsFromAiMeals(aiMeals, context.ingredients).map((item) => {
      const previous = old?.items.find((candidate) => candidate.ingredientId === item.ingredientId);
      return { ...item, id: previous?.id ?? makeId(), checked: previous?.quantity === item.quantity ? previous.checked : false };
    });
    state.shoppingLists.push({ id, name: `Compras · ${plan.startDate} al ${plan.endDate}`, createdAt: old?.createdAt ?? context.now,
      dateRange: { from: plan.startDate, to: plan.endDate }, items });
  }
  return { state, summary };
}
