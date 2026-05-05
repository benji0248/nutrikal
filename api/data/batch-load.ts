import { createHandler } from '../_lib/handler.js';
import { getSupabase } from '../_lib/supabase.js';

export default createHandler({
  GET: async (req, res, auth) => {
    const supabase = getSupabase();
    const uid = auth.userId;

    // Calculate 90-day window for meals and notes
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const dateFrom = ninetyDaysAgo.toISOString().slice(0, 10);

    // Run all queries in parallel
    const [
      mealsRes,
      notesRes,
      profileRes,
      notificationsRes,
      recipesRes,
      ingredientsRes,
      dishesRes,
      listsRes,
      settingsRes,
      favoritesRes,
      signalsRes,
    ] = await Promise.all([
      supabase
        .from('meals')
        .select('*')
        .eq('user_id', uid)
        .gte('date', dateFrom)
        .order('date', { ascending: true }),
      supabase
        .from('day_notes')
        .select('*')
        .eq('user_id', uid)
        .gte('date', dateFrom),
      supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', uid)
        .single(),
      supabase
        .from('notifications')
        .select('*')
        .eq('user_id', uid),
      supabase
        .from('calculator_recipes')
        .select('*')
        .eq('user_id', uid),
      supabase
        .from('custom_ingredients')
        .select('*')
        .eq('user_id', uid),
      supabase
        .from('custom_dishes')
        .select('*')
        .eq('user_id', uid),
      supabase
        .from('shopping_lists')
        .select('*, shopping_items(*)')
        .eq('user_id', uid)
        .order('created_at', { ascending: false }),
      supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', uid)
        .single(),
      supabase
        .from('favorites')
        .select('dish_name')
        .eq('user_id', uid),
      supabase
        .from('ingredient_signals')
        .select('*')
        .eq('user_id', uid)
        .order('fecha', { ascending: false })
        .limit(Number(req.query.signalLimit) || 800),
    ]);

    // Transform profile from DB format to app format
    const profileRow = profileRes.data;
    const profile = profileRow
      ? {
          id: profileRow.profile_id,
          name: profileRow.name,
          birthDate: profileRow.birth_date,
          sex: profileRow.sex,
          heightCm: profileRow.height_cm,
          weightKg: profileRow.weight_kg,
          activityLevel: profileRow.activity_level,
          goal: profileRow.goal,
          restrictions: profileRow.restrictions ?? [],
          dislikedIngredientIds: profileRow.disliked_ingredient_ids ?? [],
          dislikedCategories: profileRow.disliked_categories ?? [],
          allowedExceptions: profileRow.allowed_exceptions ?? [],
          nationality: profileRow.nationality ?? undefined,
          createdAt: profileRow.created_at,
          updatedAt: profileRow.updated_at,
          lastRecalibration: profileRow.last_recalibration,
        }
      : null;

    // Transform meals from DB format to app format
    const meals = (mealsRes.data ?? []).map((m) => ({
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

    // Transform day notes
    const dayNotes = (notesRes.data ?? []).map((n) => ({
      date: n.date,
      notes: n.notes,
    }));

    // Transform notifications
    const notifications = (notificationsRes.data ?? []).map((n) => ({
      id: n.id,
      label: n.label,
      time: n.time,
      enabled: n.enabled,
      type: n.type,
      mealType: n.meal_type ?? undefined,
    }));

    // Transform calculator recipes
    const calculatorRecipes = (recipesRes.data ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      entries: r.entries ?? [],
      totalMacros: r.total_macros ?? { calories: 0, protein: 0, carbs: 0, fat: 0 },
      savedAt: r.saved_at,
    }));

    // Transform custom ingredients
    const customIngredients = (ingredientsRes.data ?? []).map((i) => ({
      id: i.id,
      name: i.name,
      category: i.category,
      calories: i.calories,
      protein: i.protein,
      carbs: i.carbs,
      fat: i.fat,
      isCustom: true as const,
    }));

    // Transform custom dishes
    const customDishes = (dishesRes.data ?? []).map((d) => ({
      id: d.id,
      name: d.name,
      category: d.category,
      tags: d.tags ?? [],
      ingredients: d.ingredients ?? [],
      defaultServings: d.default_servings ?? 1,
      prepMinutes: d.prep_minutes ?? 0,
      humanPortion: d.human_portion ?? '',
      isCustom: true as const,
      createdBy: uid,
    }));

    // Transform shopping lists + items
    const shoppingLists = (listsRes.data ?? []).map((l) => ({
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

    // Settings
    const settingsRow = settingsRes.data;
    const settings = {
      theme: settingsRow?.theme ?? 'dark',
      showCalories: settingsRow?.show_calories ?? false,
    };

    // Favorites
    const favorites = (favoritesRes.data ?? []).map(
      (f) => f.dish_name as string,
    );

    // Ingredient signals
    const ingredientSignals = (signalsRes.data ?? []).map((s) => ({
      id: s.id,
      fecha: s.fecha,
      comida: s.comida,
      ingredientes_sugeridos: s.ingredientes_sugeridos ?? [],
      ingredientes_finales: s.ingredientes_finales ?? [],
      ingredientes_removidos: s.ingredientes_removidos ?? [],
      ingredientes_agregados: s.ingredientes_agregados ?? [],
      accion: s.accion,
    }));

    return res.status(200).json({
      meals,
      dayNotes,
      profile,
      notifications,
      calculatorRecipes,
      customIngredients,
      customDishes,
      shoppingLists,
      settings,
      favorites,
      ingredientSignals,
    });
  },
});
