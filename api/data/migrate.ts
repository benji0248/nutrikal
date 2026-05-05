import { createHandler } from '../_lib/handler.js';
import { getSupabase } from '../_lib/supabase.js';

export default createHandler({
  POST: async (_req, res, auth) => {
    const supabase = getSupabase();

    // Check if already migrated
    const { data: migrationRow } = await supabase
      .from('user_migrations')
      .select('user_id')
      .eq('user_id', auth.userId)
      .single();

    if (migrationRow) {
      return res.status(200).json({ migrated: true, skipped: true });
    }

    // Read legacy blob
    const { data: blobRow, error: blobErr } = await supabase
      .from('user_data')
      .select('data')
      .eq('user_id', auth.userId)
      .single();

    if (blobErr && blobErr.code === 'PGRST116') {
      // No blob data — mark as migrated with empty backup
      await supabase.from('user_migrations').insert({
        user_id: auth.userId,
        blob_backup: null,
      });
      return res.status(200).json({ migrated: true, skipped: true, reason: 'no_blob' });
    }

    if (blobErr) {
      console.error('migrate: blob read error', blobErr);
      return res.status(500).json({ error: 'Error al leer datos existentes' });
    }

    const blob = blobRow?.data as Record<string, unknown> | null;
    if (!blob) {
      await supabase.from('user_migrations').insert({
        user_id: auth.userId,
        blob_backup: null,
      });
      return res.status(200).json({ migrated: true, skipped: true, reason: 'empty_blob' });
    }

    // ── Distribute blob to new tables ──
    const uid = auth.userId;

    // 1. Meals + day_notes from dayPlans
    const dayPlans = (blob.dayPlans ?? {}) as Record<string, {
      date: string;
      meals: Record<string, Array<{
        id: string; name: string; calories?: number; notes?: string;
        linkedRecipeId?: string; entries?: unknown; aiIngredients?: unknown;
        completed?: boolean;
      }>>;
      notes?: string;
    }>;

    const mealRows: Array<Record<string, unknown>> = [];
    const noteRows: Array<Record<string, unknown>> = [];

    for (const [dateKey, plan] of Object.entries(dayPlans)) {
      if (plan.notes) {
        noteRows.push({ user_id: uid, date: dateKey, notes: plan.notes });
      }
      for (const [mealType, meals] of Object.entries(plan.meals)) {
        for (const m of meals) {
          mealRows.push({
            id: m.id,
            user_id: uid,
            date: dateKey,
            meal_type: mealType,
            name: m.name,
            calories: m.calories ?? null,
            notes: m.notes ?? null,
            linked_recipe_id: m.linkedRecipeId ?? null,
            entries: m.entries ?? [],
            ai_ingredients: m.aiIngredients ?? [],
            completed: m.completed ?? false,
          });
        }
      }
    }

    // 2. Profile
    const profile = blob.profile as Record<string, unknown> | undefined;

    // 3. Notifications
    const notifications = (blob.notifications ?? []) as Array<{
      id: string; label: string; time: string; enabled: boolean;
      type: string; mealType?: string;
    }>;

    // 4. Calculator recipes
    const savedRecipes = (blob.savedRecipes ?? []) as Array<{
      id: string; name: string; entries: unknown; totalMacros: unknown; savedAt: string;
    }>;

    // 5. Custom ingredients
    const customIngredients = (blob.customIngredients ?? []) as Array<{
      id: string; name: string; category: string;
      calories: number; protein: number; carbs: number; fat: number;
    }>;

    // 6. Custom dishes
    const customDishes = (blob.customDishes ?? []) as Array<{
      id: string; name: string; category: string; tags: unknown;
      ingredients: unknown; defaultServings: number; prepMinutes: number;
      humanPortion: string;
    }>;

    // 7. Shopping lists + items
    const shoppingLists = (blob.shoppingLists ?? []) as Array<{
      id: string; name: string; createdAt: string;
      dateRange: { from: string; to: string };
      items: Array<{
        id: string; ingredientId: string; name: string;
        quantity: string; section: string; checked: boolean;
      }>;
    }>;

    // 8. Settings
    const settings = (blob.settings ?? {}) as { theme?: string; showCalories?: boolean };

    // 9. Favorites
    const favoriteDishes = (blob.favoriteDishes ?? []) as string[];

    // 10. Ingredient signals
    const signals = (blob.ingredientSignalLog ?? []) as Array<{
      id: string; fecha: string; comida: string;
      ingredientes_sugeridos: unknown; ingredientes_finales: unknown;
      ingredientes_removidos: unknown; ingredientes_agregados: unknown;
      accion: string;
    }>;

    // ── Insert all data ──
    // Use individual inserts with error tolerance (if one fails, log and continue)

    if (mealRows.length > 0) {
      // Batch in chunks of 500
      for (let i = 0; i < mealRows.length; i += 500) {
        const chunk = mealRows.slice(i, i + 500);
        const { error } = await supabase.from('meals').insert(chunk);
        if (error) console.error('migrate: meals insert error', error);
      }
    }

    if (noteRows.length > 0) {
      const { error } = await supabase.from('day_notes').insert(noteRows);
      if (error) console.error('migrate: day_notes insert error', error);
    }

    if (profile) {
      const { error } = await supabase.from('user_profiles').upsert({
        user_id: uid,
        profile_id: profile.id ?? uid,
        name: profile.name ?? '',
        birth_date: profile.birthDate ?? '',
        sex: profile.sex ?? 'male',
        height_cm: profile.heightCm ?? 170,
        weight_kg: profile.weightKg ?? 70,
        activity_level: profile.activityLevel ?? 'moderate',
        goal: profile.goal ?? 'maintain',
        restrictions: profile.restrictions ?? [],
        disliked_ingredient_ids: profile.dislikedIngredientIds ?? [],
        disliked_categories: profile.dislikedCategories ?? [],
        allowed_exceptions: profile.allowedExceptions ?? [],
        nationality: profile.nationality ?? null,
        created_at: profile.createdAt ?? new Date().toISOString(),
        updated_at: profile.updatedAt ?? new Date().toISOString(),
        last_recalibration: profile.lastRecalibration ?? new Date().toISOString(),
      });
      if (error) console.error('migrate: user_profiles insert error', error);
    }

    if (notifications.length > 0) {
      const rows = notifications.map((n) => ({
        id: n.id,
        user_id: uid,
        label: n.label,
        time: n.time,
        enabled: n.enabled,
        type: n.type,
        meal_type: n.mealType ?? null,
      }));
      const { error } = await supabase.from('notifications').insert(rows);
      if (error) console.error('migrate: notifications insert error', error);
    }

    if (savedRecipes.length > 0) {
      const rows = savedRecipes.map((r) => ({
        id: r.id,
        user_id: uid,
        name: r.name,
        entries: r.entries,
        total_macros: r.totalMacros,
        saved_at: r.savedAt,
      }));
      const { error } = await supabase.from('calculator_recipes').insert(rows);
      if (error) console.error('migrate: calculator_recipes insert error', error);
    }

    if (customIngredients.length > 0) {
      const rows = customIngredients.map((i) => ({
        id: i.id,
        user_id: uid,
        name: i.name,
        category: i.category,
        calories: i.calories,
        protein: i.protein,
        carbs: i.carbs,
        fat: i.fat,
      }));
      const { error } = await supabase.from('custom_ingredients').insert(rows);
      if (error) console.error('migrate: custom_ingredients insert error', error);
    }

    if (customDishes.length > 0) {
      const rows = customDishes.map((d) => ({
        id: d.id,
        user_id: uid,
        name: d.name,
        category: d.category,
        tags: d.tags,
        ingredients: d.ingredients,
        default_servings: d.defaultServings,
        prep_minutes: d.prepMinutes,
        human_portion: d.humanPortion,
      }));
      const { error } = await supabase.from('custom_dishes').insert(rows);
      if (error) console.error('migrate: custom_dishes insert error', error);
    }

    for (const list of shoppingLists) {
      const { error: listErr } = await supabase.from('shopping_lists').insert({
        id: list.id,
        user_id: uid,
        name: list.name,
        created_at: list.createdAt,
        date_from: list.dateRange.from,
        date_to: list.dateRange.to,
      });
      if (listErr) {
        console.error('migrate: shopping_lists insert error', listErr);
        continue;
      }

      if (list.items.length > 0) {
        const itemRows = list.items.map((item) => ({
          id: item.id,
          list_id: list.id,
          user_id: uid,
          ingredient_id: item.ingredientId,
          name: item.name,
          quantity: item.quantity,
          section: item.section,
          checked: item.checked,
        }));
        const { error: itemErr } = await supabase.from('shopping_items').insert(itemRows);
        if (itemErr) console.error('migrate: shopping_items insert error', itemErr);
      }
    }

    // Settings
    await supabase.from('user_settings').upsert({
      user_id: uid,
      theme: settings.theme ?? 'dark',
      show_calories: settings.showCalories ?? false,
    });

    // Favorites
    if (favoriteDishes.length > 0) {
      const rows = favoriteDishes.map((name) => ({
        user_id: uid,
        dish_name: name,
      }));
      const { error } = await supabase.from('favorites').insert(rows);
      if (error) console.error('migrate: favorites insert error', error);
    }

    // Ingredient signals (batch in chunks)
    if (signals.length > 0) {
      for (let i = 0; i < signals.length; i += 500) {
        const chunk = signals.slice(i, i + 500).map((s) => ({
          id: s.id,
          user_id: uid,
          fecha: s.fecha,
          comida: s.comida,
          ingredientes_sugeridos: s.ingredientes_sugeridos,
          ingredientes_finales: s.ingredientes_finales,
          ingredientes_removidos: s.ingredientes_removidos,
          ingredientes_agregados: s.ingredientes_agregados,
          accion: s.accion,
        }));
        const { error } = await supabase.from('ingredient_signals').insert(chunk);
        if (error) console.error('migrate: ingredient_signals insert error', error);
      }
    }

    // Mark migration complete + backup
    await supabase.from('user_migrations').insert({
      user_id: uid,
      blob_backup: blob,
    });

    return res.status(200).json({ migrated: true, skipped: false });
  },
});
