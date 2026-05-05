import { createHandler } from '../_lib/handler.js';
import { getSupabase } from '../_lib/supabase.js';

export default createHandler({
  GET: async (_req, res, auth) => {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('favorites')
      .select('dish_name')
      .eq('user_id', auth.userId);

    if (error) return res.status(500).json({ error: 'Error al leer favoritos' });

    return res.status(200).json({
      favorites: (data ?? []).map((f) => f.dish_name),
    });
  },

  POST: async (req, res, auth) => {
    const supabase = getSupabase();
    const { dishName } = req.body;

    if (!dishName) return res.status(400).json({ error: 'dishName requerido' });

    const { error } = await supabase.from('favorites').upsert(
      { user_id: auth.userId, dish_name: dishName },
      { onConflict: 'user_id,dish_name' },
    );

    if (error) return res.status(500).json({ error: 'Error al guardar favorito' });
    return res.status(200).json({ ok: true });
  },

  DELETE: async (req, res, auth) => {
    const supabase = getSupabase();
    const dishName = (req.query.dishName as string) || req.body?.dishName;

    if (!dishName) return res.status(400).json({ error: 'dishName requerido' });

    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', auth.userId)
      .eq('dish_name', dishName);

    if (error) return res.status(500).json({ error: 'Error al eliminar favorito' });
    return res.status(200).json({ ok: true });
  },
});
