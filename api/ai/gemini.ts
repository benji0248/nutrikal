import { randomUUID } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken } from '../_lib/jwt.js';
import {
  getGeminiClient,
  buildSystemPrompt,
  extractRecentDishNames,
  GEMINI_GENERATION_CONFIG,
  type GemProfile,
} from '../_lib/gemini.js';
import {
  computeDailyBudget,
  getMealSlotBudget,
  isMealType,
  mealTypeLabel,
  type MetabolicProfile,
} from '../_lib/metabolic.js';
import { getSupabase } from '../_lib/supabase.js';
import { assertUnderDailyAiLimit, recordSuccessfulAiChat } from '../_lib/rateLimit.js';
import { chatApiLog, chatApiLogError, redactUserId } from '../_lib/chatFlowLog.js';
import { isGeminiTransientError, withGeminiRetry } from '../_lib/geminiRetry.js';

interface ChatRequestBody {
  message: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  mealType?: string;
  mealBudgetKcal?: number;
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

interface FetchedProfile extends GemProfile {
  metabolic?: MetabolicProfile;
}

async function fetchProfile(userId: string): Promise<FetchedProfile> {
  try {
    const supabase = getSupabase();

    const { data: row } = await supabase
      .from('user_profiles')
      .select(
        'name, nationality, restrictions, birth_date, sex, height_cm, weight_kg, activity_level, goal',
      )
      .eq('user_id', userId)
      .maybeSingle();

    if (row) {
      const metabolic = hasMetabolicFields(row)
        ? {
            birthDate: String(row.birth_date),
            sex: row.sex as MetabolicProfile['sex'],
            heightCm: Number(row.height_cm),
            weightKg: Number(row.weight_kg),
            activityLevel: row.activity_level as MetabolicProfile['activityLevel'],
            goal: row.goal as MetabolicProfile['goal'],
          }
        : undefined;

      return {
        nationality: typeof row.nationality === 'string' ? row.nationality : undefined,
        restrictions: Array.isArray(row.restrictions) ? (row.restrictions as string[]) : undefined,
        name: typeof row.name === 'string' ? row.name : undefined,
        metabolic,
      };
    }

    const { data: legacy } = await supabase
      .from('user_data')
      .select('data')
      .eq('user_id', userId)
      .maybeSingle();

    const profile = (legacy?.data as Record<string, unknown> | undefined)?.profile as
      | Record<string, unknown>
      | undefined;

    const metabolic = profile && hasMetabolicFieldsFromLegacy(profile)
      ? {
          birthDate: String(profile.birthDate),
          sex: profile.sex as MetabolicProfile['sex'],
          heightCm: Number(profile.heightCm),
          weightKg: Number(profile.weightKg),
          activityLevel: profile.activityLevel as MetabolicProfile['activityLevel'],
          goal: profile.goal as MetabolicProfile['goal'],
        }
      : undefined;

    return {
      nationality: typeof profile?.nationality === 'string' ? profile.nationality : undefined,
      restrictions: Array.isArray(profile?.restrictions) ? (profile.restrictions as string[]) : undefined,
      name: typeof profile?.name === 'string' ? profile.name : undefined,
      metabolic,
    };
  } catch {
    return {};
  }
}

function hasMetabolicFields(row: Record<string, unknown>): boolean {
  return (
    typeof row.birth_date === 'string'
    && (row.sex === 'male' || row.sex === 'female')
    && Number.isFinite(Number(row.height_cm))
    && Number.isFinite(Number(row.weight_kg))
    && typeof row.activity_level === 'string'
    && typeof row.goal === 'string'
  );
}

function hasMetabolicFieldsFromLegacy(profile: Record<string, unknown>): boolean {
  return (
    typeof profile.birthDate === 'string'
    && (profile.sex === 'male' || profile.sex === 'female')
    && Number.isFinite(Number(profile.heightCm))
    && Number.isFinite(Number(profile.weightKg))
    && typeof profile.activityLevel === 'string'
    && typeof profile.goal === 'string'
  );
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
      mealType: body.mealType ?? null,
    });

    const profile = await fetchProfile(userId);
    const recentDishes = extractRecentDishNames(body.history ?? []);

    let mealBudgetKcal: number | undefined;
    let dailyBudgetKcal: number | undefined;
    let mealTypeLabelStr: string | undefined;

    if (body.mealType && isMealType(body.mealType)) {
      mealTypeLabelStr = mealTypeLabel(body.mealType);
      if (typeof body.mealBudgetKcal === 'number' && body.mealBudgetKcal > 0) {
        mealBudgetKcal = Math.round(body.mealBudgetKcal);
      } else if (profile.metabolic) {
        dailyBudgetKcal = computeDailyBudget(profile.metabolic);
        mealBudgetKcal = getMealSlotBudget(dailyBudgetKcal, body.mealType);
      }
    } else if (profile.metabolic && typeof body.mealBudgetKcal === 'number' && body.mealBudgetKcal > 0) {
      mealBudgetKcal = Math.round(body.mealBudgetKcal);
    }

    if (profile.metabolic && dailyBudgetKcal == null) {
      dailyBudgetKcal = computeDailyBudget(profile.metabolic);
    }

    const systemPrompt = buildSystemPrompt(profile, {
      recentDishes,
      mealBudgetKcal,
      mealTypeLabel: mealTypeLabelStr,
      dailyBudgetKcal,
      goal: profile.metabolic?.goal,
    });

    chatApiLog(reqId, 'profile_loaded', {
      nationality: profile.nationality ?? 'none',
      restrictions: profile.restrictions?.length ?? 0,
      recentDishes: recentDishes.length,
      mealBudgetKcal: mealBudgetKcal ?? null,
      dailyBudgetKcal: dailyBudgetKcal ?? null,
    });

    if (!process.env.GEMINI_API_KEY) {
      chatApiLog(reqId, 'gemini_config_missing', {});
      return res.status(503).json({
        error: 'config',
        text: 'El asistente no está configurado en el servidor. Avisale al administrador.',
      });
    }

    const model = getGeminiClient().getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: GEMINI_GENERATION_CONFIG,
    });

    const geminiHistory = (body.history ?? []).map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    const tGemini = Date.now();
    const chat = model.startChat({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      history: geminiHistory,
    });
    const result = await withGeminiRetry(() => chat.sendMessage(body.message), 'gemini_chat');
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
    const message = err instanceof Error ? err.message : 'unknown';
    const isConfig = message.includes('GEMINI_API_KEY') || message.includes('SUPABASE');
    if (isGeminiTransientError(err)) {
      return res.status(503).json({
        error: 'model_busy',
        text: 'El servicio de IA está con mucha demanda ahora. Esperá un minuto y probá de nuevo.',
      });
    }
    return res.status(isConfig ? 503 : 500).json({
      error: isConfig ? 'config' : 'internal',
      text: isConfig
        ? 'El asistente no está disponible ahora. Probá más tarde.'
        : 'Algo salió mal. Intentá de nuevo en unos segundos.',
    });
  }
}
