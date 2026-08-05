import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireObservabilityAdmin, AdminAuthError } from '../_lib/adminAuth.js';
import { decryptCapturedPayload } from '../_lib/observability/payloadCapture.js';
import { getSupabase } from '../_lib/supabase.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const GENERATION_FIELDS = [
  'id',
  'request_id',
  'user_id',
  'operation',
  'provider',
  'model',
  'recipe',
  'status',
  'input_tokens',
  'output_tokens',
  'total_tokens',
  'usage_estimated',
  'usage_lines',
  'total_cost_usd',
  'retry_count',
  'started_at',
  'completed_at',
  'total_duration_ms',
  'error_category',
  'error_code',
].join(',');

function queryValue(req: VercelRequest, key: string): string | undefined {
  const value = req.query[key];
  return Array.isArray(value) ? value[0] : value;
}

function parseRange(req: VercelRequest): { from: string; to: string } {
  const to = queryValue(req, 'to') ? new Date(queryValue(req, 'to')!) : new Date();
  const from = queryValue(req, 'from')
    ? new Date(queryValue(req, 'from')!)
    : new Date(to.getTime() - 6 * 86_400_000);
  if (!queryValue(req, 'from')) from.setUTCHours(0, 0, 0, 0);
  if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || from > to) {
    throw new RequestError('Invalid date range');
  }
  if (to.getTime() - from.getTime() > 93 * 86_400_000) {
    throw new RequestError('Date range cannot exceed 93 days');
  }
  return { from: from.toISOString(), to: to.toISOString() };
}

class RequestError extends Error {}

