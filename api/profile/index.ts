import { createHandler } from '../_lib/handler.js';
import { getSupabase } from '../_lib/supabase.js';

export default createHandler({
  GET: async (_req, res, auth) => {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', auth.userId)
      .single();

    if (error && error.code === 'PGRST116') {
      return res.status(200).json({ profile: null });
    }
    if (error) return res.status(500).json({ error: 'Error al leer perfil' });

    return res.status(200).json({
      profile: {
        id: data.profile_id,
        name: data.name,
        birthDate: data.birth_date,
        sex: data.sex,
        heightCm: data.height_cm,
        weightKg: data.weight_kg,
        activityLevel: data.activity_level,
        goal: data.goal,
        restrictions: data.restrictions ?? [],
        dislikedIngredientIds: data.disliked_ingredient_ids ?? [],
        dislikedCategories: data.disliked_categories ?? [],
        allowedExceptions: data.allowed_exceptions ?? [],
        nationality: data.nationality ?? undefined,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        lastRecalibration: data.last_recalibration,
      },
    });
  },

  PUT: async (req, res, auth) => {
    const supabase = getSupabase();
    const { profile } = req.body;

    if (!profile) return res.status(400).json({ error: 'Perfil requerido' });

    const { error } = await supabase.from('user_profiles').upsert({
      user_id: auth.userId,
      profile_id: profile.id ?? auth.userId,
      name: profile.name,
      birth_date: profile.birthDate,
      sex: profile.sex,
      height_cm: profile.heightCm,
      weight_kg: profile.weightKg,
      activity_level: profile.activityLevel,
      goal: profile.goal,
      restrictions: profile.restrictions ?? [],
      disliked_ingredient_ids: profile.dislikedIngredientIds ?? [],
      disliked_categories: profile.dislikedCategories ?? [],
      allowed_exceptions: profile.allowedExceptions ?? [],
      nationality: profile.nationality ?? null,
      created_at: profile.createdAt ?? new Date().toISOString(),
      updated_at: profile.updatedAt ?? new Date().toISOString(),
      last_recalibration: profile.lastRecalibration ?? new Date().toISOString(),
    });

    if (error) {
      console.error('profile PUT error:', error);
      return res.status(500).json({ error: 'Error al guardar perfil' });
    }

    return res.status(200).json({ ok: true });
  },
});
