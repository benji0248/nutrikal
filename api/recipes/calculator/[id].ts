import { createHandler } from '../../_lib/handler.js';
import { getSupabase } from '../../_lib/supabase.js';

export default createHandler({
  DELETE: async (req, res, auth) => {
    const supabase = getSupabase();
    const id = req.query.id as string;

    const { error } = await supabase
      .from('calculator_recipes')
      .delete()
      .eq('id', id)
      .eq('user_id', auth.userId);

    if (error) return res.status(500).json({ error: 'Error al eliminar receta' });
    return res.status(200).json({ ok: true });
  },
});
