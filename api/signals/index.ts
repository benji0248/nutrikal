import { createHandler } from '../_lib/handler.js';
import { getSupabase } from '../_lib/supabase.js';

export default createHandler({
  GET: async (req, res, auth) => {
    const supabase = getSupabase();
    const limit = Number(req.query.limit) || 800;

    const { data, error } = await supabase
      .from('ingredient_signals')
      .select('*')
      .eq('user_id', auth.userId)
      .order('fecha', { ascending: false })
      .limit(limit);

    if (error) return res.status(500).json({ error: 'Error al leer señales' });

    const signals = (data ?? []).map((s) => ({
      id: s.id,
      fecha: s.fecha,
      comida: s.comida,
      ingredientes_sugeridos: s.ingredientes_sugeridos ?? [],
      ingredientes_finales: s.ingredientes_finales ?? [],
      ingredientes_removidos: s.ingredientes_removidos ?? [],
      ingredientes_agregados: s.ingredientes_agregados ?? [],
      accion: s.accion,
    }));

    return res.status(200).json({ signals });
  },

  POST: async (req, res, auth) => {
    const supabase = getSupabase();
    const { signals } = req.body;

    if (!Array.isArray(signals) || signals.length === 0) {
      return res.status(400).json({ error: 'signals[] requerido' });
    }

    const rows = signals.map((s: Record<string, unknown>) => ({
      id: s.id,
      user_id: auth.userId,
      fecha: s.fecha,
      comida: s.comida,
      ingredientes_sugeridos: s.ingredientes_sugeridos ?? [],
      ingredientes_finales: s.ingredientes_finales ?? [],
      ingredientes_removidos: s.ingredientes_removidos ?? [],
      ingredientes_agregados: s.ingredientes_agregados ?? [],
      accion: s.accion,
    }));

    const { error } = await supabase.from('ingredient_signals').insert(rows);
    if (error) {
      console.error('signals POST error:', error);
      return res.status(500).json({ error: 'Error al guardar señales' });
    }

    return res.status(200).json({ ok: true, count: rows.length });
  },
});
