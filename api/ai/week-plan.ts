import { randomUUID } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken } from '../_lib/jwt.js';
import { getSupabase } from '../_lib/supabase.js';
import { assertUnderDailyAiLimit, recordSuccessfulAiChat } from '../_lib/rateLimit.js';
import { chatApiLog, chatApiLogError, redactUserId } from '../_lib/chatFlowLog.js';
import { GeminiTextGenerator } from '../_lib/ai/geminiTextGenerator.js';
import { RetryingTextGenerator } from '../_lib/ai/retryingTextGenerator.js';
import { getGenerationTelemetry } from '../_lib/observability/bootstrap.js';
import { AiProviderError } from '../_lib/observability/errors.js';
import type { GenerationTracker } from '../_lib/observability/types.js';
import {
  generateWeekPlanOneShot,
  WEEK_PLAN_ALGORITHM_VERSION,
  WEEK_PLAN_BUSINESS_RULES_VERSION,
  WEEK_PLAN_MODEL,
  WEEK_PLAN_PROMPT_VERSION,
} from '../_lib/weekPlanGenerate.js';
import { getActiveMealSlots, type MetabolicProfile } from '../_lib/metabolic.js';
import type { WeekPlanningInput } from '../_lib/weekPlanPrompts.js';
import type { GemProfile } from '../_lib/gemini.js';
import { isGeminiTransientError } from '../_lib/geminiRetry.js';

interface WeekPlanRequestBody {
  weekDates: string[];
  weekPlanning: WeekPlanningInput;
  weeklyPoolPrompt: string;
  forbiddenDishNames?: string[];
  dishMemory?: {
    explicitAvoids?: string[];
    recentConsumedDishes?: string[];
    rotationHints?: string[];
  };
  variationSeed?: string;
}

