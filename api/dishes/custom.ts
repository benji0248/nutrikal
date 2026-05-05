import { createHandler } from '../_lib/handler.js';
import { getSupabase } from '../_lib/supabase.js';

export default createHandler({
  GET: async (_req, res, auth) => {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('custom_dishes')
      .select('*')
      .eq('user_id', auth.userId);

    if (error) return res.status(500).json({ error: 'Error al leer platos' });

    const dishes = (data ?? []).map((d) => ({
      id: d.id,
      name: d.name,
      category: d.category,
      tags: d.tags ?? [],
      ingredients: d.ingredients ?? [],
      defaultServings: d.default_servings ?? 1,
      prepMinutes: d.prep_minutes ?? 0,
      humanPortion: d.human_portion ?? '',
      isCustom: true,
      createdBy: auth.userId,
    }));

    return res.status(200).json({ dishes });
  },

  POST: async (req, res, auth) => {
    const supabase = getSupabase();
    const { dish } = req.body;

    if (!dish?.id || !dish?.name) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const { error } = await supabase.from('custom_dishes').insert({
      id: dish.id,
      user_id: auth.userId,
      name: dish.name,
      category: dish.category,
      tags: dish.tags ?? [],
      ingredients: dish.ingredients ?? [],
      default_servings: dish.defaultServings ?? 1,
      prep_minutes: dish.prepMinutes ?? 0,
      human_portion: dish.humanPortion ?? '',
    });

    if (error) return res.status(500).json({ error: 'Error al guardar plato' });
    return res.status(200).json({ ok: true });
  },
});
