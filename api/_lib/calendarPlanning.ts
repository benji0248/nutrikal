import { createHash, randomUUID } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase } from './supabase.js';
import { INGREDIENTS_DB } from '../../src/data/ingredients.js';
import { changeCalendarPlan } from '../../src/services/calendarPlanService.js';
import type { CalendarOperation, CalendarPlanningSnapshot, CalendarPlanningState } from '../../src/services/calendarPlanTypes.js';
import type { MealType, ShoppingItem, Ingredient, WeekPlan } from '../../src/types';
import { findDislikedIngredientNames } from '../../src/utils/foodPreferences.js';

type Row = Record<string, unknown>;
export interface Snapshot { meals: Row[]; plans: Row[]; lists: Row[]; items: Row[] }
const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
export const version = (snapshot: Snapshot) => createHash('sha256').update(stable(snapshot)).digest('hex');
export function toClient(raw: Snapshot): CalendarPlanningSnapshot {
  return {
    version: version(raw),
    meals: raw.meals.map((m) => ({
      id: String(m.id), date: String(m.date), mealType: m.meal_type as MealType, name: String(m.name),
      calories: m.calories == null ? undefined : Number(m.calories), notes: m.notes as string | undefined,
      linkedRecipeId: m.linked_recipe_id as string | undefined, entries: (m.entries ?? []) as [], aiIngredients: (m.ai_ingredients ?? []) as [],
      completed: Boolean(m.completed), prepMinutes: m.prep_minutes as number | undefined, humanPortion: m.human_portion as string | undefined,
      preparation: m.preparation as string | undefined, tip: m.tip as string | undefined,
      planId: m.plan_id as string | undefined, optionId: m.option_id as string | undefined, isAlternative: Boolean(m.is_alternative),
    })),
    plans: raw.plans.map((p) => ({ id: String(p.id), title: String(p.title), startDate: String(p.start_date), endDate: String(p.end_date), createdAt: String(p.created_at), source: p.source as WeekPlan })),
    shoppingLists: raw.lists.map((l) => ({
      id: String(l.id), name: String(l.name), createdAt: String(l.created_at), dateRange: { from: String(l.date_from), to: String(l.date_to) },
      items: raw.items.filter((i) => i.list_id === l.id).map((i) => ({ id: String(i.id), ingredientId: String(i.ingredient_id), name: String(i.name), quantity: String(i.quantity), section: i.section as ShoppingItem['section'], checked: Boolean(i.checked) })),
    })),
  };
}
export function toDatabase(state: CalendarPlanningState, old: Snapshot): Snapshot {
  const original = toClient(old);
  return {
    meals: state.meals.map((m) => stable(m) === stable(original.meals.find((row) => row.id === m.id))
      ? old.meals.find((row) => row.id === m.id)!
      : ({
      ...old.meals.find((row) => row.id === m.id),
      id: m.id, date: m.date, meal_type: m.mealType, name: m.name, calories: m.calories ?? null,
      notes: m.notes ?? null, linked_recipe_id: m.linkedRecipeId ?? null, entries: m.entries ?? [], ai_ingredients: m.aiIngredients ?? [], completed: m.completed ?? false,
      prep_minutes: m.prepMinutes ?? null, human_portion: m.humanPortion ?? null, preparation: m.preparation ?? null, tip: m.tip ?? null,
      plan_id: m.planId ?? null, option_id: m.optionId ?? null, is_alternative: m.isAlternative ?? false,
    })),
    plans: state.plans.map((p) => ({ id: p.id, title: p.title, start_date: p.startDate, end_date: p.endDate, created_at: p.createdAt, source: p.source })),
    lists: state.shoppingLists.map((l) => ({ id: l.id, name: l.name, created_at: l.createdAt, date_from: l.dateRange.from, date_to: l.dateRange.to })),
    items: state.shoppingLists.flatMap((l) => l.items.map((i) => ({ id: i.id, list_id: l.id, ingredient_id: i.ingredientId, name: i.name, quantity: i.quantity, section: i.section, checked: i.checked }))),
  };
}
export function undoChanges(current: Snapshot, before: Snapshot, after: Snapshot): Snapshot {
  const result = structuredClone(current);
  // Revert only touched entities; unrelated edits are preserved. Touched slots are protected as a whole.
  const changedSlots = new Set<string>();
  for (const row of [...before.meals, ...after.meals]) {
    if (stable(before.meals.find((m) => m.id === row.id)) !== stable(after.meals.find((m) => m.id === row.id))) changedSlots.add(`${row.date}:${row.meal_type}`);
  }
  for (const slot of changedSlots) {
    const select = (snapshot: Snapshot) => snapshot.meals.filter((m) => `${m.date}:${m.meal_type}` === slot).sort((a, b) => String(a.id).localeCompare(String(b.id)));
    if (stable(select(current)) !== stable(select(after))) throw new Error('Esa comida cambió después. No deshice nada para conservar tus cambios.');
  }
  for (const list of [...before.lists, ...after.lists]) {
    if (stable(before.lists.find((row) => row.id === list.id)) === stable(after.lists.find((row) => row.id === list.id))) continue;
    const items = (snapshot: Snapshot) => snapshot.items.filter((row) => row.list_id === list.id).sort((a, b) => String(a.id).localeCompare(String(b.id)));
    if (stable(items(current)) !== stable(items(after))) throw new Error('La lista de compras cambió después. No deshice nada para conservar tus cambios.');
  }
  for (const key of ['meals', 'plans', 'lists', 'items'] as const) {
    const ids = new Set([...before[key], ...after[key]].map((row) => String(row.id)));
    for (const id of ids) {
      const original = before[key].find((row) => row.id === id);
      const applied = after[key].find((row) => row.id === id);
      if (stable(original) === stable(applied)) continue;
      const now = current[key].find((row) => row.id === id);
      if (stable(now) !== stable(applied)) throw new Error('Hubo cambios posteriores en el plan o en compras. No deshice nada para conservarlos.');
      result[key] = result[key].filter((row) => row.id !== id);
      if (original) result[key].push(original);
    }
  }
  return result;
}

