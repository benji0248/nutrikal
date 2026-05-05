import { createHandler } from '../../_lib/handler.js';
import { getSupabase } from '../../_lib/supabase.js';

export default createHandler({
  PUT: async (req, res, auth) => {
    const supabase = getSupabase();
    const id = req.query.id as string;
    const { dish } = req.body;

    if (!dish) return res.status(400).json({ error: 'Datos incompletos' });

    const updates: Record<string, unknown> = {};
    if (dish.name !== undefined) updates.name = dish.name;
    if (dish.category !== undefined) updates.category = dish.category;
    if (dish.tags !== undefined) updates.tags = dish.tags;
    if (dish.ingredients !== undefined) updates.ingredients = dish.ingredients;
    if (dish.defaultServings !== undefined) updates.default_servings = dish.defaultServings;
    if (dish.prepMinutes !== undefined) updates.prep_minutes = dish.prepMinutes;
    if (dish.humanPortion !== undefined) updates.human_portion = dish.humanPortion;

    const { error } = await supabase
      .from('custom_dishes')
      .update(updates)
      .eq('id', id)
      .eq('user_id', auth.userId);

    if (error) return res.status(500).json({ error: 'Error al actualizar plato' });
    return res.status(200).json({ ok: true });
  },

  DELETE: async (req, res, auth) => {
    const supabase = getSupabase();
    const id = req.query.id as string;

    const { error } = await supabase
      .from('custom_dishes')
      .delete()
      .eq('id', id)
      .eq('user_id', auth.userId);

    if (error) return res.status(500).json({ error: 'Error al eliminar plato' });
    return res.status(200).json({ ok: true });
  },
});
