import { createHandler } from '../_lib/handler.js';
import { getSupabase } from '../_lib/supabase.js';

export default createHandler({
  GET: async (req, res, auth) => {
    const supabase = getSupabase();
    const date = req.query.date as string;

    const { data, error } = await supabase
      .from('day_notes')
      .select('notes')
      .eq('user_id', auth.userId)
      .eq('date', date)
      .single();

    if (error && error.code === 'PGRST116') {
      return res.status(200).json({ notes: '' });
    }
    if (error) return res.status(500).json({ error: 'Error al leer notas' });

    return res.status(200).json({ notes: data.notes ?? '' });
  },

  PUT: async (req, res, auth) => {
    const supabase = getSupabase();
    const date = req.query.date as string;
    const { notes } = req.body;

    const { error } = await supabase.from('day_notes').upsert(
      { user_id: auth.userId, date, notes: notes ?? '' },
      { onConflict: 'user_id,date' },
    );

    if (error) return res.status(500).json({ error: 'Error al guardar notas' });
    return res.status(200).json({ ok: true });
  },
});
