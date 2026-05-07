import { randomUUID } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken } from '../_lib/jwt.js';
import {
  SYSTEM_RULES_CORE,
  WEEK_FLOW_RULES,
  GENERAL_ASSISTANT_RULES,
} from '../_lib/gemini.js';
import { getDeepSeekClient } from '../_lib/deepseek.js';
import { assertUnderDailyAiLimit, recordSuccessfulAiChat } from '../_lib/rateLimit.js';
import { chatApiLog, chatApiLogError, redactUserId } from '../_lib/chatFlowLog.js';

interface ChatRequestBody {
  message: string;
  /** Filtered ingredient catalog (id: name) — todos los IDs válidos */
  catalog?: string;
  /** Pool semanal reducido (ancla de variedad), pre-built on the frontend */
  catalogAnchor?: string;
  context: {
    profile: {
      name: string;
      goal: string;
      restrictions: string[];
      dislikedIds: string[];
      dislikedNames: string[];
      dislikedCategories: string[];
      allowedExceptionNames: string[];
      dailyBudget: number;
      nationality?: string;
      sex?: string;
      heightCm?: number;
      weightKg?: number;
      age?: number;
    };
    todayPlan: unknown | null;
    weekSummary: string | null;
    conversationHistory: Array<{ role: 'user' | 'assistant'; text: string }>;
    todayDate: string;
    weekDates: string[] | null;
    preferences: {
      variety: string;
      cookingTime: string;
      budget: string;
      weekRepetitionMode?: 'full_unique' | 'repeat_blocks' | 'balanced';
    } | null;
    dishHistory?: Array<{ name: string; count: number; lastDate: string; isFavorite: boolean }> | null;
    cuisineDiversityHint?: string | null;
  };
}

const GOAL_TEXT: Record<string, string> = {
  lose: 'perder peso de forma saludable',
  maintain: 'mantener su peso actual',
  gain: 'ganar masa muscular',
};

const RESTRICTION_TEXT: Record<string, string> = {
  vegetarian: 'vegetariano (sin carne ni pescado)',
  vegan: 'vegano (sin productos animales)',
  gluten_free: 'sin gluten (celíaco)',
  lactose_free: 'sin lácteos',
  low_sodium: 'bajo en sodio',
  diabetic: 'apto para diabéticos (bajo índice glucémico)',
};

function buildPersonalizedPrompt(profile: ChatRequestBody['context']['profile']): string {
  const name = profile.name || 'el usuario';
  const nationality = profile.nationality ?? 'Argentina';
  const goalText = GOAL_TEXT[profile.goal] ?? 'mantener su peso actual';

  const restrictions = profile.restrictions.length > 0
    ? profile.restrictions.map((r) => RESTRICTION_TEXT[r] || r).join(', ')
    : 'ninguna';

  const dislikedList = profile.dislikedNames?.length > 0
    ? profile.dislikedNames
    : profile.dislikedIds;

  const dislikedParts: string[] = [];
  const categories = profile.dislikedCategories ?? [];
  const exceptions = profile.allowedExceptionNames ?? [];
  for (const cat of categories) {
    if (exceptions.length > 0) {
      dislikedParts.push(`${cat} (excepto ${exceptions.join(', ')})`);
    } else {
      dislikedParts.push(cat);
    }
  }
  if (dislikedList.length > 0) dislikedParts.push(dislikedList.join(', '));
  const disliked = dislikedParts.length > 0 ? dislikedParts.join('; ') : 'ninguno';

  const isVoseo = ['Argentina', 'Uruguay', 'Paraguay'].includes(nationality);
  const lang = isVoseo ? 'voseo' : 'tuteo';

  return `Nutricionista de ${name}. ${nationality}, hablás con ${lang}.
Objetivo: ${goalText}. Restricciones: ${restrictions}. No usar: ${disliked}.`;
}

