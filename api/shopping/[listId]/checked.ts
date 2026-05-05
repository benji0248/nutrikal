import { createHandler } from '../../_lib/handler.js';
import { getSupabase } from '../../_lib/supabase.js';

export default createHandler({
  DELETE: async (req, res, auth) => {
    const supabase = getSupabase();
    const listId = req.query.listId as string;

    const { error } = await supabase
      .from('shopping_items')
      .delete()
      .eq('list_id', listId)
      .eq('user_id', auth.userId)
      .eq('checked', true);

    if (error) return res.status(500).json({ error: 'Error al eliminar marcados' });
    return res.status(200).json({ ok: true });
  },
});
