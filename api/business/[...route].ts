import { randomUUID } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken } from '../_lib/jwt.js';
import { getSupabase } from '../_lib/supabase.js';
import { normalizePlanMemory } from '../_lib/planMemory.js';
import {
  messageToRow,
  normalizeMealType,
  persistableMessages,
  rowToMessage,
  deriveConversationTitle,
  messagePreview,
  CHAT_MESSAGES_PAGE_SIZE,
  CHAT_CONVERSATIONS_PAGE_SIZE,
} from '../_lib/chatConversation.js';

interface AuthenticatedRequest {
  userId: string;
}

function exposeDbErrors(): boolean {
  const vercelEnv = process.env.VERCEL_ENV ?? '';
  return vercelEnv === 'preview' || vercelEnv === 'development' || process.env.NODE_ENV !== 'production';
}

type RouteHandler = (
  req: VercelRequest,
  res: VercelResponse,
  auth: AuthenticatedRequest,
  segments: string[],
) => Promise<VercelResponse | void>;

function mapProgressCheckIn(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    weightKg: Number(row.weight_kg),
    periodExperience: (row.period_experience as string | null) ?? undefined,
    source: row.source as string,
    recordedAt: row.recorded_at as string,
  };
}

async function loadConversationMessagesPage(
  userId: string,
  conversationId: string,
  options: { limit?: number; before?: string | null } = {},
) {
  const supabase = getSupabase();
  const limit = Math.min(Math.max(options.limit ?? CHAT_MESSAGES_PAGE_SIZE, 1), 100);

  let query = supabase
    .from('chat_messages')
    .select('id, type, content, created_at')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (options.before) {
    query = query.lt('created_at', options.before);
  }

  const { data: rows, error } = await query;
  if (error) {
    console.error('loadConversationMessagesPage error:', error.message);
    return {
      messages: [] as Record<string, unknown>[],
      hasMoreOlder: false,
      olderCursor: null as string | null,
    };
  }

  const raw = rows ?? [];
  const hasMoreOlder = raw.length > limit;
  const page = raw.slice(0, limit).reverse();
  const messages = page.map((row) =>
    rowToMessage(row as {
      id: string;
      type: string;
      content: Record<string, unknown> | null;
      created_at?: string;
    }),
  );
  const olderCursor =
    hasMoreOlder && messages.length > 0
      ? String((messages[0] as { timestamp?: string }).timestamp ?? page[0]?.created_at ?? '')
      : null;

  return { messages, hasMoreOlder, olderCursor: olderCursor || null };
}

async function loadActiveChatConversation(
  userId: string,
  messageLimit = CHAT_MESSAGES_PAGE_SIZE,
) {
  const supabase = getSupabase();
  const { data: conversation, error: convErr } = await supabase
    .from('chat_conversations')
    .select('id, title, last_week_plan, last_meal_type, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (convErr) {
    console.error('loadActiveChatConversation conversation error:', convErr.message);
    return {
      conversationId: null as string | null,
      messages: [] as Record<string, unknown>[],
      lastWeekPlan: null as unknown,
      lastMealType: null as string | null,
      hasMoreOlder: false,
      olderCursor: null as string | null,
    };
  }

  if (!conversation) {
    return {
      conversationId: null as string | null,
      messages: [] as Record<string, unknown>[],
      lastWeekPlan: null as unknown,
      lastMealType: null as string | null,
      hasMoreOlder: false,
      olderCursor: null as string | null,
    };
  }

  const page = await loadConversationMessagesPage(userId, conversation.id as string, {
    limit: messageLimit,
  });

  return {
    conversationId: conversation.id as string,
    messages: page.messages,
    lastWeekPlan: conversation.last_week_plan ?? null,
    lastMealType: normalizeMealType(conversation.last_meal_type),
    hasMoreOlder: page.hasMoreOlder,
    olderCursor: page.olderCursor,
  };
}

async function loadConversationById(userId: string, conversationId: string) {
  const supabase = getSupabase();
  const { data: conversation, error } = await supabase
    .from('chat_conversations')
    .select('id, title, last_week_plan, last_meal_type, updated_at')
    .eq('id', conversationId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !conversation) return null;
  return conversation;
}