function normalizeGeminiPayload(
  parsed: unknown,
  fallbackText: string,
): { text: string; actions: unknown[]; quickReplies: string[] } {
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    const o = parsed as Record<string, unknown>;
    const textRaw = o.text;
    const text =
      typeof textRaw === 'string'
        ? textRaw
        : textRaw !== undefined && textRaw !== null
          ? String(textRaw)
          : fallbackText;
    const actions = Array.isArray(o.actions) ? o.actions : [];
    const qr = o.quickReplies;
    const quickReplies =
      Array.isArray(qr) && qr.every((x) => typeof x === 'string') ? (qr as string[]) : [];
    return { text, actions, quickReplies };
  }
  return { text: fallbackText, actions: [], quickReplies: [] };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const reqId = randomUUID();

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    chatApiLog(reqId, 'request_in', {});

    // Auth
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      chatApiLog(reqId, 'auth_fail', { reason: 'missing_bearer' });
      return res.status(401).json({ error: 'Missing authorization' });
    }

    let userId: string;
    try {
      const payload = verifyToken(authHeader.slice(7));
      userId = payload.sub;
    } catch {
      chatApiLog(reqId, 'auth_fail', { reason: 'invalid_token' });
      return res.status(401).json({ error: 'Invalid token' });
    }

    chatApiLog(reqId, 'auth_ok', { user: redactUserId(userId) });

    const rateAssertion = await assertUnderDailyAiLimit(userId);
    if (!rateAssertion.allowed) {
      chatApiLog(reqId, 'rate_limit_block', { user: redactUserId(userId), remaining: 0 });
      return res.status(429).json({
        error: 'rate_limit',
        text: '¡Uy! Ya usaste todos tus mensajes de hoy. Volvé mañana para seguir charlando.',
        remaining: 0,
      });
    }

    const body = req.body as ChatRequestBody;
    if (!body.message || !body.context) {
      chatApiLog(reqId, 'bad_request', { reason: 'missing_message_or_context' });
      return res.status(400).json({ error: 'Missing message or context' });
    }

    const msgPreview =
      body.message.length > 120 ? `${body.message.slice(0, 120)}…` : body.message;
    chatApiLog(reqId, 'body_ok', {
      user: redactUserId(userId),
      messageLen: body.message.length,
      msgPreview,
      historyLen: body.context.conversationHistory?.length ?? 0,
      weekDatesLen: body.context.weekDates?.length ?? 0,
      catalogLen: body.catalog?.length ?? 0,
      catalogAnchorLen: body.catalogAnchor?.length ?? 0,
      dishHistoryLen: body.context.dishHistory?.length ?? 0,
      hasPreferences: body.context.preferences != null,
    });

    // Build personalized system prompt
    const personalizedPrompt = buildPersonalizedPrompt(body.context.profile);

    // Build situational context
    const contextParts: string[] = [];
    const isWeekPlan = Boolean(body.context.weekDates?.length);
    const hasPool = Boolean(body.catalogAnchor?.trim());
    const hasFull = Boolean(body.catalog?.trim());
    const isLightQuery = !isWeekPlan && !hasFull && hasPool;

    contextParts.push(`FECHA DE HOY: ${body.context.todayDate}`);

    if (isLightQuery) {
      contextParts.push(`INGREDIENTES:\n${body.catalogAnchor}`);
    } else if (hasPool && hasFull) {
      contextParts.push(
        `CANASTA (week_plan):\n${body.catalogAnchor}\n` +
        `CATALOGO (suggest/add/swap):\n${body.catalog}`,
      );
    } else if (hasFull) {
      contextParts.push(`INGREDIENTES:\n${body.catalog}`);
    }

    if (isLightQuery) {
      // Single dish: skip all heavy context (dates, week plan, summary, history, preferences)
      // Only keep today's plan if relevant
    } else if (body.context.weekDates && body.context.weekDates.length > 0) {
      const dates = body.context.weekDates;
      const daysOfWeek = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
      const datesWithDay = dates.map((d) => {
        const dayName = daysOfWeek[new Date(d + 'T12:00:00').getDay()];
        const isCheat = dayName === 'domingo';
        return `${d} (${dayName}${isCheat ? ' — CHEAT DAY' : ''})`;
      });
      contextParts.push(`FECHAS DE LA SEMANA A PLANIFICAR (${dates.length} días):
${datesWithDay.join('\n')}
OBLIGATORIO: el array "days" DEBE tener exactamente ${dates.length} objetos, uno por cada fecha. NO generes solo 1 día.`);
    } else {
      contextParts.push(`Plan semanal no disponible en este turno.`);
    }

    if (body.context.todayPlan) {
      contextParts.push(`PLAN DE HOY:\n${JSON.stringify(body.context.todayPlan)}`);
    }

    if (body.context.weekSummary) {
      contextParts.push(`RESUMEN DE LA SEMANA:\n${body.context.weekSummary}`);
    }

    if (body.context.preferences) {
      const p = body.context.preferences;
      const wr = p.weekRepetitionMode;
      const modeLabel = wr === 'full_unique' ? 'platos distintos cada dia (6+1 cheat)'
        : wr === 'repeat_blocks' ? 'repetir bloques (3+3)'
        : wr === 'balanced' ? 'balance variedad/repeticion'
        : '';
      contextParts.push(`Prefs: variedad=${p.variety} tiempo=${p.cookingTime} presupuesto=${p.budget}${modeLabel ? ' modo=' + modeLabel : ''}`);
    }

    // Inject dish history for personalization
    const dishHistory = body.context.dishHistory;
    if (dishHistory && dishHistory.length > 0) {
      const frequentDishes = dishHistory.slice(0, 10);
      const overRepeated = dishHistory.filter((d) => d.count >= 5);
      const lines: string[] = [];
      lines.push(`Platos frecuentes: ${frequentDishes.map((d) => `${d.name} (${d.count}x)`).join(', ')}.`);
      if (overRepeated.length > 0) {
        lines.push(`Muy repetidos: ${overRepeated.map((d) => d.name).join(', ')} — sugerí alternativas.`);
      }
      contextParts.push(lines.join(' '));
    }

    if (body.context.cuisineDiversityHint) {
      contextParts.push(`DIVERSIDAD CULTURAL: ${body.context.cuisineDiversityHint}`);
    }

    const fullSystemPrompt =
      personalizedPrompt +
      '\n\n' +
      SYSTEM_RULES_CORE +
      '\n\n' +
      (isWeekPlan ? WEEK_FLOW_RULES + '\n\n' : '') +
      GENERAL_ASSISTANT_RULES +
      '\n\n' +
      contextParts.join('\n\n');

    // Build conversation history for Gemini
    const history = (body.context.conversationHistory || []).map((msg) => ({
      role: msg.role === 'user' ? 'user' as const : 'model' as const,
      parts: [{ text: msg.text }],
    }));

    chatApiLog(reqId, 'deepseek_prepare', {
      systemPromptChars: fullSystemPrompt.length,
      historyTurns: history.length,
    });

    const isRawTest = /pollo.*papa.*brocoli.*500\s*(calor[ií]as|kcal)/i.test(body.message) ||
      /pollo.*brocoli.*papa.*500\s*(calor[ií]as|kcal)/i.test(body.message);

    const client = getDeepSeekClient();
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

    if (!isRawTest) {
      messages.push({ role: 'system', content: fullSystemPrompt });
    }
    for (const msg of (body.context.conversationHistory || [])) {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.text,
      });
    }
    messages.push({ role: 'user', content: body.message });

    const modelName = 'deepseek-v4-pro';

    const tDeepSeek = Date.now();
    const result = await client.chat.completions.create({
      model: modelName,
      messages,
      ...(isRawTest ? {} : { response_format: { type: 'json_object' } }),
    });
    const deepseekMs = Date.now() - tDeepSeek;

    const responseText = result.choices?.[0]?.message?.content ?? '';

    // Raw mode: return text directly, no JSON parsing
    if (isRawTest) {
      chatApiLog(reqId, 'deepseek_done', {
        deepseekMs,
        rawChars: responseText.length,
        rawMode: true,
      });
      return res.status(200).json({
        text: responseText,
        actions: [],
        quickReplies: [],
        remaining: rateAssertion.remaining,
      });
    }

    let trimmed = responseText.trim();
    if (!trimmed) {
      chatApiLog(reqId, 'deepseek_empty_body', { deepseekMs });
      return res.status(502).json({
        error: 'model_response',
        text: 'No pude generar una respuesta ahora. Probá de nuevo en un momento.',
      });
    }

    let parsedRaw: unknown;
    let jsonParseOk = false;
    try {
      const cleaned = trimmed
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      parsedRaw = JSON.parse(cleaned);
      jsonParseOk = true;
    } catch {
      parsedRaw = null;
    }

    // Retry once if JSON parse failed
    if (!jsonParseOk) {
      chatApiLog(reqId, 'deepseek_json_retry', { rawChars: trimmed.length });
      try {
        const retryMessages = [...messages, {
          role: 'user' as const,
          content: 'Tu respuesta anterior no fue JSON válido. Respondé SOLO con el JSON, sin markdown ni texto extra.',
        }];
        const retryResult = await client.chat.completions.create({
          model: modelName,
          messages: retryMessages,
          response_format: { type: 'json_object' },
        });
        const retryText = retryResult.choices?.[0]?.message?.content?.trim() ?? '';
        if (retryText) {
          const retryCleaned = retryText
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/\s*```$/i, '')
            .trim();
          parsedRaw = JSON.parse(retryCleaned);
          jsonParseOk = true;
          trimmed = retryText;
          chatApiLog(reqId, 'deepseek_json_retry_ok', { retryChars: retryText.length });
        }
      } catch (retryErr) {
        chatApiLogError(reqId, 'deepseek_json_retry_fail', retryErr);
      }
    }

    const norm = normalizeGeminiPayload(parsedRaw, trimmed);
    const { text, actions } = norm;
    let { quickReplies } = norm;

    // Server-side validation of actions
    const expectedDayCount = body.context.weekDates?.length ?? 0;
    const validIdSet = new Set(
      (body.catalog ?? '').split('\n').map((line: string) => line.split(':')[0]?.trim()).filter(Boolean),
    );
    // Also include catalogAnchor IDs
    if (body.catalogAnchor) {
      for (const line of body.catalogAnchor.split('\n')) {
        const id = line.split(':')[0]?.trim();
        if (id) validIdSet.add(id);
      }
    }

    let totalIngredientIds = 0;
    let invalidIngredientIds = 0;
    const invalidIdSamples: string[] = [];

    function validateDishContractIds(dc: unknown): void {
      if (!dc || typeof dc !== 'object') return;
      const ings = (dc as Record<string, unknown>).ingredientes;
      if (!Array.isArray(ings)) return;
      for (const ing of ings) {
        if (!ing || typeof ing !== 'object') continue;
        const id = (ing as Record<string, unknown>).id;
        if (!id) continue;
        totalIngredientIds++;
        if (!validIdSet.has(String(id))) {
          invalidIngredientIds++;
          if (invalidIdSamples.length < 5) invalidIdSamples.push(String(id));
        }
      }
    }

    for (const action of actions) {
      if (!action || typeof action !== 'object') continue;
      const act = action as Record<string, unknown>;

      if (act.type === 'week_plan' && Array.isArray(act.days)) {
        const dayCount = act.days.length;
        if (expectedDayCount > 0 && dayCount !== expectedDayCount) {
          chatApiLog(reqId, 'week_plan_day_count_mismatch', {
            expected: expectedDayCount,
            got: dayCount,
          });
        }
        for (const day of act.days) {
          if (!day || typeof day !== 'object' || !day.meals) continue;
          for (const meal of Object.values(day.meals)) {
            if (!meal || typeof meal !== 'object') continue;
            validateDishContractIds((meal as Record<string, unknown>).dishContract);
          }
        }
      }

      if ((act.type === 'add_meal' || act.type === 'swap_meal') && act.meal) {
        validateDishContractIds((act.meal as Record<string, unknown>).dishContract);
      }

      if (act.type === 'suggest_meals' && Array.isArray(act.meals)) {
        for (const meal of act.meals) {
          if (meal && typeof meal === 'object') {
            validateDishContractIds((meal as Record<string, unknown>).dishContract);
          }
        }
      }
    }

    if (invalidIngredientIds > 0) {
      chatApiLog(reqId, 'invalid_ingredient_ids', {
        total: totalIngredientIds,
        invalid: invalidIngredientIds,
        samples: invalidIdSamples,
      });
    }

    // Reject if >50% of ingredient IDs are invalid (forces client retry)
    if (totalIngredientIds > 0 && invalidIngredientIds / totalIngredientIds > 0.5) {
      chatApiLog(reqId, 'response_rejected_bad_ids', {
        total: totalIngredientIds,
        invalid: invalidIngredientIds,
        ratio: Math.round((invalidIngredientIds / totalIngredientIds) * 100),
      });
      return res.status(422).json({
        error: 'invalid_dish_data',
        text: 'El plato generado tenía ingredientes inválidos. Intentá de nuevo.',
        invalidIds: invalidIdSamples,
      });
    }

    /** Sin fechas de semana en contexto = fase 1 del plan; las opciones las dibuja la app, no Gemini. */
    if (!body.context.weekDates?.length) {
      quickReplies = [];
    }

    const actionTypes = Array.isArray(actions)
      ? actions.map((a) =>
          a && typeof a === 'object' && a !== null && 'type' in a
            ? String((a as { type: unknown }).type)
            : '?',
        )
      : [];

    chatApiLog(reqId, 'deepseek_done', {
      deepseekMs,
      rawChars: trimmed.length,
      jsonParseOk,
      textOutChars: text.length,
      actionCount: actions.length,
      actionTypes: actionTypes.join(','),
      quickReplyCount: quickReplies.length,
    });

    let remainingOut: number;
    try {
      remainingOut = (await recordSuccessfulAiChat(userId)).remaining;
    } catch (recErr) {
      chatApiLogError(reqId, 'record_usage_fail', recErr);
      remainingOut = Math.max(0, rateAssertion.remaining - 1);
    }

    chatApiLog(reqId, 'response_200', {
      user: redactUserId(userId),
      remaining: remainingOut,
      actionCount: actions.length,
    });

    return res.status(200).json({
      text,
      actions,
      quickReplies,
      remaining: remainingOut,
    });
  } catch (err) {
    chatApiLogError(reqId, 'handler_uncaught', err);
    return res.status(500).json({
      error: 'internal',
      text: 'Algo salió mal. Intentá de nuevo en unos segundos.',
    });
  }
}
