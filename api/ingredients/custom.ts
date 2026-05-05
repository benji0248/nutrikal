import { createHandler } from '../_lib/handler.js';
import { getSupabase } from '../_lib/supabase.js';

export default createHandler({
  GET: async (_req, res, auth) => {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('custom_ingredients')
      .select('*')
      .eq('user_id', auth.userId);

    if (error) return res.status(500).json({ error: 'Error al leer ingredientes' });

    const ingredients = (data ?? []).map((i) => ({
      id: i.id,
      name: i.name,
      category: i.category,
      calories: i.calories,
      protein: i.protein,
      carbs: i.carbs,
      fat: i.fat,
      isCustom: true,
    }));

    return res.status(200).json({ ingredients });
  },

  POST: async (req, res, auth) => {
    const supabase = getSupabase();
    const { ingredient } = req.body;

    if (!ingredient?.id || !ingredient?.name) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const { error } = await supabase.from('custom_ingredients').insert({
      id: ingredient.id,
      user_id: auth.userId,
      name: ingredient.name,
      category: ingredient.category,
      calories: ingredient.calories,
      protein: ingredient.protein,
      carbs: ingredient.carbs,
      fat: ingredient.fat,
    });

    if (error) return res.status(500).json({ error: 'Error al guardar ingrediente' });
    return res.status(200).json({ ok: true });
  },
});
