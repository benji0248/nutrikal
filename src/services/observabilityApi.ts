const JWT_KEY = 'nutrikal-jwt';

export class ObservabilityApiError extends Error {
  readonly status: number;

  constructor(
    message: string,
    status: number,
  ) {
    super(message);
    this.name = 'ObservabilityApiError';
    this.status = status;
  }
}

export interface ObservabilityTotals {
  requests: number;
  averageDurationMs: number;
  totalCostUsd: number;
  totalTokens: number;
  errorRate: number;
  invalidJsonRate: number;
}

export interface DailyMetric {
  day: string;
  operation: string;
  provider: string;
  model: string;
  requests: number;
  errors: number;
  averageDurationMs: number;
  p95DurationMs: number;
  p99DurationMs: number;
  totalTokens: number;
  totalCostUsd: number;
}

export interface StageMetric {
  day: string;
  operation: string;
  provider: string;
  model: string;
  stage: string;
  executions: number;
  averageDurationMs: number;
  p95DurationMs: number;
  p99DurationMs: number;
  errors: number;
}

export interface ObservabilitySummary {
  range: { from: string; to: string };
  totals: ObservabilityTotals;
  daily: DailyMetric[];
  stages: StageMetric[];
}

export interface GenerationSummary {
  id: string;
  requestId: string;
  userId: string;
  user: { displayName: string; email: string } | null;
  operation: string;
  provider: string;
  model: string;
  recipe: Record<string, string | undefined>;
  status: 'completed' | 'failed';
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  usageEstimated: boolean;
  totalCostUsd: number | null;
  retryCount: number;
  startedAt: string;
  completedAt: string;
  totalDurationMs: number;
  errorCategory: string | null;
  errorCode: string | null;
}

export interface GenerationDetail {
  generation: GenerationSummary;
  stages: Array<{
    sequence: number;
    stage: string;
    durationMs: number;
    success: boolean;
    attributes: Record<string, unknown>;
    errorCategory: string | null;
    errorCode: string | null;
  }>;
  attempts: Array<{
    attempt: number;
    provider: string;
    model: string;
    durationMs: number;
    success: boolean;
    usage: Record<string, number | boolean>;
    finishReason: string | null;
    errorCategory: string | null;
    errorCode: string | null;
  }>;
  quality: Array<{
    name: string;
    value: boolean | number | string | null;
    status: 'pass' | 'fail' | 'unknown' | null;
    expected: string | null;
    actual: string | null;
    unit: string | null;
    evaluator: string;
    evaluatorVersion: string;
    source: string;
    details: Record<string, unknown>;
  }>;
  payloads: Array<{
    type: string;
    hash: string;
    sizeBytes: number;
    expiresAt: string | null;
    content?: string;
    decryptionError?: string;
  }>;
  payloadInspectionEnabled: boolean;
}

interface RawGeneration {
  id: string;
  request_id: string;
  user_id: string;
  user: { displayName: string; email: string } | null;
  operation: string;
  provider: string;
  model: string;
  recipe: Record<string, string | undefined>;
  status: 'completed' | 'failed';
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  usage_estimated: boolean;
  total_cost_usd: number | string | null;
  retry_count: number;
  started_at: string;
  completed_at: string;
  total_duration_ms: number | string;
  error_category: string | null;
  error_code: string | null;
}

