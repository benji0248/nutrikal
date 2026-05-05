import { createHandler } from '../_lib/handler.js';
import { getSupabase } from '../_lib/supabase.js';

export default createHandler({
  GET: async (_req, res, auth) => {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', auth.userId)
      .single();

    if (error && error.code === 'PGRST116') {
      return res.status(200).json({ settings: { theme: 'dark', showCalories: false } });
    }
    if (error) return res.status(500).json({ error: 'Error al leer ajustes' });

    return res.status(200).json({
      settings: {
        theme: data.theme ?? 'dark',
        showCalories: data.show_calories ?? false,
      },
    });
  },

  PUT: async (req, res, auth) => {
    const supabase = getSupabase();
    const { theme, showCalories } = req.body;

    const updates: Record<string, unknown> = { user_id: auth.userId };
    if (theme !== undefined) updates.theme = theme;
    if (showCalories !== undefined) updates.show_calories = showCalories;

    const { error } = await supabase.from('user_settings').upsert(updates);

    if (error) return res.status(500).json({ error: 'Error al guardar ajustes' });
    return res.status(200).json({ ok: true });
  },
});
