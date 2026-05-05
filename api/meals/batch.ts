import { createHandler } from '../_lib/handler.js';
import { getSupabase } from '../_lib/supabase.js';

export default createHandler({
  POST: async (req, res, auth) => {
    const supabase = getSupabase();
    const { meals } = req.body;

    if (!Array.isArray(meals) || meals.length === 0) {
      return res.status(400).json({ error: 'meals[] requerido' });
    }

    const rows = meals.map((m: Record<string, unknown>) => ({
      id: m.id,
      user_id: auth.userId,
      date: m.date,
      meal_type: m.mealType,
      name: m.name,
      calories: m.calories ?? null,
      notes: m.notes ?? null,
      linked_recipe_id: m.linkedRecipeId ?? null,
      entries: m.entries ?? [],
      ai_ingredients: m.aiIngredients ?? [],
      completed: m.completed ?? false,
    }));

    const { error } = await supabase.from('meals').upsert(rows);
    if (error) {
      console.error('meals batch error:', error);
      return res.status(500).json({ error: 'Error al guardar comidas' });
    }

    return res.status(200).json({ ok: true, count: rows.length });
  },
});
