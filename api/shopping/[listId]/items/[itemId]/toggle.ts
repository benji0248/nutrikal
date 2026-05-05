import { createHandler } from '../../../../_lib/handler.js';
import { getSupabase } from '../../../../_lib/supabase.js';

export default createHandler({
  PATCH: async (req, res, auth) => {
    const supabase = getSupabase();
    const itemId = req.query.itemId as string;

    const { data: row, error: readErr } = await supabase
      .from('shopping_items')
      .select('checked')
      .eq('id', itemId)
      .eq('user_id', auth.userId)
      .single();

    if (readErr || !row) {
      return res.status(404).json({ error: 'Item no encontrado' });
    }

    const { error } = await supabase
      .from('shopping_items')
      .update({ checked: !row.checked })
      .eq('id', itemId)
      .eq('user_id', auth.userId);

    if (error) return res.status(500).json({ error: 'Error al actualizar' });
    return res.status(200).json({ ok: true, checked: !row.checked });
  },
});
