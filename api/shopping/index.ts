import { createHandler } from '../_lib/handler.js';
import { getSupabase } from '../_lib/supabase.js';

export default createHandler({
  GET: async (_req, res, auth) => {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('shopping_lists')
      .select('*, shopping_items(*)')
      .eq('user_id', auth.userId)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: 'Error al leer listas' });

    const lists = (data ?? []).map((l) => ({
      id: l.id,
      name: l.name,
      createdAt: l.created_at,
      dateRange: { from: l.date_from, to: l.date_to },
      items: (l.shopping_items ?? []).map((item: Record<string, unknown>) => ({
        id: item.id as string,
        ingredientId: item.ingredient_id as string,
        name: item.name as string,
        quantity: item.quantity as string,
        section: item.section as string,
        checked: (item.checked as boolean) ?? false,
      })),
    }));

    return res.status(200).json({ lists });
  },

  POST: async (req, res, auth) => {
    const supabase = getSupabase();
    const { list } = req.body;

    if (!list?.id || !list?.name) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    // Insert list
    const { error: listErr } = await supabase.from('shopping_lists').insert({
      id: list.id,
      user_id: auth.userId,
      name: list.name,
      created_at: list.createdAt ?? new Date().toISOString(),
      date_from: list.dateRange?.from ?? new Date().toISOString().slice(0, 10),
      date_to: list.dateRange?.to ?? new Date().toISOString().slice(0, 10),
    });

    if (listErr) {
      console.error('shopping POST list error:', listErr);
      return res.status(500).json({ error: 'Error al crear lista' });
    }

    // Insert items if provided
    const items = list.items as Array<Record<string, unknown>> | undefined;
    if (items && items.length > 0) {
      const itemRows = items.map((item) => ({
        id: item.id,
        list_id: list.id,
        user_id: auth.userId,
        ingredient_id: item.ingredientId,
        name: item.name,
        quantity: item.quantity,
        section: item.section,
        checked: item.checked ?? false,
      }));

      const { error: itemErr } = await supabase.from('shopping_items').insert(itemRows);
      if (itemErr) console.error('shopping POST items error:', itemErr);
    }

    return res.status(200).json({ ok: true });
  },
});
