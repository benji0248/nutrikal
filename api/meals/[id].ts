import { createHandler } from '../_lib/handler.js';
import { getSupabase } from '../_lib/supabase.js';

export default createHandler({
  PUT: async (req, res, auth) => {
    const supabase = getSupabase();
    const id = req.query.id as string;
    const { meal } = req.body;

    if (!meal) return res.status(400).json({ error: 'Datos incompletos' });

    const updates: Record<string, unknown> = {};
    if (meal.name !== undefined) updates.name = meal.name;
    if (meal.calories !== undefined) updates.calories = meal.calories;
    if (meal.notes !== undefined) updates.notes = meal.notes;
    if (meal.entries !== undefined) updates.entries = meal.entries;
    if (meal.aiIngredients !== undefined) updates.ai_ingredients = meal.aiIngredients;
    if (meal.completed !== undefined) updates.completed = meal.completed;

    const { error } = await supabase
      .from('meals')
      .update(updates)
      .eq('id', id)
      .eq('user_id', auth.userId);

    if (error) return res.status(500).json({ error: 'Error al actualizar comida' });
    return res.status(200).json({ ok: true });
  },

  DELETE: async (req, res, auth) => {
    const supabase = getSupabase();
    const id = req.query.id as string;

    const { error } = await supabase
      .from('meals')
      .delete()
      .eq('id', id)
      .eq('user_id', auth.userId);

    if (error) return res.status(500).json({ error: 'Error al eliminar comida' });
    return res.status(200).json({ ok: true });
  },
});
