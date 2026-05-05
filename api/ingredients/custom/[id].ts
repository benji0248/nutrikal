import { createHandler } from '../../_lib/handler.js';
import { getSupabase } from '../../_lib/supabase.js';

export default createHandler({
  PUT: async (req, res, auth) => {
    const supabase = getSupabase();
    const id = req.query.id as string;
    const { ingredient } = req.body;

    if (!ingredient) return res.status(400).json({ error: 'Datos incompletos' });

    const updates: Record<string, unknown> = {};
    if (ingredient.name !== undefined) updates.name = ingredient.name;
    if (ingredient.category !== undefined) updates.category = ingredient.category;
    if (ingredient.calories !== undefined) updates.calories = ingredient.calories;
    if (ingredient.protein !== undefined) updates.protein = ingredient.protein;
    if (ingredient.carbs !== undefined) updates.carbs = ingredient.carbs;
    if (ingredient.fat !== undefined) updates.fat = ingredient.fat;

    const { error } = await supabase
      .from('custom_ingredients')
      .update(updates)
      .eq('id', id)
      .eq('user_id', auth.userId);

    if (error) return res.status(500).json({ error: 'Error al actualizar ingrediente' });
    return res.status(200).json({ ok: true });
  },

  DELETE: async (req, res, auth) => {
    const supabase = getSupabase();
    const id = req.query.id as string;

    const { error } = await supabase
      .from('custom_ingredients')
      .delete()
      .eq('id', id)
      .eq('user_id', auth.userId);

    if (error) return res.status(500).json({ error: 'Error al eliminar ingrediente' });
    return res.status(200).json({ ok: true });
  },
});