function mapProfileRow(row: Record<string, unknown>) {
  return {
    id: row.profile_id as string,
    name: row.name as string,
    birthDate: row.birth_date as string,
    sex: row.sex as string,
    heightCm: Number(row.height_cm),
    weightKg: Number(row.weight_kg),
    activityLevel: row.activity_level as string,
    goal: row.goal as string,
    restrictions: (row.restrictions as string[]) ?? [],
    dislikedIngredientIds: (row.disliked_ingredient_ids as string[]) ?? [],
    dislikedCategories: (row.disliked_categories as string[]) ?? [],
    allowedExceptions: (row.allowed_exceptions as string[]) ?? [],
    nationality: (row.nationality as string | null) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    lastRecalibration: row.last_recalibration as string,
  };
}

function getSegments(req: VercelRequest): string[] {
  const stripInfraPrefixes = (rawSegments: string[]): string[] => {
    let segs = [...rawSegments];
    if (segs[0] === 'api') segs = segs.slice(1);
    if (segs[0] === 'business') segs = segs.slice(1);
    return segs;
  };

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
    return stripInfraPrefixes(parts);
  };

  let segments = collectFromQueryParam();

  /** Cuando falta route (rewrite / edge cases), usar pathname sin /api y sin prefijo interno business. */
  const fromPathFallback = (): string[] => {
    const pathRaw = (req.url ?? '').split('?')[0] ?? '';
    const segs = pathRaw.replace(/^\/+/, '').split('/').filter(Boolean);
    return stripInfraPrefixes(segs);
  };

  if (segments.length === 0 || segments[0] === 'api' || segments[0] === 'business') {
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
  const reqId = randomUUID();
  try {
    const segments = getSegments(req);
    console.log('[business] request_in', JSON.stringify({
      reqId,
      method: req.method,
      url: req.url,
      segments,
      origin: req.headers.origin ?? null,
      acrMethod: req.headers['access-control-request-method'] ?? null,
      acrHeaders: req.headers['access-control-request-headers'] ?? null,
    }));

    if (req.method === 'OPTIONS') {
      console.log('[business] options_request', JSON.stringify({ reqId, segments }));
      return res.status(405).json({ error: 'Method not allowed', reqId });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      console.warn('[business] auth_missing_bearer', JSON.stringify({ reqId, hasAuthHeader: !!authHeader }));
      return res.status(401).json({ error: 'Token requerido', reqId });
    }

    const decoded = verifyToken(authHeader.slice(7));
    const auth: AuthenticatedRequest = { userId: decoded.sub };
    console.log('[business] auth_ok', JSON.stringify({
      reqId,
      userIdPrefix: decoded.sub.slice(0, 8),
      userIdLen: decoded.sub.length,
      username: decoded.username ?? null,
      email: decoded.email ?? null,
    }));
    return await fn(auth, segments);
  } catch (err) {
    if (
      (err as Error).name === 'JsonWebTokenError' ||
      (err as Error).name === 'TokenExpiredError'
    ) {
      console.warn('[business] auth_invalid_token', JSON.stringify({
        reqId,
        errorName: (err as Error).name,
        errorMessage: (err as Error).message,
      }));
      return res.status(401).json({ error: 'Token inválido o expirado', reqId });
    }
    console.error('[business] withAuth_uncaught', JSON.stringify({
      reqId,
      method: req.method,
      url: req.url,
      errorName: (err as Error).name,
      errorMessage: (err as Error).message,
    }));
    return res.status(500).json({ error: 'Error interno del servidor', reqId });
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
      progressRes,
      chatConversation,
    ] = await Promise.all([
      supabase.from('meals').select('*').eq('user_id', uid).gte('date', dateFrom).order('date', { ascending: true }),
      supabase.from('day_notes').select('*').eq('user_id', uid).gte('date', dateFrom),
      supabase.from('user_profiles').select('*').eq('user_id', uid).maybeSingle(),
      supabase.from('notifications').select('*').eq('user_id', uid),
      supabase.from('calculator_recipes').select('*').eq('user_id', uid),
      supabase.from('custom_ingredients').select('*').eq('user_id', uid),
      supabase.from('custom_dishes').select('*').eq('user_id', uid),
      supabase.from('shopping_lists').select('*, shopping_items(*)').eq('user_id', uid).order('created_at', { ascending: false }),
      supabase.from('user_settings').select('*').eq('user_id', uid).single(),
      supabase.from('favorites').select('dish_name').eq('user_id', uid),
      supabase.from('ingredient_signals').select('*').eq('user_id', uid).order('fecha', { ascending: false }).limit(Number(req.query.signalLimit) || 800),
      supabase.from('body_check_ins').select('*').eq('user_id', uid).order('recorded_at', { ascending: true }),
      loadActiveChatConversation(uid),
    ]);

    const parseWeekPlanning = (raw: unknown) => {
      if (!raw || typeof raw !== 'object') return null;
      const w = raw as Record<string, unknown>;
      if (typeof w.completedAt !== 'string') return null;
      return w;
    };

    const profileFromRow = (profileRow: Record<string, unknown> | null) => (
      profileRow
        ? {
            id: profileRow.profile_id as string,
            name: profileRow.name as string,
            birthDate: profileRow.birth_date as string,
            sex: profileRow.sex as string,
            heightCm: profileRow.height_cm as number,
            weightKg: profileRow.weight_kg as number,
            activityLevel: profileRow.activity_level as string,
            goal: profileRow.goal as string,
            restrictions: (profileRow.restrictions as string[]) ?? [],
            dislikedIngredientIds: (profileRow.disliked_ingredient_ids as string[]) ?? [],
            dislikedCategories: (profileRow.disliked_categories as string[]) ?? [],
            allowedExceptions: (profileRow.allowed_exceptions as string[]) ?? [],
            nationality: (profileRow.nationality as string | null) ?? undefined,
            createdAt: profileRow.created_at as string,
            updatedAt: profileRow.updated_at as string,
            lastRecalibration: profileRow.last_recalibration as string,
          }
        : null
    );

    const profileRow = (profileRes.data as Record<string, unknown> | null) ?? null;
    let profile = profileFromRow(profileRow);
    const weekPlanning = parseWeekPlanning(profileRow?.week_planning);
    const planMemory = normalizePlanMemory(profileRow?.plan_memory);

    // Backward compatibility: some users still have profile only in legacy user_data blob.
    if (!profile) {
      const { data: legacyRow } = await supabase
        .from('user_data')
        .select('data')
        .eq('user_id', uid)
        .single();
      const legacyProfile = (legacyRow?.data as Record<string, unknown> | undefined)?.profile as Record<string, unknown> | undefined;
      if (legacyProfile) {
        profile = {
          id: (legacyProfile.id as string | undefined) ?? uid,
          name: (legacyProfile.name as string | undefined) ?? '',
          birthDate: (legacyProfile.birthDate as string | undefined) ?? '',
          sex: (legacyProfile.sex as string | undefined) ?? 'male',
          heightCm: (legacyProfile.heightCm as number | undefined) ?? 170,
          weightKg: (legacyProfile.weightKg as number | undefined) ?? 70,
          activityLevel: (legacyProfile.activityLevel as string | undefined) ?? 'moderate',
          goal: (legacyProfile.goal as string | undefined) ?? 'maintain',
          restrictions: (legacyProfile.restrictions as string[] | undefined) ?? [],
          dislikedIngredientIds: (legacyProfile.dislikedIngredientIds as string[] | undefined) ?? [],
          dislikedCategories: (legacyProfile.dislikedCategories as string[] | undefined) ?? [],
          allowedExceptions: (legacyProfile.allowedExceptions as string[] | undefined) ?? [],
          nationality: (legacyProfile.nationality as string | undefined) ?? undefined,
          createdAt: (legacyProfile.createdAt as string | undefined) ?? new Date().toISOString(),
          updatedAt: (legacyProfile.updatedAt as string | undefined) ?? new Date().toISOString(),
          lastRecalibration: (legacyProfile.lastRecalibration as string | undefined) ?? new Date().toISOString(),
        };
      }
    }

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
      prepMinutes: m.prep_minutes ?? null,
      humanPortion: m.human_portion ?? null,
      preparation: m.preparation ?? null,
      tip: m.tip ?? null,
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
    const settingsResError = settingsRes.error;
    const settings = {
      theme: settingsRow?.theme ?? 'dark',
      showCalories: settingsRow?.show_calories ?? false,
      useGrams: settingsResError ? undefined : (settingsRow?.use_grams ?? false),
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
    const progressCheckIns = (progressRes.data ?? []).map((row) =>
      mapProgressCheckIn(row as Record<string, unknown>),
    );

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
      weekPlanning,
      planMemory,
      progressCheckIns,
      chatConversation,
    });
  },

  'GET chat/conversation': async (_req, res, auth) => {
    const chatConversation = await loadActiveChatConversation(auth.userId);
    return res.status(200).json({ chatConversation });
  },

  'PUT chat/conversation': async (req, res, auth) => {
    const body = req.body ?? {};
    const rawMessages = Array.isArray(body.messages) ? body.messages : [];
    const messages = persistableMessages(rawMessages as Array<Record<string, unknown>>);
    const lastWeekPlan = body.lastWeekPlan ?? null;
    const lastMealType = normalizeMealType(body.lastMealType);
    const requestedId =
      typeof body.conversationId === 'string' && body.conversationId.trim()
        ? body.conversationId.trim()
        : null;

    const supabase = getSupabase();
    const now = new Date().toISOString();

    let conversationId = requestedId;

    if (conversationId) {
      const { data: owned } = await supabase
        .from('chat_conversations')
        .select('id')
        .eq('id', conversationId)
        .eq('user_id', auth.userId)
        .maybeSingle();
      if (!owned) {
        conversationId = null;
      }
    }

    if (!conversationId) {
      const existing = await loadActiveChatConversation(auth.userId);
      conversationId = existing.conversationId;
    }

    if (!conversationId) {
      const title = deriveConversationTitle(messages);
      const { data: created, error: createErr } = await supabase
        .from('chat_conversations')
        .insert({
          user_id: auth.userId,
          title,
          last_week_plan: lastWeekPlan,
          last_meal_type: lastMealType,
          updated_at: now,
        })
        .select('id')
        .single();
      if (createErr || !created) {
        console.error('PUT chat/conversation create error:', createErr?.message);
        return res.status(500).json({ error: 'Error al crear conversación' });
      }
      conversationId = created.id as string;
    } else {
      const { data: convMeta } = await supabase
        .from('chat_conversations')
        .select('title')
        .eq('id', conversationId)
        .eq('user_id', auth.userId)
        .maybeSingle();
      const title =
        convMeta?.title ?? deriveConversationTitle(messages);
      const { error: updateErr } = await supabase
        .from('chat_conversations')
        .update({
          title: title ?? null,
          last_week_plan: lastWeekPlan,
          last_meal_type: lastMealType,
          updated_at: now,
        })
        .eq('id', conversationId)
        .eq('user_id', auth.userId);
      if (updateErr) {
        console.error('PUT chat/conversation update error:', updateErr.message);
        return res.status(500).json({ error: 'Error al actualizar conversación' });
      }
    }

    const rows = messages.map((m) => messageToRow(m, conversationId!, auth.userId));
    const keepIds = rows.map((r) => r.id);

    if (rows.length > 0) {
      const { error: upsertErr } = await supabase
        .from('chat_messages')
        .upsert(rows, { onConflict: 'id' });
      if (upsertErr) {
        console.error('PUT chat/conversation upsert messages error:', upsertErr.message);
        return res.status(500).json({ error: 'Error al guardar mensajes' });
      }
    }

    // Remove stale / ephemeral rows that are no longer in the session snapshot.
    const { data: existingRows, error: listErr } = await supabase
      .from('chat_messages')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', auth.userId);
    if (listErr) {
      console.error('PUT chat/conversation list messages error:', listErr.message);
      return res.status(500).json({ error: 'Error al sincronizar mensajes' });
    }

    const keep = new Set(keepIds);
    const toDelete = (existingRows ?? [])
      .map((r) => r.id as string)
      .filter((id) => !keep.has(id));
    if (toDelete.length > 0) {
      const { error: delErr } = await supabase
        .from('chat_messages')
        .delete()
        .eq('user_id', auth.userId)
        .eq('conversation_id', conversationId)
        .in('id', toDelete);
      if (delErr) {
        console.error('PUT chat/conversation delete stale error:', delErr.message);
        return res.status(500).json({ error: 'Error al limpiar mensajes' });
      }
    }

    return res.status(200).json({
      ok: true,
      conversationId,
      messageCount: rows.length,
    });
  },

  'GET chat/conversations': async (req, res, auth) => {
    const supabase = getSupabase();
    const limit = Math.min(Math.max(Number(req.query.limit) || CHAT_CONVERSATIONS_PAGE_SIZE, 1), 50);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const { data: rows, error, count } = await supabase
      .from('chat_conversations')
      .select('id, title, updated_at', { count: 'exact' })
      .eq('user_id', auth.userId)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('GET chat/conversations error:', error.message);
      return res.status(500).json({ error: 'Error al listar conversaciones' });
    }

    const conversations = await Promise.all(
      (rows ?? []).map(async (row) => {
        const { data: lastMsg } = await supabase
          .from('chat_messages')
          .select('type, content')
          .eq('conversation_id', row.id)
          .eq('user_id', auth.userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const preview = lastMsg
          ? messagePreview({
              type: lastMsg.type,
              ...(lastMsg.content as Record<string, unknown>),
            })
          : '';

        return {
          id: row.id as string,
          title: (row.title as string | null) ?? null,
          preview,
          updatedAt: row.updated_at as string,
        };
      }),
    );

    const total = count ?? 0;
    const hasMore = offset + limit < total;

    return res.status(200).json({
      conversations,
      hasMore,
      nextOffset: hasMore ? offset + limit : null,
    });
  },

  'POST chat/conversations': async (_req, res, auth) => {
    const supabase = getSupabase();
    const now = new Date().toISOString();
    const { data: created, error } = await supabase
      .from('chat_conversations')
      .insert({
        user_id: auth.userId,
        updated_at: now,
      })
      .select('id, updated_at')
      .single();

    if (error || !created) {
      console.error('POST chat/conversations error:', error?.message);
      return res.status(500).json({ error: 'Error al crear conversación' });
    }

    return res.status(201).json({
      conversation: {
        id: created.id as string,
        title: null,
        preview: '',
        updatedAt: created.updated_at as string,
      },
    });
  },

  'GET chat/conversations/:id/messages': async (req, res, auth, segments) => {
    const conversationId = segments[2];
    if (!conversationId) {
      return res.status(400).json({ error: 'conversationId requerido' });
    }

    const conversation = await loadConversationById(auth.userId, conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }

    const limit = Math.min(Math.max(Number(req.query.limit) || CHAT_MESSAGES_PAGE_SIZE, 1), 100);
    const before =
      typeof req.query.before === 'string' && req.query.before.trim()
        ? req.query.before.trim()
        : null;

    const page = await loadConversationMessagesPage(auth.userId, conversationId, {
      limit,
      before,
    });

    return res.status(200).json({
      conversationId,
      title: (conversation.title as string | null) ?? null,
      lastWeekPlan: conversation.last_week_plan ?? null,
      lastMealType: normalizeMealType(conversation.last_meal_type),
      updatedAt: conversation.updated_at as string,
      messages: page.messages,
      hasMoreOlder: page.hasMoreOlder,
      olderCursor: page.olderCursor,
    });
  },

  'GET plan-memory': async (_req, res, auth) => {
    const { data, error } = await getSupabase()
      .from('user_profiles')
      .select('plan_memory')
      .eq('user_id', auth.userId)
      .maybeSingle();
    if (error) return res.status(500).json({ error: 'Error al leer memoria de plan' });
    return res.status(200).json({ planMemory: normalizePlanMemory(data?.plan_memory) });
  },

  'PUT plan-memory': async (req, res, auth) => {
    const { planMemory } = req.body ?? {};
    const normalized = normalizePlanMemory(planMemory);
    const supabase = getSupabase();
    const { data: existing } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('user_id', auth.userId)
      .maybeSingle();
    if (!existing) {
      return res.status(400).json({ error: 'Creá tu perfil nutricional primero' });
    }
    const { error } = await supabase
      .from('user_profiles')
      .update({
        plan_memory: normalized,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', auth.userId);
    if (error) {
      console.error('PUT plan-memory error:', error.message);
      return res.status(500).json({ error: 'Error al guardar memoria de plan' });
    }
    return res.status(200).json({ ok: true, planMemory: normalized });
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
    const settings = (blob.settings ?? {}) as { theme?: string; showCalories?: boolean; useGrams?: boolean };
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

    {
      const settingsPayload = {
        user_id: uid,
        theme: settings.theme ?? 'dark',
        show_calories: settings.showCalories ?? false,
        use_grams: settings.useGrams ?? false,
      };
      let { error: settingsErr } = await supabase.from('user_settings').upsert(settingsPayload);
      if (settingsErr?.message?.includes('use_grams')) {
        const fallback = {
          user_id: settingsPayload.user_id,
          theme: settingsPayload.theme,
          show_calories: settingsPayload.show_calories,
        };
        settingsErr = (await supabase.from('user_settings').upsert(fallback)).error;
      }
      if (settingsErr) console.error('migrate: user_settings upsert error', settingsErr);
    }
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
      prep_minutes: meal.prepMinutes ?? null, human_portion: meal.humanPortion ?? null,
      preparation: meal.preparation ?? null, tip: meal.tip ?? null,
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
      prep_minutes: m.prepMinutes ?? null, human_portion: m.humanPortion ?? null,
      preparation: m.preparation ?? null, tip: m.tip ?? null,
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
    if (meal.prepMinutes !== undefined) updates.prep_minutes = meal.prepMinutes;
    if (meal.humanPortion !== undefined) updates.human_portion = meal.humanPortion;
    if (meal.preparation !== undefined) updates.preparation = meal.preparation;
    if (meal.tip !== undefined) updates.tip = meal.tip;
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

  'GET progress/check-ins': async (_req, res, auth) => {
    const { data, error } = await getSupabase()
      .from('body_check_ins')
      .select('*')
      .eq('user_id', auth.userId)
      .order('recorded_at', { ascending: true });
    if (error) {
      return res.status(500).json({
        error: 'Error al leer check-ins',
        ...(exposeDbErrors() ? { dbMessage: error.message } : {}),
      });
    }
    return res.status(200).json({
      checkIns: (data ?? []).map((row) =>
        mapProgressCheckIn(row as Record<string, unknown>),
      ),
    });
  },

  'POST progress/check-ins': async (req, res, auth) => {
    const weightKg = Number(req.body?.weightKg);
    const periodExperience = req.body?.periodExperience;
    const source = req.body?.source ?? 'manual';
    const validExperiences = ['easy', 'normal', 'hard'];
    const validSources = ['onboarding', 'scheduled', 'manual', 'confirmation', 'profile'];

    if (!Number.isFinite(weightKg) || weightKg <= 0 || weightKg > 500) {
      return res.status(400).json({ error: 'Peso inválido' });
    }
    if (periodExperience != null && !validExperiences.includes(periodExperience)) {
      return res.status(400).json({ error: 'Experiencia del período inválida' });
    }
    if (!validSources.includes(source)) {
      return res.status(400).json({ error: 'Origen de check-in inválido' });
    }

    const supabase = getSupabase();
    const { data: profileRow, error: profileReadError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', auth.userId)
      .maybeSingle();
    if (profileReadError) {
      return res.status(500).json({ error: 'Error al leer perfil' });
    }
    if (!profileRow) {
      return res.status(400).json({ error: 'Creá tu perfil nutricional primero' });
    }

    const recordedAt = new Date().toISOString();
    const row = {
      id: randomUUID(),
      user_id: auth.userId,
      weight_kg: weightKg,
      period_experience: periodExperience ?? null,
      source,
      recorded_at: recordedAt,
    };
    const { data: inserted, error: insertError } = await supabase
      .from('body_check_ins')
      .insert(row)
      .select('*')
      .single();
    if (insertError || !inserted) {
      return res.status(500).json({
        error: 'Error al guardar check-in',
        ...(exposeDbErrors() ? { dbMessage: insertError?.message ?? null } : {}),
      });
    }

    const { data: updatedProfile, error: updateError } = await supabase
      .from('user_profiles')
      .update({
        weight_kg: weightKg,
        last_recalibration: recordedAt,
        updated_at: recordedAt,
      })
      .eq('user_id', auth.userId)
      .select('*')
      .single();
    if (updateError || !updatedProfile) {
      await supabase
        .from('body_check_ins')
        .delete()
        .eq('id', inserted.id)
        .eq('user_id', auth.userId);
      return res.status(500).json({ error: 'Error al actualizar el perfil' });
    }

    return res.status(200).json({
      checkIn: mapProgressCheckIn(inserted as Record<string, unknown>),
      profile: mapProfileRow(updatedProfile as Record<string, unknown>),
    });
  },

  'GET profile': async (_req, res, auth) => {
    const { data, error } = await getSupabase().from('user_profiles').select('*').eq('user_id', auth.userId).maybeSingle();
    if (error) {
      console.error('GET profile error:', error.message, error.code);
      return res.status(500).json({
        error: 'Error al leer perfil',
        ...(exposeDbErrors()
          ? { dbCode: error.code ?? null, dbMessage: error.message ?? null }
          : {}),
      });
    }
    if (!data) return res.status(200).json({ profile: null, weekPlanning: null });
    const weekPlanning =
      data.week_planning && typeof data.week_planning === 'object' && typeof (data.week_planning as { completedAt?: string }).completedAt === 'string'
        ? data.week_planning
        : null;
    return res.status(200).json({
      profile: {
        id: data.profile_id, name: data.name, birthDate: data.birth_date, sex: data.sex,
        heightCm: data.height_cm, weightKg: data.weight_kg, activityLevel: data.activity_level, goal: data.goal,
        restrictions: data.restrictions ?? [], dislikedIngredientIds: data.disliked_ingredient_ids ?? [],
        dislikedCategories: data.disliked_categories ?? [], allowedExceptions: data.allowed_exceptions ?? [],
        nationality: data.nationality ?? undefined, createdAt: data.created_at, updatedAt: data.updated_at, lastRecalibration: data.last_recalibration,
      },
      weekPlanning,
    });
  },

  'GET week-planning': async (_req, res, auth) => {
    const { data, error } = await getSupabase()
      .from('user_profiles')
      .select('week_planning')
      .eq('user_id', auth.userId)
      .maybeSingle();
    if (error) return res.status(500).json({ error: 'Error al leer rutina semanal' });
    const wp = data?.week_planning;
    const weekPlanning =
      wp && typeof wp === 'object' && typeof (wp as { completedAt?: string }).completedAt === 'string'
        ? wp
        : null;
    return res.status(200).json({ weekPlanning });
  },

  'PUT week-planning': async (req, res, auth) => {
    const { weekPlanning } = req.body ?? {};
    if (!weekPlanning || typeof weekPlanning.completedAt !== 'string') {
      return res.status(400).json({ error: 'Rutina semanal incompleta' });
    }
    const supabase = getSupabase();
    const { data: existing } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('user_id', auth.userId)
      .maybeSingle();
    if (!existing) {
      return res.status(400).json({ error: 'Creá tu perfil nutricional primero' });
    }
    const { error } = await supabase
      .from('user_profiles')
      .update({
        week_planning: weekPlanning,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', auth.userId);
    if (error) {
      console.error('PUT week-planning error:', error.message);
      return res.status(500).json({ error: 'Error al guardar rutina semanal' });
    }
    return res.status(200).json({ ok: true });
  },

  'PUT profile': async (req, res, auth) => {
    const reqId = randomUUID();
    const { profile } = req.body;
    if (!profile) return res.status(400).json({ error: 'Perfil requerido' });

    const heightCm = Number(profile.heightCm);
    const weightKg = Number(profile.weightKg);
    if (!profile.name || !profile.birthDate || !profile.sex || !Number.isFinite(heightCm) || !Number.isFinite(weightKg)) {
      return res.status(400).json({ error: 'Datos de perfil incompletos' });
    }

    const now = new Date().toISOString();
    const payload = {
      user_id: auth.userId,
      profile_id: String(profile.id ?? auth.userId),
      name: String(profile.name).trim(),
      birth_date: String(profile.birthDate),
      sex: String(profile.sex),
      height_cm: heightCm,
      weight_kg: weightKg,
      activity_level: profile.activityLevel ?? 'moderate',
      goal: profile.goal ?? 'maintain',
      restrictions: profile.restrictions ?? [],
      disliked_ingredient_ids: profile.dislikedIngredientIds ?? [],
      disliked_categories: profile.dislikedCategories ?? [],
      allowed_exceptions: profile.allowedExceptions ?? [],
      nationality: profile.nationality ?? null,
      created_at: profile.createdAt ?? now,
      updated_at: profile.updatedAt ?? now,
      last_recalibration: profile.lastRecalibration ?? now,
    };

    const { error } = await getSupabase().from('user_profiles').upsert(
      {
        ...payload,
      },
      { onConflict: 'user_id' },
    );

    if (error) {
      console.error('PUT profile error:', {
        reqId,
        userId: auth.userId,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        payloadSummary: {
          profileId: payload.profile_id,
          sex: payload.sex,
          activityLevel: payload.activity_level,
          goal: payload.goal,
          nationality: payload.nationality,
          restrictionsCount: Array.isArray(payload.restrictions) ? payload.restrictions.length : -1,
          dislikedIngredientIdsCount: Array.isArray(payload.disliked_ingredient_ids)
            ? payload.disliked_ingredient_ids.length
            : -1,
          dislikedCategoriesCount: Array.isArray(payload.disliked_categories)
            ? payload.disliked_categories.length
            : -1,
          allowedExceptionsCount: Array.isArray(payload.allowed_exceptions)
            ? payload.allowed_exceptions.length
            : -1,
        },
      });
      const showDbDetails = exposeDbErrors();
      return res.status(500).json({
        error: 'Error al guardar perfil',
        reqId,
        ...(showDbDetails
          ? {
              dbCode: error.code ?? null,
              dbMessage: error.message ?? null,
            }
          : {}),
      });
    }

    const supabase = getSupabase();
    const { data: latestCheckIn, error: checkInReadError } = await supabase
      .from('body_check_ins')
      .select('weight_kg')
      .eq('user_id', auth.userId)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (checkInReadError) {
      return res.status(500).json({
        error: 'Perfil guardado, pero no se pudo leer su historial de progreso',
        ...(exposeDbErrors() ? { dbMessage: checkInReadError.message } : {}),
      });
    }

    const needsCheckIn =
      !latestCheckIn ||
      Math.abs(Number(latestCheckIn.weight_kg) - weightKg) > 0.001;
    if (needsCheckIn) {
      const { error: checkInError } = await supabase.from('body_check_ins').insert({
        id: randomUUID(),
        user_id: auth.userId,
        weight_kg: weightKg,
        period_experience: null,
        source: latestCheckIn ? 'profile' : 'onboarding',
        recorded_at: latestCheckIn ? now : (profile.createdAt ?? now),
      });
      if (checkInError) {
        return res.status(500).json({
          error: 'Perfil guardado, pero no se pudo actualizar su historial de progreso',
          ...(exposeDbErrors() ? { dbMessage: checkInError.message } : {}),
        });
      }
    }

    console.log('PUT profile ok:', JSON.stringify({
      reqId,
      userId: auth.userId,
      profileId: payload.profile_id,
      nationality: payload.nationality,
      updatedAt: payload.updated_at,
    }));
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
    if (error && error.code === 'PGRST116') return res.status(200).json({ settings: { theme: 'dark', showCalories: false, useGrams: false } });
    if (error) return res.status(500).json({ error: 'Error al leer ajustes' });
    return res.status(200).json({ settings: { theme: data.theme ?? 'dark', showCalories: data.show_calories ?? false, useGrams: data.use_grams ?? false } });
  },
  'PUT settings': async (req, res, auth) => {
    const { theme, showCalories, useGrams } = req.body ?? {};
    const supabase = getSupabase();

    const { data: existing } = await supabase
      .from('user_settings')
      .select('theme, show_calories, use_grams')
      .eq('user_id', auth.userId)
      .maybeSingle();

    const merged = {
      user_id: auth.userId,
      theme: theme ?? existing?.theme ?? 'dark',
      show_calories: showCalories ?? existing?.show_calories ?? false,
      use_grams: useGrams ?? existing?.use_grams ?? false,
    };

    let { error } = await supabase.from('user_settings').upsert(merged);

    // Column may not exist yet — save other settings without failing the toggle
    if (error && typeof error.message === 'string' && error.message.includes('use_grams')) {
      const withoutUseGrams = {
        user_id: merged.user_id,
        theme: merged.theme,
        show_calories: merged.show_calories,
      };
      const retry = await supabase.from('user_settings').upsert(withoutUseGrams);
      error = retry.error;
    }

    if (error) {
      console.error('PUT settings error:', error.message, error.code);
      return res.status(500).json({ error: 'Error al guardar ajustes', dbMessage: error.message });
    }
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
  if (s[0] === 'chat' && s[1] === 'conversations' && s[2] && s[3] === 'messages') {
    s[2] = ':id';
  } else if (s[0] === 'chat' && s[1] === 'conversations' && s[2] && !s[3]) {
    s[2] = ':id';
  }

  return routeKey(method, s);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return withAuth(req, res, async (auth, segments) => {
    const key = normalizeKey(req.method, segments);
    console.log('[business] route_resolved', JSON.stringify({
      method: req.method,
      url: req.url,
      segments,
      key,
    }));
    const handlerFn = handlers[key];
    if (!handlerFn) {
      console.warn('[business] route_not_found', JSON.stringify({
        method: req.method,
        url: req.url,
        segments,
        key,
      }));
      return res.status(404).json({ error: 'Route not found', key });
    }
    return handlerFn(req, res, auth, segments);
  });
}
