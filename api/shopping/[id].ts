import { createHandler } from '../_lib/handler.js';
import { getSupabase } from '../_lib/supabase.js';

export default createHandler({
  PUT: async (req, res, auth) => {
    const supabase = getSupabase();
    const id = req.query.id as string;
    const { items } = req.body;

    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'items[] requerido' });
    }

    // Delete existing items and re-insert
    await supabase.from('shopping_items').delete().eq('list_id', id).eq('user_id', auth.userId);

    if (items.length > 0) {
      const rows = items.map((item: Record<string, unknown>) => ({
        id: item.id,
        list_id: id,
        user_id: auth.userId,
        ingredient_id: item.ingredientId,
        name: item.name,
        quantity: item.quantity,
        section: item.section,
        checked: item.checked ?? false,
      }));

      const { error } = await supabase.from('shopping_items').insert(rows);
      if (error) return res.status(500).json({ error: 'Error al actualizar items' });
    }

    return res.status(200).json({ ok: true });
  },

  DELETE: async (req, res, auth) => {
    const supabase = getSupabase();
    const id = req.query.id as string;

    // Items cascade-delete via FK
    const { error } = await supabase
      .from('shopping_lists')
      .delete()
      .eq('id', id)
      .eq('user_id', auth.userId);

    if (error) return res.status(500).json({ error: 'Error al eliminar lista' });
    return res.status(200).json({ ok: true });
  },
});
