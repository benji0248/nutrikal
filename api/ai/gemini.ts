import { randomUUID } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken } from '../_lib/jwt.js';
import { getGeminiClient, buildSystemPrompt, type GemProfile } from '../_lib/gemini.js';
import { getSupabase } from '../_lib/supabase.js';
import { assertUnderDailyAiLimit, recordSuccessfulAiChat } from '../_lib/rateLimit.js';
import { chatApiLog, chatApiLogError, redactUserId } from '../_lib/chatFlowLog.js';

interface ChatRequestBody {
  message: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
}

interface AiDishIngredient {
  nombre: string;
  rol: string;
  gramos: number;
}

interface AiDishResponse {
  nombre: string;
  ingredientes: AiDishIngredient[];
  preparacion: string;
  tiempo_prep: number;
  tip: string;
}

async function fetchProfile(userId: string): Promise<GemProfile> {
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('user_data')
      .select('data')
      .eq('user_id', userId)
      .maybeSingle();

    const profile = (data?.data as Record<string, unknown>)?.profile as Record<string, unknown> | undefined;
    return {
      nationality: typeof profile?.nationality === 'string' ? profile.nationality : undefined,
      restrictions: Array.isArray(profile?.restrictions) ? profile.restrictions as string[] : undefined,
      name: typeof profile?.name === 'string' ? profile.name : undefined,
    };
  } catch {
    return {};
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const reqId = randomUUID();

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    chatApiLog(reqId, 'request_in', {});

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
    if (!body.message) {
      chatApiLog(reqId, 'bad_request', { reason: 'missing_message' });
      return res.status(400).json({ error: 'Missing message' });
    }

    chatApiLog(reqId, 'body_ok', {
      user: redactUserId(userId),
      messageLen: body.message.length,
      historyLen: body.history?.length ?? 0,
    });

    const profile = await fetchProfile(userId);
    const systemPrompt = buildSystemPrompt(profile);

    chatApiLog(reqId, 'profile_loaded', {
      nationality: profile.nationality ?? 'none',
      restrictions: profile.restrictions?.length ?? 0,
    });

    const model = getGeminiClient().getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const geminiHistory = (body.history ?? []).map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    const tGemini = Date.now();
    const chat = model.startChat({
      systemInstruction: systemPrompt,
      history: geminiHistory,
    });
    const result = await chat.sendMessage(body.message);
    const geminiMs = Date.now() - tGemini;

    const responseText = result.response.text();

    if (!responseText.trim()) {
      chatApiLog(reqId, 'gemini_empty_body', { geminiMs });
      return res.status(502).json({
        error: 'model_response',
        text: 'No pude generar una respuesta ahora. Probá de nuevo en un momento.',
      });
    }

    let dish: AiDishResponse | undefined;
    try {
      dish = JSON.parse(responseText) as AiDishResponse;
    } catch {
      chatApiLog(reqId, 'gemini_json_parse_fail', { geminiMs, chars: responseText.length });
    }

    chatApiLog(reqId, 'gemini_done', {
      geminiMs,
      chars: responseText.length,
      hasDish: !!dish,
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
      hasDish: !!dish,
    });

    return res.status(200).json({
      text: responseText,
      dish: dish ?? undefined,
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
