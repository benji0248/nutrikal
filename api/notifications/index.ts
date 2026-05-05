import { createHandler } from '../_lib/handler.js';
import { getSupabase } from '../_lib/supabase.js';

export default createHandler({
  GET: async (_req, res, auth) => {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', auth.userId);

    if (error) return res.status(500).json({ error: 'Error al leer notificaciones' });

    const notifications = (data ?? []).map((n) => ({
      id: n.id,
      label: n.label,
      time: n.time,
      enabled: n.enabled,
      type: n.type,
      mealType: n.meal_type ?? undefined,
    }));

    return res.status(200).json({ notifications });
  },

  POST: async (req, res, auth) => {
    const supabase = getSupabase();
    const { notification } = req.body;

    if (!notification?.id || !notification?.label) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const { error } = await supabase.from('notifications').insert({
      id: notification.id,
      user_id: auth.userId,
      label: notification.label,
      time: notification.time,
      enabled: notification.enabled ?? true,
      type: notification.type,
      meal_type: notification.mealType ?? null,
    });

    if (error) return res.status(500).json({ error: 'Error al crear notificación' });
    return res.status(200).json({ ok: true });
  },
});
