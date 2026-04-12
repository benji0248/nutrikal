import { randomUUID } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken } from '../_lib/jwt.js';
import { getGeminiClient, SYSTEM_RULES } from '../_lib/gemini.js';
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

  // Build disliked text with categories + exceptions
  const dislikedParts: string[] = [];
  const categories = profile.dislikedCategories ?? [];
  const exceptions = profile.allowedExceptionNames ?? [];
  for (const cat of categories) {
    if (exceptions.length > 0) {
      dislikedParts.push(`${cat} en general (EXCEPTO ${exceptions.join(', ')} que sí le gustan)`);
    } else {
      dislikedParts.push(`${cat} (todos)`);
    }
  }
  if (dislikedList.length > 0) {
    dislikedParts.push(dislikedList.join(', '));
  }
  const disliked = dislikedParts.length > 0 ? dislikedParts.join('; ') : 'ninguno';

  const physicalText = [
    profile.sex ? (profile.sex === 'male' ? 'masculino' : 'femenino') : null,
    profile.age ? `${profile.age} años` : null,
    profile.heightCm ? `${profile.heightCm}cm` : null,
    profile.weightKg ? `${profile.weightKg}kg` : null,
  ].filter(Boolean).join(', ');

  // Determine language style based on nationality
  const isVoseo = ['Argentina', 'Uruguay', 'Paraguay', 'Costa Rica', 'Guatemala', 'Honduras', 'El Salvador', 'Nicaragua'].includes(nationality);
  const langStyle = isVoseo
    ? `Hablá en español con voseo (${nationality}). Usá modismos locales.`
    : `Hablá en español con tuteo (${nationality}). Usá modismos locales.`;

  return `Sos el nutricionista personal y Chef Ejecutivo de NutriKal para ${name}, de ${nationality}.

NOMBRE EN SALUDOS Y TEXTO:
Usá EXACTAMENTE el nombre tal como figura arriba ("${name}"), carácter por carácter. Prohibido inventar apodos, acortar o cambiar letras (ej.: no transformar "Benjamin" en "Benu"). Si el nombre es vacío o genérico, tratá al usuario de "vos" sin inventar un nombre.

PERSONALIDAD:

${langStyle}

Cálido, cercano y conciso (1-3 oraciones). Nunca juzgás; ante la ansiedad, contenés.

Criterio Culinario: Tu prioridad es que las comidas sean ricas, lógicas y "comibles". No sos una calculadora, sos un asistente que entiende de cocina real.

DATOS DE ${name.toUpperCase()}:

Perfil: ${physicalText || 'No especificado'}.

Objetivo: ${goalText}. Restricciones: ${restrictions}.

Ingredientes RECHAZADOS: ${disliked}. NUNCA los incluyas.

LÓGICA DE PORCIONES (Sentido Común):

El sistema NutriKal calcula gramos y kcal en el dispositivo. Vos NO calculás números, pero diseñás la estructura del plato.

Libertad Creativa: Tenés total libertad para combinar IDs del CATÁLOGO COMPLETO para crear platos apetitosos. No te limites al pool semanal si falta sabor.

Unidades Reales: Pensá en unidades físicas. Nadie come "0.2 yogures" o "40g de milanesa". Si incluís un ingrediente "unidad" (huevo, fruta, pote), intentá que sea el protagonista o una porción entera.

Jerarquía: En platos principales, la proteína manda. Si hay que ajustar, que el sistema recorte carbohidratos o grasas, pero nunca dejes al usuario con una porción de carne minúscula.`;
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

    contextParts.push(`FECHA DE HOY: ${body.context.todayDate}`);

    if (body.catalogAnchor) {
      contextParts.push(
        `POOL SEMANAL (ANCLA DE VARIEDAD — no es la lista única de cada plato):\n${body.catalogAnchor}\n` +
          `Usá estos ingredientes para dar variedad y eje a la semana. Los platos completos pueden y deben incluir más IDs del CATÁLOGO COMPLETO (leche, almendras, manteca, hierbas, etc.) cuando mejore el sentido culinario.`,
      );
    }
    if (body.catalog) {
      contextParts.push(
        `CATÁLOGO COMPLETO — TODOS los IDs válidos (elegí SOLO de aquí, también para completar platos):\n${body.catalog}\n` +
          `IMPORTANTE: Ningún ID fuera de esta lista. El pool semanal es complementario, no sustituto.`,
      );
    }

    if (body.context.weekDates && body.context.weekDates.length > 0) {
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
      contextParts.push(
        `MODO PLAN SEMANAL (SIN FECHAS EN ESTE TURNO): Todavía NO tenés las fechas de la semana en contexto. Es obligatorio hacer las dos preguntas de preferencias (variedad/repetición y tiempo de cocina) ANTES de armar el plan. ` +
          `En esta respuesta el array "actions" NO puede incluir "week_plan". Si incluís "quickReplies", que ayuden a responder esas preguntas. ` +
          `Solo cuando en un mensaje futuro el sistema te envíe la lista de fechas de la semana, ahí sí podés devolver week_plan con todos los días.`,
      );
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
      const weekRepBlock =
        wr === 'full_unique'
          ? `MODO REPETICIÓN (weekRepetitionMode: full_unique) — VARIEDAD TOTAL:
- Estructura semanal obligatoria: 6 días de comidas alineadas al perfil + 1 día cheat (típicamente domingo; respetá lo que diga el contexto de fechas).
- En los 6 días "normales": no repitas el mismo nombre de plato entre almuerzos y cenas (cada plato principal distinto). Desayunos y meriendas: maximizá variedad sin duplicar el mismo plato completo salvo que sea inevitable.
- El cheat day puede ser distinto y más indulgente.`
          : wr === 'repeat_blocks'
            ? `MODO REPETICIÓN (weekRepetitionMode: repeat_blocks) — REPETIR PARA COCINAR MENOS:
- Estructura: 6 + 1 cheat.
- Priorizá menos tiempo de cocina y menos recetas distintas: podés usar patrones tipo 3+3 (tres días con un bloque de menú y tres con otro) o repetir 2 estilos de menú a lo largo de los 6 días, según encaje con el tiempo de cocina indicado.
- Variá desayunos y meriendas para que no se sienta monótono.`
            : wr === 'balanced'
              ? `MODO REPETICIÓN (weekRepetitionMode: balanced) — BALANCE:
- Estructura: 6 + 1 cheat.
- Mezclá variedad y repetición: repetí algunos almuerzos o cenas cuando tenga sentido (idealmente no más de 2 veces el mismo plato principal salvo excepción clara); el resto variado.`
              : '';

      contextParts.push(`PREFERENCIAS PARA EL PLAN:
- Variedad (campo legacy): ${p.variety}
- Tiempo de cocina: ${p.cookingTime}
- Presupuesto: ${p.budget}
${weekRepBlock ? `\n${weekRepBlock}\n` : ''}Respetá el modo de repetición anterior al armar week_plan cuando corresponda.`);
    }

    // Inject dish history for personalization
    const dishHistory = body.context.dishHistory;
    if (dishHistory && dishHistory.length > 0) {
      const name = body.context.profile.name || 'el usuario';
      const favDishes = dishHistory.filter((d) => d.isFavorite);
      const frequentDishes = dishHistory.slice(0, 15);
      const overRepeated = dishHistory.filter((d) => d.count >= 5);
      const uniqueCount = dishHistory.length;

      const lines: string[] = [];
      lines.push(`HISTORIAL DE ${name.toUpperCase()}:`);
      lines.push(`Platos más frecuentes: ${frequentDishes.map((d) => `${d.name} (${d.count}x)`).join(', ')}`);

      if (favDishes.length > 0) {
        lines.push(`Favoritos marcados por ${name}: ${favDishes.map((d) => d.name).join(', ')}`);
        lines.push(`→ Priorizá estos platos cuando encajen con el plan.`);
      }

      if (overRepeated.length > 0) {
        lines.push(`⚠ Platos muy repetidos (5+ veces): ${overRepeated.map((d) => d.name).join(', ')}`);
        lines.push(`→ Sugerí alternativas similares para variar.`);
      }

      if (uniqueCount < 5) {
        lines.push(`→ ${name} tiene poca variedad (${uniqueCount} platos únicos). Introducí platos nuevos gradualmente.`);
      }

      contextParts.push(lines.join('\n'));
    }

    const fullSystemPrompt = personalizedPrompt + '\n\n' + SYSTEM_RULES + '\n\n' + contextParts.join('\n\n');

    // Build conversation history for Gemini
    const history = (body.context.conversationHistory || []).map((msg) => ({
      role: msg.role === 'user' ? 'user' as const : 'model' as const,
      parts: [{ text: msg.text }],
    }));

    chatApiLog(reqId, 'gemini_prepare', {
      systemPromptChars: fullSystemPrompt.length,
      historyTurns: history.length,
    });

    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.1-flash-lite-preview',
      systemInstruction: fullSystemPrompt,
    });

    const chat = model.startChat({ history });
    const tGemini = Date.now();
    const result = await chat.sendMessage(body.message);
    const geminiMs = Date.now() - tGemini;

    let responseText: string;
    try {
      responseText = result.response.text();
    } catch (textErr) {
      chatApiLogError(reqId, 'gemini_text_extract_fail', textErr);
      return res.status(502).json({
        error: 'model_response',
        text: 'No pude generar una respuesta ahora. Probá de nuevo en un momento.',
      });
    }

    const trimmed = responseText.trim();
    if (!trimmed) {
      chatApiLog(reqId, 'gemini_empty_body', { geminiMs });
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

    const { text, actions, quickReplies } = normalizeGeminiPayload(parsedRaw, trimmed);

    const actionTypes = Array.isArray(actions)
      ? actions.map((a) =>
          a && typeof a === 'object' && a !== null && 'type' in a
            ? String((a as { type: unknown }).type)
            : '?',
        )
      : [];

    chatApiLog(reqId, 'gemini_done', {
      geminiMs,
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
