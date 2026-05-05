import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken } from '../_lib/jwt.js';
import { getSupabase } from '../_lib/supabase.js';

interface AuthenticatedRequest {
  userId: string;
}

type RouteHandler = (
  req: VercelRequest,
  res: VercelResponse,
  auth: AuthenticatedRequest,
  segments: string[],
) => Promise<VercelResponse | void>;

function getSegments(req: VercelRequest): string[] {
  const collectFromQueryParam = (): string[] => {
    const raw = req.query.route;
    if (raw === undefined || raw === null) return [];
    const parts: string[] = [];
    const pushChunk = (c: unknown) => {
      if (c === undefined || c === null) return;
      String(c)
        .split('/')
        .filter(Boolean)
        .forEach((p) => parts.push(p));
    };
    if (Array.isArray(raw)) raw.forEach(pushChunk);
    else pushChunk(raw);
    return parts;
  };

  let segments = collectFromQueryParam();

  /** Cuando falta route (rewrite / edge cases), usar pathname sin /api y sin prefijo interno business. */
  const fromPathFallback = (): string[] => {
    const pathRaw = (req.url ?? '').split('?')[0] ?? '';
    let segs = pathRaw.replace(/^\/+/, '').split('/').filter(Boolean);
    if (segs[0] === 'api') segs = segs.slice(1);
    if (segs[0] === 'business') segs = segs.slice(1);
    return segs;
  };

  if (segments.length === 0 || segments[0] === 'api') {
    segments = fromPathFallback();
  }

  return segments;
}

function routeKey(method: string | undefined, segments: string[]): string {
  return `${method ?? 'GET'} ${segments.join('/')}`;
}

