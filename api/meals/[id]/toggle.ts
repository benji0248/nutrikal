import { createHandler } from '../../_lib/handler.js';
import { getSupabase } from '../../_lib/supabase.js';

export default createHandler({
  PATCH: async (req, res, auth) => {
    const supabase = getSupabase();
    const id = req.query.id as string;

    // Read current state
    const { data: row, error: readErr } = await supabase
      .from('meals')
      .select('completed')
      .eq('id', id)
      .eq('user_id', auth.userId)
      .single();

    if (readErr || !row) {
      return res.status(404).json({ error: 'Comida no encontrada' });
    }

    const { error } = await supabase
      .from('meals')
      .update({ completed: !row.completed })
      .eq('id', id)
      .eq('user_id', auth.userId);

    if (error) return res.status(500).json({ error: 'Error al actualizar' });
    return res.status(200).json({ ok: true, completed: !row.completed });
  },
});
