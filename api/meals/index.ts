import { createHandler } from '../_lib/handler.js';
import { getSupabase } from '../_lib/supabase.js';

export default createHandler({
  GET: async (req, res, auth) => {
    const supabase = getSupabase();
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;

    let query = supabase
      .from('meals')
      .select('*')
      .eq('user_id', auth.userId)
      .order('date', { ascending: true });

    if (from) query = query.gte('date', from);
    if (to) query = query.lte('date', to);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: 'Error al leer comidas' });

    const meals = (data ?? []).map((m) => ({
      id: m.id,
      date: m.date,
      mealType: m.meal_type,
      name: m.name,
      calories: m.calories,
      notes: m.notes,
      linkedRecipeId: m.linked_recipe_id,
      entries: m.entries ?? [],
      aiIngredients: m.ai_ingredients ?? [],
      completed: m.completed ?? false,
    }));

    return res.status(200).json({ meals });
  },

  POST: async (req, res, auth) => {
    const supabase = getSupabase();
    const { date, mealType, meal } = req.body;

    if (!date || !mealType || !meal?.id || !meal?.name) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const { error } = await supabase.from('meals').upsert({
      id: meal.id,
      user_id: auth.userId,
      date,
      meal_type: mealType,
      name: meal.name,
      calories: meal.calories ?? null,
      notes: meal.notes ?? null,
      linked_recipe_id: meal.linkedRecipeId ?? null,
      entries: meal.entries ?? [],
      ai_ingredients: meal.aiIngredients ?? [],
      completed: meal.completed ?? false,
    });

    if (error) {
      console.error('meals POST error:', error);
      return res.status(500).json({ error: 'Error al guardar comida' });
    }

    return res.status(200).json({ ok: true });
  },
});