function number(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function ensureQuery(error: { message: string } | null, label: string): void {
  if (error) throw new Error(`${label}: ${error.message}`);
}

async function loadSummary(req: VercelRequest) {
  const { from, to } = parseRange(req);
  const supabase = getSupabase();
  const [dailyResult, stageResult, jsonResult, invalidJsonResult] = await Promise.all([
    supabase
      .from('ai_generation_daily_metrics')
      .select('*')
      .gte('day', from)
      .lte('day', to)
      .order('day', { ascending: true }),
    supabase
      .from('ai_stage_daily_metrics')
      .select('*')
      .gte('day', from)
      .lte('day', to)
      .order('day', { ascending: true }),
    supabase
      .from('ai_quality_metrics')
      .select('*', { count: 'exact', head: true })
      .eq('metric_name', 'json.valid')
      .gte('created_at', from)
      .lte('created_at', to),
    supabase
      .from('ai_quality_metrics')
      .select('*', { count: 'exact', head: true })
      .eq('metric_name', 'json.valid')
      .eq('boolean_value', false)
      .gte('created_at', from)
      .lte('created_at', to),
  ]);
  ensureQuery(dailyResult.error, 'Daily metrics query failed');
  ensureQuery(stageResult.error, 'Stage metrics query failed');
  ensureQuery(jsonResult.error, 'Quality metrics query failed');
  ensureQuery(invalidJsonResult.error, 'Invalid JSON metrics query failed');

  const daily = dailyResult.data ?? [];
  const requests = daily.reduce((sum, row) => sum + number(row.requests), 0);
  const errors = daily.reduce((sum, row) => sum + number(row.errors), 0);
  const totalDuration = daily.reduce(
    (sum, row) => sum + number(row.average_duration_ms) * number(row.requests),
    0,
  );

  return {
    range: { from, to },
    totals: {
      requests,
      averageDurationMs: requests > 0 ? totalDuration / requests : 0,
      totalCostUsd: daily.reduce((sum, row) => sum + number(row.total_cost_usd), 0),
      totalTokens: daily.reduce((sum, row) => sum + number(row.total_tokens), 0),
      errorRate: requests > 0 ? errors / requests : 0,
      invalidJsonRate: (jsonResult.count ?? 0) > 0
        ? (invalidJsonResult.count ?? 0) / (jsonResult.count ?? 1)
        : 0,
    },
    daily,
    stages: stageResult.data ?? [],
  };
}

async function loadGenerations(req: VercelRequest) {
  const supabase = getSupabase();
  const limit = Math.min(100, Math.max(1, number(queryValue(req, 'limit')) || 25));
  const offset = Math.max(0, number(queryValue(req, 'offset')));
  const status = queryValue(req, 'status');
  const provider = queryValue(req, 'provider');
  const search = queryValue(req, 'search')?.trim();

  let query = supabase
    .from('ai_generations')
    .select(GENERATION_FIELDS, { count: 'exact' })
    .order('started_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (status === 'completed' || status === 'failed') query = query.eq('status', status);
  if (provider) query = query.eq('provider', provider);
  if (search && UUID_PATTERN.test(search)) {
    query = query.or(`id.eq.${search},request_id.eq.${search},user_id.eq.${search}`);
  }

  const { data, error, count } = await query;
  ensureQuery(error, 'Generation list query failed');
  const rows = data ?? [];
  const userIds = [...new Set(rows.map((row) => String(row.user_id)))];
  const users = userIds.length > 0
    ? await supabase.from('users').select('id, display_name, email').in('id', userIds)
    : { data: [], error: null };
  ensureQuery(users.error, 'Generation users query failed');
  const usersById = new Map(
    (users.data ?? []).map((user) => [String(user.id), {
      displayName: String(user.display_name),
      email: String(user.email),
    }]),
  );

  return {
    generations: rows.map((row) => ({
      ...row,
      user: usersById.get(String(row.user_id)) ?? null,
    })),
    total: count ?? 0,
    offset,
    limit,
  };
}

function canInspectPayloads(): boolean {
  return process.env.AI_OBSERVABILITY_INSPECT_PAYLOADS === 'true'
    && (
      process.env.NODE_ENV !== 'production'
      || process.env.AI_OBSERVABILITY_ALLOW_SENSITIVE === 'true'
    );
}

async function loadGenerationDetail(req: VercelRequest, adminId: string) {
  const id = queryValue(req, 'id');
  if (!id || !UUID_PATTERN.test(id)) throw new RequestError('Invalid generation id');
  const supabase = getSupabase();
  const { data: generation, error } = await supabase
    .from('ai_generations')
    .select(GENERATION_FIELDS)
    .eq('id', id)
    .maybeSingle();
  ensureQuery(error, 'Generation detail query failed');
  if (!generation) return null;

  const [stages, attempts, quality, payloads, user] = await Promise.all([
    supabase.from('ai_generation_stages').select(
      'sequence, stage, duration_ms, success, attributes, error_category, error_code, created_at',
    ).eq('generation_id', id).order('sequence'),
    supabase.from('ai_provider_attempts').select(
      'attempt, provider, model, duration_ms, success, usage, finish_reason, error_category, error_code, created_at',
    ).eq('generation_id', id).order('attempt'),
    supabase.from('ai_quality_metrics').select(
      'metric_name, boolean_value, numeric_value, text_value, status, expected_value, actual_value, unit, evaluator, evaluator_version, source, threshold_version, details, created_at',
    ).eq('generation_id', id).order('created_at'),
    supabase.from('ai_generation_payloads').select(
      'payload_type, content_hash, size_bytes, encrypted_content, redaction_version, expires_at',
    ).eq('generation_id', id),
    supabase.from('users').select('id, display_name, email').eq('id', generation.user_id).maybeSingle(),
  ]);
  for (const [result, label] of [
    [stages, 'Stages'],
    [attempts, 'Attempts'],
    [quality, 'Quality'],
    [payloads, 'Payloads'],
    [user, 'User'],
  ] as const) {
    ensureQuery(result.error, `${label} query failed`);
  }

  const inspectPayloads = canInspectPayloads();
  const safePayloads = (payloads.data ?? []).map((payload) => {
    let content: string | undefined;
    let decryptionError: string | undefined;
    if (inspectPayloads && payload.encrypted_content) {
      try {
        content = decryptCapturedPayload(String(payload.encrypted_content));
      } catch {
        decryptionError = 'Payload could not be decrypted';
      }
    }
    return {
      type: payload.payload_type,
      hash: payload.content_hash,
      sizeBytes: payload.size_bytes,
      redactionVersion: payload.redaction_version,
      expiresAt: payload.expires_at,
      content,
      decryptionError,
    };
  });

  if (safePayloads.some((payload) => payload.content != null)) {
    console.warn('[nutrikal:observability:admin]', JSON.stringify({
      action: 'inspect_sensitive_payloads',
      generationId: id,
      adminId,
      timestamp: new Date().toISOString(),
    }));
  }

  return {
    generation: {
      ...generation,
      user: user.data
        ? { displayName: user.data.display_name, email: user.data.email }
        : null,
    },
    stages: stages.data ?? [],
    attempts: attempts.data ?? [],
    quality: quality.data ?? [],
    payloads: safePayloads,
    payloadInspectionEnabled: inspectPayloads,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store, private');
  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    const admin = requireObservabilityAdmin(req);
    const action = queryValue(req, 'action') ?? 'access';

    if (action === 'access') return res.status(200).json({ allowed: true });
    if (action === 'summary') return res.status(200).json(await loadSummary(req));
    if (action === 'generations') return res.status(200).json(await loadGenerations(req));
    if (action === 'detail') {
      const detail = await loadGenerationDetail(req, admin.sub);
      return detail
        ? res.status(200).json(detail)
        : res.status(404).json({ error: 'Generation not found' });
    }
    return res.status(400).json({ error: 'Unknown action' });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return res.status(error.status).json({ error: error.message });
    }
    if (error instanceof RequestError) {
      return res.status(400).json({ error: error.message });
    }
    const message = error instanceof Error ? error.message : String(error);
    console.error('[nutrikal:observability:admin]', JSON.stringify({
      error: message,
      timestamp: new Date().toISOString(),
    }));
    return res.status(500).json({ error: 'Observability query failed' });
  }
}