async function withAuth(
  req: VercelRequest,
  res: VercelResponse,
  fn: (auth: AuthenticatedRequest, segments: string[]) => Promise<VercelResponse | void>,
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token requerido' });
    }

    const decoded = verifyToken(authHeader.slice(7));
    const auth: AuthenticatedRequest = { userId: decoded.sub };
    const segments = getSegments(req);
    return await fn(auth, segments);
  } catch (err) {
    if (
      (err as Error).name === 'JsonWebTokenError' ||
      (err as Error).name === 'TokenExpiredError'
    ) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }
    console.error(`Business API error [${req.method} ${req.url}]:`, err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

const handlers: Record<string, RouteHandler> = {
  'GET data/batch-load': async (req, res, auth) => {
    const supabase = getSupabase();
    const uid = auth.userId;

    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const dateFrom = ninetyDaysAgo.toISOString().slice(0, 10);

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
      supabase.from('meals').select('*').eq('user_id', uid).gte('date', dateFrom).order('date', { ascending: true }),
      supabase.from('day_notes').select('*').eq('user_id', uid).gte('date', dateFrom),
      supabase.from('user_profiles').select('*').eq('user_id', uid).single(),
      supabase.from('notifications').select('*').eq('user_id', uid),
      supabase.from('calculator_recipes').select('*').eq('user_id', uid),
      supabase.from('custom_ingredients').select('*').eq('user_id', uid),
      supabase.from('custom_dishes').select('*').eq('user_id', uid),
      supabase.from('shopping_lists').select('*, shopping_items(*)').eq('user_id', uid).order('created_at', { ascending: false }),
      supabase.from('user_settings').select('*').eq('user_id', uid).single(),
      supabase.from('favorites').select('dish_name').eq('user_id', uid),
      supabase.from('ingredient_signals').select('*').eq('user_id', uid).order('fecha', { ascending: false }).limit(Number(req.query.signalLimit) || 800),
    ]);

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

    const dayNotes = (notesRes.data ?? []).map((n) => ({ date: n.date, notes: n.notes }));
    const notifications = (notificationsRes.data ?? []).map((n) => ({
      id: n.id,
      label: n.label,
      time: n.time,
      enabled: n.enabled,
      type: n.type,
      mealType: n.meal_type ?? undefined,
    }));
    const calculatorRecipes = (recipesRes.data ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      entries: r.entries ?? [],
      totalMacros: r.total_macros ?? { calories: 0, protein: 0, carbs: 0, fat: 0 },
      savedAt: r.saved_at,
    }));
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
    const settingsRow = settingsRes.data;
    const settings = {
      theme: settingsRow?.theme ?? 'dark',
      showCalories: settingsRow?.show_calories ?? false,
    };
    const favorites = (favoritesRes.data ?? []).map((f) => f.dish_name as string);
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

  'POST data/migrate': async (_req, res, auth) => {
    const supabase = getSupabase();

    const { data: migrationRow } = await supabase
      .from('user_migrations')
      .select('user_id')
      .eq('user_id', auth.userId)
      .single();
    if (migrationRow) return res.status(200).json({ migrated: true, skipped: true });

    const { data: blobRow, error: blobErr } = await supabase
      .from('user_data')
      .select('data')
      .eq('user_id', auth.userId)
      .single();

    if (blobErr && blobErr.code === 'PGRST116') {
      await supabase.from('user_migrations').insert({ user_id: auth.userId, blob_backup: null });
      return res.status(200).json({ migrated: true, skipped: true, reason: 'no_blob' });
    }
    if (blobErr) return res.status(500).json({ error: 'Error al leer datos existentes' });

    const blob = blobRow?.data as Record<string, unknown> | null;
    if (!blob) {
      await supabase.from('user_migrations').insert({ user_id: auth.userId, blob_backup: null });
      return res.status(200).json({ migrated: true, skipped: true, reason: 'empty_blob' });
    }

    const uid = auth.userId;
    const dayPlans = (blob.dayPlans ?? {}) as Record<string, {
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
      if (plan.notes) noteRows.push({ user_id: uid, date: dateKey, notes: plan.notes });
      for (const [mealType, meals] of Object.entries(plan.meals)) {
        for (const m of meals) {
          mealRows.push({
            id: m.id, user_id: uid, date: dateKey, meal_type: mealType, name: m.name,
            calories: m.calories ?? null, notes: m.notes ?? null, linked_recipe_id: m.linkedRecipeId ?? null,
            entries: m.entries ?? [], ai_ingredients: m.aiIngredients ?? [], completed: m.completed ?? false,
          });
        }
      }
    }

    const profile = blob.profile as Record<string, unknown> | undefined;
    const notifications = (blob.notifications ?? []) as Array<{ id: string; label: string; time: string; enabled: boolean; type: string; mealType?: string }>;
    const savedRecipes = (blob.savedRecipes ?? []) as Array<{ id: string; name: string; entries: unknown; totalMacros: unknown; savedAt: string }>;
    const customIngredients = (blob.customIngredients ?? []) as Array<{ id: string; name: string; category: string; calories: number; protein: number; carbs: number; fat: number }>;
    const customDishes = (blob.customDishes ?? []) as Array<{ id: string; name: string; category: string; tags: unknown; ingredients: unknown; defaultServings: number; prepMinutes: number; humanPortion: string }>;
    const shoppingLists = (blob.shoppingLists ?? []) as Array<{
      id: string; name: string; createdAt: string; dateRange: { from: string; to: string };
      items: Array<{ id: string; ingredientId: string; name: string; quantity: string; section: string; checked: boolean }>;
    }>;
    const settings = (blob.settings ?? {}) as { theme?: string; showCalories?: boolean };
    const favoriteDishes = (blob.favoriteDishes ?? []) as string[];
    const signals = (blob.ingredientSignalLog ?? []) as Array<{
      id: string; fecha: string; comida: string;
      ingredientes_sugeridos: unknown; ingredientes_finales: unknown;
      ingredientes_removidos: unknown; ingredientes_agregados: unknown; accion: string;
    }>;

    for (let i = 0; i < mealRows.length; i += 500) {
      const { error } = await supabase.from('meals').insert(mealRows.slice(i, i + 500));
      if (error) console.error('migrate: meals insert error', error);
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
        id: n.id, user_id: uid, label: n.label, time: n.time, enabled: n.enabled, type: n.type, meal_type: n.mealType ?? null,
      }));
      const { error } = await supabase.from('notifications').insert(rows);
      if (error) console.error('migrate: notifications insert error', error);
    }
    if (savedRecipes.length > 0) {
      const rows = savedRecipes.map((r) => ({
        id: r.id, user_id: uid, name: r.name, entries: r.entries, total_macros: r.totalMacros, saved_at: r.savedAt,
      }));
      const { error } = await supabase.from('calculator_recipes').insert(rows);
      if (error) console.error('migrate: calculator_recipes insert error', error);
    }
    if (customIngredients.length > 0) {
      const rows = customIngredients.map((i) => ({
        id: i.id, user_id: uid, name: i.name, category: i.category, calories: i.calories, protein: i.protein, carbs: i.carbs, fat: i.fat,
      }));
      const { error } = await supabase.from('custom_ingredients').insert(rows);
      if (error) console.error('migrate: custom_ingredients insert error', error);
    }
    if (customDishes.length > 0) {
      const rows = customDishes.map((d) => ({
        id: d.id, user_id: uid, name: d.name, category: d.category, tags: d.tags, ingredients: d.ingredients, default_servings: d.defaultServings, prep_minutes: d.prepMinutes, human_portion: d.humanPortion,
      }));
      const { error } = await supabase.from('custom_dishes').insert(rows);
      if (error) console.error('migrate: custom_dishes insert error', error);
    }
    for (const list of shoppingLists) {
      const { error: listErr } = await supabase.from('shopping_lists').insert({
        id: list.id, user_id: uid, name: list.name, created_at: list.createdAt, date_from: list.dateRange.from, date_to: list.dateRange.to,
      });
      if (listErr) continue;
      if (list.items.length > 0) {
        const itemRows = list.items.map((item) => ({
          id: item.id, list_id: list.id, user_id: uid, ingredient_id: item.ingredientId, name: item.name, quantity: item.quantity, section: item.section, checked: item.checked,
        }));
        const { error: itemErr } = await supabase.from('shopping_items').insert(itemRows);
        if (itemErr) console.error('migrate: shopping_items insert error', itemErr);
      }
    }

    await supabase.from('user_settings').upsert({ user_id: uid, theme: settings.theme ?? 'dark', show_calories: settings.showCalories ?? false });
    if (favoriteDishes.length > 0) {
      await supabase.from('favorites').insert(favoriteDishes.map((name) => ({ user_id: uid, dish_name: name })));
    }
    for (let i = 0; i < signals.length; i += 500) {
      const chunk = signals.slice(i, i + 500).map((s) => ({
        id: s.id, user_id: uid, fecha: s.fecha, comida: s.comida,
        ingredientes_sugeridos: s.ingredientes_sugeridos, ingredientes_finales: s.ingredientes_finales,
        ingredientes_removidos: s.ingredientes_removidos, ingredientes_agregados: s.ingredientes_agregados, accion: s.accion,
      }));
      const { error } = await supabase.from('ingredient_signals').insert(chunk);
      if (error) console.error('migrate: ingredient_signals insert error', error);
    }
    await supabase.from('user_migrations').insert({ user_id: uid, blob_backup: blob });

    return res.status(200).json({ migrated: true, skipped: false });
  },

  'GET dishes/custom': async (_req, res, auth) => {
    const { data, error } = await getSupabase().from('custom_dishes').select('*').eq('user_id', auth.userId);
    if (error) return res.status(500).json({ error: 'Error al leer platos' });
    return res.status(200).json({
      dishes: (data ?? []).map((d) => ({
        id: d.id, name: d.name, category: d.category, tags: d.tags ?? [], ingredients: d.ingredients ?? [],
        defaultServings: d.default_servings ?? 1, prepMinutes: d.prep_minutes ?? 0, humanPortion: d.human_portion ?? '',
        isCustom: true, createdBy: auth.userId,
      })),
    });
  },
  'POST dishes/custom': async (req, res, auth) => {
    const { dish } = req.body;
    if (!dish?.id || !dish?.name) return res.status(400).json({ error: 'Datos incompletos' });
    const { error } = await getSupabase().from('custom_dishes').insert({
      id: dish.id, user_id: auth.userId, name: dish.name, category: dish.category, tags: dish.tags ?? [],
      ingredients: dish.ingredients ?? [], default_servings: dish.defaultServings ?? 1, prep_minutes: dish.prepMinutes ?? 0, human_portion: dish.humanPortion ?? '',
    });
    if (error) return res.status(500).json({ error: 'Error al guardar plato' });
    return res.status(200).json({ ok: true });
  },
  'PUT dishes/custom/:id': async (req, res, auth, segments) => {
    const id = segments[2];
    const { dish } = req.body;
    if (!dish) return res.status(400).json({ error: 'Datos incompletos' });
    const updates: Record<string, unknown> = {};
    if (dish.name !== undefined) updates.name = dish.name;
    if (dish.category !== undefined) updates.category = dish.category;
    if (dish.tags !== undefined) updates.tags = dish.tags;
    if (dish.ingredients !== undefined) updates.ingredients = dish.ingredients;
    if (dish.defaultServings !== undefined) updates.default_servings = dish.defaultServings;
    if (dish.prepMinutes !== undefined) updates.prep_minutes = dish.prepMinutes;
    if (dish.humanPortion !== undefined) updates.human_portion = dish.humanPortion;
    const { error } = await getSupabase().from('custom_dishes').update(updates).eq('id', id).eq('user_id', auth.userId);
    if (error) return res.status(500).json({ error: 'Error al actualizar plato' });
    return res.status(200).json({ ok: true });
  },
  'DELETE dishes/custom/:id': async (_req, res, auth, segments) => {
    const id = segments[2];
    const { error } = await getSupabase().from('custom_dishes').delete().eq('id', id).eq('user_id', auth.userId);
    if (error) return res.status(500).json({ error: 'Error al eliminar plato' });
    return res.status(200).json({ ok: true });
  },

  'GET favorites': async (_req, res, auth) => {
    const { data, error } = await getSupabase().from('favorites').select('dish_name').eq('user_id', auth.userId);
    if (error) return res.status(500).json({ error: 'Error al leer favoritos' });
    return res.status(200).json({ favorites: (data ?? []).map((f) => f.dish_name) });
  },
  'POST favorites': async (req, res, auth) => {
    const { dishName } = req.body;
    if (!dishName) return res.status(400).json({ error: 'dishName requerido' });
    const { error } = await getSupabase().from('favorites').upsert({ user_id: auth.userId, dish_name: dishName }, { onConflict: 'user_id,dish_name' });
    if (error) return res.status(500).json({ error: 'Error al guardar favorito' });
    return res.status(200).json({ ok: true });
  },
  'DELETE favorites': async (req, res, auth) => {
    const dishName = (req.query.dishName as string) || req.body?.dishName;
    if (!dishName) return res.status(400).json({ error: 'dishName requerido' });
    const { error } = await getSupabase().from('favorites').delete().eq('user_id', auth.userId).eq('dish_name', dishName);
    if (error) return res.status(500).json({ error: 'Error al eliminar favorito' });
    return res.status(200).json({ ok: true });
  },

  'GET ingredients/custom': async (_req, res, auth) => {
    const { data, error } = await getSupabase().from('custom_ingredients').select('*').eq('user_id', auth.userId);
    if (error) return res.status(500).json({ error: 'Error al leer ingredientes' });
    return res.status(200).json({
      ingredients: (data ?? []).map((i) => ({
        id: i.id, name: i.name, category: i.category, calories: i.calories, protein: i.protein, carbs: i.carbs, fat: i.fat, isCustom: true,
      })),
    });
  },
  'POST ingredients/custom': async (req, res, auth) => {
    const { ingredient } = req.body;
    if (!ingredient?.id || !ingredient?.name) return res.status(400).json({ error: 'Datos incompletos' });
    const { error } = await getSupabase().from('custom_ingredients').insert({
      id: ingredient.id, user_id: auth.userId, name: ingredient.name, category: ingredient.category,
      calories: ingredient.calories, protein: ingredient.protein, carbs: ingredient.carbs, fat: ingredient.fat,
    });
    if (error) return res.status(500).json({ error: 'Error al guardar ingrediente' });
    return res.status(200).json({ ok: true });
  },
  'PUT ingredients/custom/:id': async (req, res, auth, segments) => {
    const id = segments[2];
    const { ingredient } = req.body;
    if (!ingredient) return res.status(400).json({ error: 'Datos incompletos' });
    const updates: Record<string, unknown> = {};
    if (ingredient.name !== undefined) updates.name = ingredient.name;
    if (ingredient.category !== undefined) updates.category = ingredient.category;
    if (ingredient.calories !== undefined) updates.calories = ingredient.calories;
    if (ingredient.protein !== undefined) updates.protein = ingredient.protein;
    if (ingredient.carbs !== undefined) updates.carbs = ingredient.carbs;
    if (ingredient.fat !== undefined) updates.fat = ingredient.fat;
    const { error } = await getSupabase().from('custom_ingredients').update(updates).eq('id', id).eq('user_id', auth.userId);
    if (error) return res.status(500).json({ error: 'Error al actualizar ingrediente' });
    return res.status(200).json({ ok: true });
  },
  'DELETE ingredients/custom/:id': async (_req, res, auth, segments) => {
    const id = segments[2];
    const { error } = await getSupabase().from('custom_ingredients').delete().eq('id', id).eq('user_id', auth.userId);
    if (error) return res.status(500).json({ error: 'Error al eliminar ingrediente' });
    return res.status(200).json({ ok: true });
  },

  'GET meals': async (req, res, auth) => {
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    let query = getSupabase().from('meals').select('*').eq('user_id', auth.userId).order('date', { ascending: true });
    if (from) query = query.gte('date', from);
    if (to) query = query.lte('date', to);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: 'Error al leer comidas' });
    return res.status(200).json({
      meals: (data ?? []).map((m) => ({
        id: m.id, date: m.date, mealType: m.meal_type, name: m.name, calories: m.calories, notes: m.notes,
        linkedRecipeId: m.linked_recipe_id, entries: m.entries ?? [], aiIngredients: m.ai_ingredients ?? [], completed: m.completed ?? false,
      })),
    });
  },
  'POST meals': async (req, res, auth) => {
    const { date, mealType, meal } = req.body;
    if (!date || !mealType || !meal?.id || !meal?.name) return res.status(400).json({ error: 'Datos incompletos' });
    const { error } = await getSupabase().from('meals').upsert({
      id: meal.id, user_id: auth.userId, date, meal_type: mealType, name: meal.name,
      calories: meal.calories ?? null, notes: meal.notes ?? null, linked_recipe_id: meal.linkedRecipeId ?? null,
      entries: meal.entries ?? [], ai_ingredients: meal.aiIngredients ?? [], completed: meal.completed ?? false,
    });
    if (error) return res.status(500).json({ error: 'Error al guardar comida' });
    return res.status(200).json({ ok: true });
  },
  'POST meals/batch': async (req, res, auth) => {
    const { meals } = req.body;
    if (!Array.isArray(meals) || meals.length === 0) return res.status(400).json({ error: 'meals[] requerido' });
    const rows = meals.map((m: Record<string, unknown>) => ({
      id: m.id, user_id: auth.userId, date: m.date, meal_type: m.mealType, name: m.name,
      calories: m.calories ?? null, notes: m.notes ?? null, linked_recipe_id: m.linkedRecipeId ?? null,
      entries: m.entries ?? [], ai_ingredients: m.aiIngredients ?? [], completed: m.completed ?? false,
    }));
    const { error } = await getSupabase().from('meals').upsert(rows);
    if (error) return res.status(500).json({ error: 'Error al guardar comidas' });
    return res.status(200).json({ ok: true, count: rows.length });
  },
  'PUT meals/:id': async (req, res, auth, segments) => {
    const id = segments[1];
    const { meal } = req.body;
    if (!meal) return res.status(400).json({ error: 'Datos incompletos' });
    const updates: Record<string, unknown> = {};
    if (meal.name !== undefined) updates.name = meal.name;
    if (meal.calories !== undefined) updates.calories = meal.calories;
    if (meal.notes !== undefined) updates.notes = meal.notes;
    if (meal.entries !== undefined) updates.entries = meal.entries;
    if (meal.aiIngredients !== undefined) updates.ai_ingredients = meal.aiIngredients;
    if (meal.completed !== undefined) updates.completed = meal.completed;
    const { error } = await getSupabase().from('meals').update(updates).eq('id', id).eq('user_id', auth.userId);
    if (error) return res.status(500).json({ error: 'Error al actualizar comida' });
    return res.status(200).json({ ok: true });
  },
  'DELETE meals/:id': async (_req, res, auth, segments) => {
    const id = segments[1];
    const { error } = await getSupabase().from('meals').delete().eq('id', id).eq('user_id', auth.userId);
    if (error) return res.status(500).json({ error: 'Error al eliminar comida' });
    return res.status(200).json({ ok: true });
  },
  'PATCH meals/:id/toggle': async (_req, res, auth, segments) => {
    const id = segments[1];
    const supabase = getSupabase();
    const { data: row, error: readErr } = await supabase.from('meals').select('completed').eq('id', id).eq('user_id', auth.userId).single();
    if (readErr || !row) return res.status(404).json({ error: 'Comida no encontrada' });
    const { error } = await supabase.from('meals').update({ completed: !row.completed }).eq('id', id).eq('user_id', auth.userId);
    if (error) return res.status(500).json({ error: 'Error al actualizar' });
    return res.status(200).json({ ok: true, completed: !row.completed });
  },

  'GET notes/:date': async (_req, res, auth, segments) => {
    const date = segments[1];
    const { data, error } = await getSupabase().from('day_notes').select('notes').eq('user_id', auth.userId).eq('date', date).single();
    if (error && error.code === 'PGRST116') return res.status(200).json({ notes: '' });
    if (error) return res.status(500).json({ error: 'Error al leer notas' });
    return res.status(200).json({ notes: data.notes ?? '' });
  },
  'PUT notes/:date': async (req, res, auth, segments) => {
    const date = segments[1];
    const { notes } = req.body;
    const { error } = await getSupabase().from('day_notes').upsert({ user_id: auth.userId, date, notes: notes ?? '' }, { onConflict: 'user_id,date' });
    if (error) return res.status(500).json({ error: 'Error al guardar notas' });
    return res.status(200).json({ ok: true });
  },

  'GET notifications': async (_req, res, auth) => {
    const { data, error } = await getSupabase().from('notifications').select('*').eq('user_id', auth.userId);
    if (error) return res.status(500).json({ error: 'Error al leer notificaciones' });
    return res.status(200).json({
      notifications: (data ?? []).map((n) => ({ id: n.id, label: n.label, time: n.time, enabled: n.enabled, type: n.type, mealType: n.meal_type ?? undefined })),
    });
  },
  'POST notifications': async (req, res, auth) => {
    const { notification } = req.body;
    if (!notification?.id || !notification?.label) return res.status(400).json({ error: 'Datos incompletos' });
    const { error } = await getSupabase().from('notifications').insert({
      id: notification.id, user_id: auth.userId, label: notification.label, time: notification.time,
      enabled: notification.enabled ?? true, type: notification.type, meal_type: notification.mealType ?? null,
    });
    if (error) return res.status(500).json({ error: 'Error al crear notificación' });
    return res.status(200).json({ ok: true });
  },
  'DELETE notifications/:id': async (_req, res, auth, segments) => {
    const id = segments[1];
    const { error } = await getSupabase().from('notifications').delete().eq('id', id).eq('user_id', auth.userId);
    if (error) return res.status(500).json({ error: 'Error al eliminar notificación' });
    return res.status(200).json({ ok: true });
  },
  'PATCH notifications/:id/toggle': async (_req, res, auth, segments) => {
    const id = segments[1];
    const supabase = getSupabase();
    const { data: row, error: readErr } = await supabase.from('notifications').select('enabled').eq('id', id).eq('user_id', auth.userId).single();
    if (readErr || !row) return res.status(404).json({ error: 'Notificación no encontrada' });
    const { error } = await supabase.from('notifications').update({ enabled: !row.enabled }).eq('id', id).eq('user_id', auth.userId);
    if (error) return res.status(500).json({ error: 'Error al actualizar' });
    return res.status(200).json({ ok: true, enabled: !row.enabled });
  },

  'GET profile': async (_req, res, auth) => {
    const { data, error } = await getSupabase().from('user_profiles').select('*').eq('user_id', auth.userId).single();
    if (error && error.code === 'PGRST116') return res.status(200).json({ profile: null });
    if (error) return res.status(500).json({ error: 'Error al leer perfil' });
    return res.status(200).json({
      profile: {
        id: data.profile_id, name: data.name, birthDate: data.birth_date, sex: data.sex,
        heightCm: data.height_cm, weightKg: data.weight_kg, activityLevel: data.activity_level, goal: data.goal,
        restrictions: data.restrictions ?? [], dislikedIngredientIds: data.disliked_ingredient_ids ?? [],
        dislikedCategories: data.disliked_categories ?? [], allowedExceptions: data.allowed_exceptions ?? [],
        nationality: data.nationality ?? undefined, createdAt: data.created_at, updatedAt: data.updated_at, lastRecalibration: data.last_recalibration,
      },
    });
  },
  'PUT profile': async (req, res, auth) => {
    const { profile } = req.body;
    if (!profile) return res.status(400).json({ error: 'Perfil requerido' });
    const { error } = await getSupabase().from('user_profiles').upsert({
      user_id: auth.userId, profile_id: profile.id ?? auth.userId, name: profile.name, birth_date: profile.birthDate,
      sex: profile.sex, height_cm: profile.heightCm, weight_kg: profile.weightKg, activity_level: profile.activityLevel,
      goal: profile.goal, restrictions: profile.restrictions ?? [], disliked_ingredient_ids: profile.dislikedIngredientIds ?? [],
      disliked_categories: profile.dislikedCategories ?? [], allowed_exceptions: profile.allowedExceptions ?? [],
      nationality: profile.nationality ?? null, created_at: profile.createdAt ?? new Date().toISOString(),
      updated_at: profile.updatedAt ?? new Date().toISOString(), last_recalibration: profile.lastRecalibration ?? new Date().toISOString(),
    });
    if (error) return res.status(500).json({ error: 'Error al guardar perfil' });
    return res.status(200).json({ ok: true });
  },

  'GET recipes/calculator': async (_req, res, auth) => {
    const { data, error } = await getSupabase().from('calculator_recipes').select('*').eq('user_id', auth.userId);
    if (error) return res.status(500).json({ error: 'Error al leer recetas' });
    return res.status(200).json({
      recipes: (data ?? []).map((r) => ({
        id: r.id, name: r.name, entries: r.entries ?? [], totalMacros: r.total_macros ?? { calories: 0, protein: 0, carbs: 0, fat: 0 }, savedAt: r.saved_at,
      })),
    });
  },
  'POST recipes/calculator': async (req, res, auth) => {
    const { recipe } = req.body;
    if (!recipe?.id || !recipe?.name) return res.status(400).json({ error: 'Datos incompletos' });
    const { error } = await getSupabase().from('calculator_recipes').insert({
      id: recipe.id, user_id: auth.userId, name: recipe.name, entries: recipe.entries ?? [], total_macros: recipe.totalMacros ?? {}, saved_at: recipe.savedAt ?? new Date().toISOString(),
    });
    if (error) return res.status(500).json({ error: 'Error al guardar receta' });
    return res.status(200).json({ ok: true });
  },
  'DELETE recipes/calculator/:id': async (_req, res, auth, segments) => {
    const id = segments[2];
    const { error } = await getSupabase().from('calculator_recipes').delete().eq('id', id).eq('user_id', auth.userId);
    if (error) return res.status(500).json({ error: 'Error al eliminar receta' });
    return res.status(200).json({ ok: true });
  },

  'GET settings': async (_req, res, auth) => {
    const { data, error } = await getSupabase().from('user_settings').select('*').eq('user_id', auth.userId).single();
    if (error && error.code === 'PGRST116') return res.status(200).json({ settings: { theme: 'dark', showCalories: false } });
    if (error) return res.status(500).json({ error: 'Error al leer ajustes' });
    return res.status(200).json({ settings: { theme: data.theme ?? 'dark', showCalories: data.show_calories ?? false } });
  },
  'PUT settings': async (req, res, auth) => {
    const { theme, showCalories } = req.body;
    const updates: Record<string, unknown> = { user_id: auth.userId };
    if (theme !== undefined) updates.theme = theme;
    if (showCalories !== undefined) updates.show_calories = showCalories;
    const { error } = await getSupabase().from('user_settings').upsert(updates);
    if (error) return res.status(500).json({ error: 'Error al guardar ajustes' });
    return res.status(200).json({ ok: true });
  },

  'GET shopping': async (_req, res, auth) => {
    const { data, error } = await getSupabase().from('shopping_lists').select('*, shopping_items(*)').eq('user_id', auth.userId).order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: 'Error al leer listas' });
    return res.status(200).json({
      lists: (data ?? []).map((l) => ({
        id: l.id, name: l.name, createdAt: l.created_at, dateRange: { from: l.date_from, to: l.date_to },
        items: (l.shopping_items ?? []).map((item: Record<string, unknown>) => ({
          id: item.id as string, ingredientId: item.ingredient_id as string, name: item.name as string,
          quantity: item.quantity as string, section: item.section as string, checked: (item.checked as boolean) ?? false,
        })),
      })),
    });
  },
  'POST shopping': async (req, res, auth) => {
    const { list } = req.body;
    if (!list?.id || !list?.name) return res.status(400).json({ error: 'Datos incompletos' });
    const supabase = getSupabase();
    const { error: listErr } = await supabase.from('shopping_lists').insert({
      id: list.id, user_id: auth.userId, name: list.name,
      created_at: list.createdAt ?? new Date().toISOString(),
      date_from: list.dateRange?.from ?? new Date().toISOString().slice(0, 10),
      date_to: list.dateRange?.to ?? new Date().toISOString().slice(0, 10),
    });
    if (listErr) return res.status(500).json({ error: 'Error al crear lista' });
    const items = list.items as Array<Record<string, unknown>> | undefined;
    if (items && items.length > 0) {
      const itemRows = items.map((item) => ({
        id: item.id, list_id: list.id, user_id: auth.userId, ingredient_id: item.ingredientId,
        name: item.name, quantity: item.quantity, section: item.section, checked: item.checked ?? false,
      }));
      await supabase.from('shopping_items').insert(itemRows);
    }
    return res.status(200).json({ ok: true });
  },
  'PUT shopping/:listId': async (req, res, auth, segments) => {
    const listId = segments[1];
    const { items } = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ error: 'items[] requerido' });
    const supabase = getSupabase();
    await supabase.from('shopping_items').delete().eq('list_id', listId).eq('user_id', auth.userId);
    if (items.length > 0) {
      const rows = items.map((item: Record<string, unknown>) => ({
        id: item.id, list_id: listId, user_id: auth.userId, ingredient_id: item.ingredientId,
        name: item.name, quantity: item.quantity, section: item.section, checked: item.checked ?? false,
      }));
      const { error } = await supabase.from('shopping_items').insert(rows);
      if (error) return res.status(500).json({ error: 'Error al actualizar items' });
    }
    return res.status(200).json({ ok: true });
  },
  'DELETE shopping/:listId': async (_req, res, auth, segments) => {
    const listId = segments[1];
    const { error } = await getSupabase().from('shopping_lists').delete().eq('id', listId).eq('user_id', auth.userId);
    if (error) return res.status(500).json({ error: 'Error al eliminar lista' });
    return res.status(200).json({ ok: true });
  },
  'DELETE shopping/:listId/checked': async (_req, res, auth, segments) => {
    const listId = segments[1];
    const { error } = await getSupabase().from('shopping_items').delete().eq('list_id', listId).eq('user_id', auth.userId).eq('checked', true);
    if (error) return res.status(500).json({ error: 'Error al eliminar marcados' });
    return res.status(200).json({ ok: true });
  },
  'PATCH shopping/:listId/items/:itemId/toggle': async (_req, res, auth, segments) => {
    const itemId = segments[3];
    const supabase = getSupabase();
    const { data: row, error: readErr } = await supabase.from('shopping_items').select('checked').eq('id', itemId).eq('user_id', auth.userId).single();
    if (readErr || !row) return res.status(404).json({ error: 'Item no encontrado' });
    const { error } = await supabase.from('shopping_items').update({ checked: !row.checked }).eq('id', itemId).eq('user_id', auth.userId);
    if (error) return res.status(500).json({ error: 'Error al actualizar' });
    return res.status(200).json({ ok: true, checked: !row.checked });
  },

  'GET signals': async (req, res, auth) => {
    const limit = Number(req.query.limit) || 800;
    const { data, error } = await getSupabase().from('ingredient_signals').select('*').eq('user_id', auth.userId).order('fecha', { ascending: false }).limit(limit);
    if (error) return res.status(500).json({ error: 'Error al leer señales' });
    return res.status(200).json({
      signals: (data ?? []).map((s) => ({
        id: s.id, fecha: s.fecha, comida: s.comida, ingredientes_sugeridos: s.ingredientes_sugeridos ?? [],
        ingredientes_finales: s.ingredientes_finales ?? [], ingredientes_removidos: s.ingredientes_removidos ?? [],
        ingredientes_agregados: s.ingredientes_agregados ?? [], accion: s.accion,
      })),
    });
  },
  'POST signals': async (req, res, auth) => {
    const { signals } = req.body;
    if (!Array.isArray(signals) || signals.length === 0) return res.status(400).json({ error: 'signals[] requerido' });
    const rows = signals.map((s: Record<string, unknown>) => ({
      id: s.id, user_id: auth.userId, fecha: s.fecha, comida: s.comida,
      ingredientes_sugeridos: s.ingredientes_sugeridos ?? [], ingredientes_finales: s.ingredientes_finales ?? [],
      ingredientes_removidos: s.ingredientes_removidos ?? [], ingredientes_agregados: s.ingredientes_agregados ?? [], accion: s.accion,
    }));
    const { error } = await getSupabase().from('ingredient_signals').insert(rows);
    if (error) return res.status(500).json({ error: 'Error al guardar señales' });
    return res.status(200).json({ ok: true, count: rows.length });
  },
};

