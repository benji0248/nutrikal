import { createHandler } from '../../_lib/handler.js';
import { getSupabase } from '../../_lib/supabase.js';

export default createHandler({
  PATCH: async (req, res, auth) => {
    const supabase = getSupabase();
    const id = req.query.id as string;

    const { data: row, error: readErr } = await supabase
      .from('notifications')
      .select('enabled')
      .eq('id', id)
      .eq('user_id', auth.userId)
      .single();

    if (readErr || !row) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }

    const { error } = await supabase
      .from('notifications')
      .update({ enabled: !row.enabled })
      .eq('id', id)
      .eq('user_id', auth.userId);

    if (error) return res.status(500).json({ error: 'Error al actualizar' });
    return res.status(200).json({ ok: true, enabled: !row.enabled });
  },
});