export async function readSnapshot(userId: string): Promise<Snapshot> {
  const { data, error } = await getSupabase().rpc('calendar_snapshot', { p_user_id: userId });
  if (error) {
    if (error.code === 'PGRST202' || error.code === '42883') throw new Error('CALENDAR_SETUP_REQUIRED');
    throw error;
  }
  return data as Snapshot;
}

export async function calendarPlanningHandler(req: VercelRequest, res: VercelResponse, userId: string) {
  try {
    const before = await readSnapshot(userId);
    if (req.method === 'GET') return res.status(200).json(toClient(before));
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
    const { operation, expectedVersion, requestId, timeZone } = req.body as { operation: CalendarOperation; expectedVersion: string; requestId?: string; timeZone?: string };
    if (!operation || !['apply', 'move', 'remove', 'choose', 'organize', 'editMeal', 'deleteMeal', 'undo'].includes(operation.kind)) return res.status(400).json({ error: 'Operación inválida' });
    const operationId = requestId ?? randomUUID();
    if (!/^[a-zA-Z0-9-]{1,100}$/.test(operationId)) return res.status(400).json({ error: 'Identificador inválido' });
    const supabase = getSupabase();
    const existing = await supabase.from('calendar_operations').select('id').eq('user_id', userId).eq('id', operationId).maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data) return res.status(200).json({ ...toClient(before), operationId, summary: { added: 0, replaced: 0, preserved: 0, alternatives: 0, protected: 0 } });
    if (expectedVersion !== version(before)) return res.status(409).json({ error: 'El calendario cambió. Revisá las coincidencias actualizadas y confirmá nuevamente.' });
    const today = new Intl.DateTimeFormat('sv-SE', { timeZone: timeZone || 'America/Argentina/Buenos_Aires' }).format(new Date());
    let after: Snapshot;
    let summary = { added: 0, replaced: 0, preserved: 0, alternatives: 0, protected: 0 };
    if (operation.kind === 'undo') {
      const history = await supabase.from('calendar_operations').select('before_state,after_state,undone_by').eq('user_id', userId).eq('id', operation.operationId).maybeSingle();
      if (history.error) throw history.error;
      if (!history.data || history.data.undone_by) return res.status(409).json({ error: 'Esta operación ya fue deshecha o no está disponible.' });
      // Completed meals and dates in the past are never rolled back by plan management.
      const original = history.data.before_state as Snapshot;
      const applied = history.data.after_state as Snapshot;
      const changed = new Set([...original.meals, ...applied.meals].filter((row) => stable(original.meals.find((m) => m.id === row.id)) !== stable(applied.meals.find((m) => m.id === row.id))).map((row) => row.id));
      if ([...original.meals, ...applied.meals, ...before.meals].some((row) => changed.has(row.id) && (row.completed || String(row.date) < today))) throw new Error('Este cambio incluye comidas realizadas o fechas pasadas. No se puede deshacer automáticamente.');
      after = undoChanges(before, original, applied);
    } else {
      if ((operation.kind === 'apply' || operation.kind === 'move') && !['fill', 'replace', 'alternatives'].includes(operation.policy)) throw new Error('Elegí cómo resolver las superposiciones.');
      if (operation.kind === 'apply') {
        if (!operation.plan?.days || operation.plan.days.length !== 7 || !/^[a-zA-Z0-9-]{1,100}$/.test(operation.planId)) throw new Error('Plan inválido.');
        const preferences = await supabase.from('user_profiles').select('disliked_ingredient_ids,disliked_categories,allowed_exceptions').eq('user_id', userId).maybeSingle();
        if (preferences.error) throw preferences.error;
        if (preferences.data) {
          const p = preferences.data;
          const conflicts = findDislikedIngredientNames(operation.plan.days.flatMap((day) => Object.values(day.meals).flatMap((meal) => meal?.ingredients.map((ingredient) => ingredient.name) ?? [])),
            { dislikedIngredientIds: p.disliked_ingredient_ids, dislikedCategories: p.disliked_categories, allowedExceptions: p.allowed_exceptions });
          if (conflicts.length) throw new Error('Este plan incluye alimentos que preferís evitar. Regeneralo antes de aplicarlo.');
        }
      }
      const custom = await supabase.from('custom_ingredients').select('*').eq('user_id', userId);
      if (custom.error) throw custom.error;
      const ingredients = [...INGREDIENTS_DB, ...(custom.data ?? []) as Ingredient[]];
      const changed = changeCalendarPlan(toClient(before), operation, { today, now: new Date().toISOString(), operationId, ingredients });
      after = toDatabase(changed.state, before);
      summary = changed.summary;
    }
    const committed = await supabase.rpc('commit_calendar_operation', {
      p_user_id: userId, p_before: before, p_after: after, p_operation_id: operationId,
      p_undo_of: operation.kind === 'undo' ? operation.operationId : null,
    });
    if (committed.error) {
      if (committed.error.code === '40001') return res.status(409).json({ error: 'El calendario cambió mientras guardabas. Revisá las coincidencias y volvé a confirmar.' });
      throw committed.error;
    }
    return res.status(200).json({ ...toClient(committed.data as Snapshot), operationId, summary });
  } catch (error) {
    if (error instanceof Error && error.message === 'CALENDAR_SETUP_REQUIRED') return res.status(503).json({ error: 'La administración de planes está pendiente de habilitación en el servidor.' });
    console.error('[calendar-plans]', error);
    return res.status(400).json({ error: error instanceof Error ? error.message : 'No se pudo guardar el cambio. No se aplicó parcialmente.' });
  }
}
