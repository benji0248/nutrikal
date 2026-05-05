import { createHandler } from '../_lib/handler.js';
import { getSupabase } from '../_lib/supabase.js';

export default createHandler({
  GET: async (_req, res, auth) => {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('calculator_recipes')
      .select('*')
      .eq('user_id', auth.userId);

    if (error) return res.status(500).json({ error: 'Error al leer recetas' });

    const recipes = (data ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      entries: r.entries ?? [],
      totalMacros: r.total_macros ?? { calories: 0, protein: 0, carbs: 0, fat: 0 },
      savedAt: r.saved_at,
    }));

    return res.status(200).json({ recipes });
  },

  POST: async (req, res, auth) => {
    const supabase = getSupabase();
    const { recipe } = req.body;

    if (!recipe?.id || !recipe?.name) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const { error } = await supabase.from('calculator_recipes').insert({
      id: recipe.id,
      user_id: auth.userId,
      name: recipe.name,
      entries: recipe.entries ?? [],
      total_macros: recipe.totalMacros ?? {},
      saved_at: recipe.savedAt ?? new Date().toISOString(),
    });

    if (error) return res.status(500).json({ error: 'Error al guardar receta' });
    return res.status(200).json({ ok: true });
  },
});