async function fetchProfile(userId: string): Promise<GemProfile & { metabolic?: MetabolicProfile }> {
  const supabase = getSupabase();
  const { data: row } = await supabase
    .from('user_profiles')
    .select(
      'name, nationality, restrictions, birth_date, sex, height_cm, weight_kg, activity_level, goal',
    )
    .eq('user_id', userId)
    .maybeSingle();

  if (!row) return { name: undefined, nationality: undefined, restrictions: [] };

  const metabolic: MetabolicProfile = {
    birthDate: String(row.birth_date),
    sex: row.sex as MetabolicProfile['sex'],
    heightCm: Number(row.height_cm),
    weightKg: Number(row.weight_kg),
    activityLevel: row.activity_level as MetabolicProfile['activityLevel'],
    goal: row.goal as MetabolicProfile['goal'],
  };

  return {
    name: typeof row.name === 'string' ? row.name : undefined,
    nationality: typeof row.nationality === 'string' ? row.nationality : undefined,
    restrictions: Array.isArray(row.restrictions) ? (row.restrictions as string[]) : [],
    metabolic,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const reqId = randomUUID();
  const requestStartedAtMs = Date.now();
  let tracker: GenerationTracker | undefined;

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authorization' });
    }

    let userId: string;
    try {
      userId = verifyToken(authHeader.slice(7)).sub;
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const body = req.body as WeekPlanRequestBody;
    if (!body.weekDates?.length || !body.weekPlanning || !body.weeklyPoolPrompt) {
      return res.status(400).json({ error: 'Missing week plan context' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error: 'config',
        text: 'El asistente no está configurado en el servidor.',
      });
    }

    tracker = getGenerationTelemetry().start({
      generationId: randomUUID(),
      requestId: reqId,
      userId,
      operation: 'week_plan',
      provider: 'gemini',
      requestStartedAtMs,
      recipe: {
        promptVersion: WEEK_PLAN_PROMPT_VERSION,
        model: WEEK_PLAN_MODEL,
        businessRulesVersion: WEEK_PLAN_BUSINESS_RULES_VERSION,
        algorithmVersion: WEEK_PLAN_ALGORITHM_VERSION,
        deploymentVersion: process.env.VERCEL_GIT_COMMIT_SHA
          ?? process.env.GIT_SHA
          ?? 'local',
      },
    });

    const rateAssertion = await tracker.stage(
      'rate_limit',
      () => assertUnderDailyAiLimit(userId),
    );
    if (!rateAssertion.allowed) {
      await tracker.fail(new AiProviderError('NutriKal daily AI limit reached', {
        category: 'rate_limit',
        code: 'application_rate_limit',
        retryable: false,
      }));
      return res.status(429).json({
        error: 'rate_limit',
        text: '¡Uy! Ya usaste todos tus mensajes de hoy. Volvé mañana.',
        remaining: 0,
      });
    }

    const profile = await tracker.stage('read_profile', () => fetchProfile(userId));
    const activeSlots = getActiveMealSlots(body.weekPlanning.mealPattern);

    const weekPlanningInput: WeekPlanningInput = {
      ...body.weekPlanning,
      activeSlots,
    };

    chatApiLog(reqId, 'week_plan_start', {
      user: redactUserId(userId),
      days: body.weekDates.length,
      rhythm: body.weekPlanning.mealRhythmMode,
    });

    const generator = new RetryingTextGenerator(new GeminiTextGenerator(), tracker);
    const { skeleton, rawDishes } = await generateWeekPlanOneShot(
      {
        profile,
        weekPlanning: weekPlanningInput,
        weeklyPoolPrompt: body.weeklyPoolPrompt,
        forbiddenDishNames: body.forbiddenDishNames ?? [],
        dishMemory: body.dishMemory
          ? {
              explicitAvoids: body.dishMemory.explicitAvoids ?? [],
              recentConsumedDishes: body.dishMemory.recentConsumedDishes ?? [],
              rotationHints: body.dishMemory.rotationHints ?? [],
            }
          : undefined,
        weekDates: body.weekDates,
        variationSeed: body.variationSeed,
      },
      { generator, tracker },
    );

    let remainingOut: number;
    try {
      remainingOut = (await tracker.stage(
        'record_usage',
        () => recordSuccessfulAiChat(userId),
      )).remaining;
    } catch {
      remainingOut = Math.max(0, rateAssertion.remaining - 1);
    }

    chatApiLog(reqId, 'week_plan_done', {
      user: redactUserId(userId),
      templates: Object.keys(rawDishes).length,
      remaining: remainingOut,
    });

    const telemetryRecord = await tracker.complete();
    const exposeDebug = process.env.NODE_ENV !== 'production'
      || process.env.AI_OBSERVABILITY_EXPOSE_DEBUG === 'true';
    return res.status(200).json({
      skeleton,
      rawDishes,
      text: 'Tu semana está lista para revisar.',
      remaining: remainingOut,
      observability: exposeDebug && telemetryRecord
        ? {
            requestId: telemetryRecord.context.requestId,
            operation: telemetryRecord.context.operation,
            stages: telemetryRecord.stages.map((stage) => ({
              name: stage.name,
              durationMs: stage.durationMs,
              success: stage.success,
            })),
            inputTokens: telemetryRecord.usage.inputTokens,
            outputTokens: telemetryRecord.usage.outputTokens,
            totalTokens: telemetryRecord.usage.totalTokens,
            totalCostUsd: telemetryRecord.totalCostUsd ?? null,
            totalDurationMs: telemetryRecord.totalDurationMs,
          }
        : undefined,
    });
  } catch (err) {
    await tracker?.fail(err);
    chatApiLogError(reqId, 'week_plan_error', err);
    if (isGeminiTransientError(err)) {
      return res.status(503).json({
        error: 'model_busy',
        text: 'El servicio de IA está con mucha demanda ahora. Esperá un minuto y probá de nuevo.',
      });
    }
    return res.status(500).json({
      error: 'internal',
      text: 'No pude armar tu semana ahora. Probá de nuevo en un momento.',
    });
  }
}