function normalizeKey(method: string | undefined, segments: string[]): string {
  const s = [...segments];

  if (s[0] === 'dishes' && s[1] === 'custom' && s[2]) s[2] = ':id';
  if (s[0] === 'ingredients' && s[1] === 'custom' && s[2]) s[2] = ':id';
  /** meals: no confundir POST /meals/batch con /meals/:id */
  if (s[0] === 'meals' && s[1] && s[2] === 'toggle') {
    s[1] = ':id';
  } else if (s[0] === 'meals' && s[1] && !s[2] && s[1] !== 'batch' && method !== 'POST') {
    s[1] = ':id';
  }
  if (s[0] === 'notes' && s[1]) s[1] = ':date';
  if (s[0] === 'notifications' && s[1] && s[2] === 'toggle') s[1] = ':id';
  if (s[0] === 'notifications' && s[1] && !s[2]) s[1] = ':id';
  if (s[0] === 'recipes' && s[1] === 'calculator' && s[2]) s[2] = ':id';
  if (s[0] === 'shopping' && s[1] && s[2] === 'checked') s[1] = ':listId';
  if (s[0] === 'shopping' && s[1] && s[2] === 'items' && s[3] && s[4] === 'toggle') {
    s[1] = ':listId';
    s[3] = ':itemId';
  }
  if (s[0] === 'shopping' && s[1] && !s[2]) s[1] = ':listId';

  return routeKey(method, s);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return withAuth(req, res, async (auth, segments) => {
    const key = normalizeKey(req.method, segments);
    const handlerFn = handlers[key];
    if (!handlerFn) {
      return res.status(404).json({ error: 'Route not found' });
    }
    return handlerFn(req, res, auth, segments);
  });
}