function number(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function request<T>(params: URLSearchParams): Promise<T> {
  const token = localStorage.getItem(JWT_KEY);
  const response = await fetch(`/api/admin/observability?${params.toString()}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: 'no-store',
  });
  const data = await response.json() as T & { error?: string };
  if (!response.ok) {
    throw new ObservabilityApiError(data.error ?? 'No se pudo cargar observabilidad', response.status);
  }
  return data;
}

function mapGeneration(row: RawGeneration): GenerationSummary {
  return {
    id: row.id,
    requestId: row.request_id,
    userId: row.user_id,
    user: row.user,
    operation: row.operation,
    provider: row.provider,
    model: row.model,
    recipe: row.recipe ?? {},
    status: row.status,
    inputTokens: number(row.input_tokens),
    outputTokens: number(row.output_tokens),
    totalTokens: number(row.total_tokens),
    usageEstimated: row.usage_estimated,
    totalCostUsd: row.total_cost_usd == null ? null : number(row.total_cost_usd),
    retryCount: number(row.retry_count),
    startedAt: row.started_at,
    completedAt: row.completed_at,
    totalDurationMs: number(row.total_duration_ms),
    errorCategory: row.error_category,
    errorCode: row.error_code,
  };
}

export async function checkObservabilityAccess(): Promise<void> {
  await request(new URLSearchParams({ action: 'access' }));
}

export async function fetchObservabilitySummary(days: number): Promise<ObservabilitySummary> {
  const to = new Date();
  const from = new Date(to.getTime() - (days - 1) * 86_400_000);
  from.setHours(0, 0, 0, 0);
  const raw = await request<{
    range: { from: string; to: string };
    totals: ObservabilityTotals;
    daily: Array<Record<string, unknown>>;
    stages: Array<Record<string, unknown>>;
  }>(new URLSearchParams({
    action: 'summary',
    from: from.toISOString(),
    to: to.toISOString(),
  }));
  return {
    range: raw.range,
    totals: raw.totals,
    daily: raw.daily.map((row) => ({
      day: String(row.day),
      operation: String(row.operation),
      provider: String(row.provider),
      model: String(row.model),
      requests: number(row.requests),
      errors: number(row.errors),
      averageDurationMs: number(row.average_duration_ms),
      p95DurationMs: number(row.p95_duration_ms),
      p99DurationMs: number(row.p99_duration_ms),
      totalTokens: number(row.total_tokens),
      totalCostUsd: number(row.total_cost_usd),
    })),
    stages: raw.stages.map((row) => ({
      day: String(row.day),
      operation: String(row.operation),
      provider: String(row.provider),
      model: String(row.model),
      stage: String(row.stage),
      executions: number(row.executions),
      averageDurationMs: number(row.average_duration_ms),
      p95DurationMs: number(row.p95_duration_ms),
      p99DurationMs: number(row.p99_duration_ms),
      errors: number(row.errors),
    })),
  };
}

export async function fetchGenerations(options: {
  offset?: number;
  limit?: number;
  status?: string;
  provider?: string;
  search?: string;
} = {}): Promise<{
  generations: GenerationSummary[];
  total: number;
  offset: number;
  limit: number;
}> {
  const params = new URLSearchParams({
    action: 'generations',
    offset: String(options.offset ?? 0),
    limit: String(options.limit ?? 25),
  });
  if (options.status) params.set('status', options.status);
  if (options.provider) params.set('provider', options.provider);
  if (options.search) params.set('search', options.search);
  const raw = await request<{
    generations: RawGeneration[];
    total: number;
    offset: number;
    limit: number;
  }>(params);
  return { ...raw, generations: raw.generations.map(mapGeneration) };
}

export async function fetchGenerationDetail(id: string): Promise<GenerationDetail> {
  const raw = await request<{
    generation: RawGeneration;
    stages: Array<Record<string, unknown>>;
    attempts: Array<Record<string, unknown>>;
    quality: Array<Record<string, unknown>>;
    payloads: GenerationDetail['payloads'];
    payloadInspectionEnabled: boolean;
  }>(new URLSearchParams({ action: 'detail', id }));
  return {
    generation: mapGeneration(raw.generation),
    stages: raw.stages.map((stage) => ({
      sequence: number(stage.sequence),
      stage: String(stage.stage),
      durationMs: number(stage.duration_ms),
      success: Boolean(stage.success),
      attributes: (stage.attributes ?? {}) as Record<string, unknown>,
      errorCategory: stage.error_category == null ? null : String(stage.error_category),
      errorCode: stage.error_code == null ? null : String(stage.error_code),
    })),
    attempts: raw.attempts.map((attempt) => ({
      attempt: number(attempt.attempt),
      provider: String(attempt.provider),
      model: String(attempt.model),
      durationMs: number(attempt.duration_ms),
      success: Boolean(attempt.success),
      usage: (attempt.usage ?? {}) as Record<string, number | boolean>,
      finishReason: attempt.finish_reason == null ? null : String(attempt.finish_reason),
      errorCategory: attempt.error_category == null ? null : String(attempt.error_category),
      errorCode: attempt.error_code == null ? null : String(attempt.error_code),
    })),
    quality: raw.quality.map((metric) => ({
      name: String(metric.metric_name),
      value: metric.boolean_value != null
        ? Boolean(metric.boolean_value)
        : metric.numeric_value != null
          ? number(metric.numeric_value)
          : metric.text_value == null ? null : String(metric.text_value),
      status: metric.status as GenerationDetail['quality'][number]['status'],
      expected: metric.expected_value == null ? null : String(metric.expected_value),
      actual: metric.actual_value == null ? null : String(metric.actual_value),
      unit: metric.unit == null ? null : String(metric.unit),
      evaluator: String(metric.evaluator),
      evaluatorVersion: String(metric.evaluator_version),
      source: String(metric.source),
      details: (metric.details ?? {}) as Record<string, unknown>,
    })),
    payloads: raw.payloads,
    payloadInspectionEnabled: raw.payloadInspectionEnabled,
  };
}
