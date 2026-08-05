import type { SupabaseClient } from '@supabase/supabase-js';
import type { GenerationRecord, GenerationRepository, QualityMetric } from './types.js';

function qualityValue(metric: QualityMetric): {
  boolean_value: boolean | null;
  numeric_value: number | null;
  text_value: string | null;
} {
  return {
    boolean_value: typeof metric.value === 'boolean' ? metric.value : null,
    numeric_value: typeof metric.value === 'number' ? metric.value : null,
    text_value: typeof metric.value === 'string' ? metric.value : null,
  };
}

export class SupabaseGenerationRepository implements GenerationRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async save(record: GenerationRecord): Promise<void> {
    const { context } = record;
    const { error: generationError } = await this.supabase.from('ai_generations').insert({
      id: context.generationId,
      request_id: context.requestId,
      user_id: context.userId,
      operation: context.operation,
      provider: context.provider,
      model: context.recipe.model,
      recipe: context.recipe,
      schema_version: record.schemaVersion,
      status: record.status,
      input_tokens: record.usage.inputTokens,
      output_tokens: record.usage.outputTokens,
      total_tokens: record.usage.totalTokens,
      usage_estimated: record.usage.estimated,
      usage_lines: record.usageLines,
      total_cost_usd: record.totalCostUsd ?? null,
      retry_count: Math.max(0, record.attempts.length - 1),
      started_at: record.startedAt,
      completed_at: record.completedAt,
      total_duration_ms: record.totalDurationMs,
      error_category: record.error?.category ?? null,
      error_code: record.error?.code ?? null,
    });
    if (generationError) {
      throw new Error(`Generation persistence failed: ${generationError.message}`);
    }

    const writes: PromiseLike<{ error: { message: string } | null }>[] = [];
    if (record.stages.length > 0) {
      writes.push(this.supabase.from('ai_generation_stages').insert(
        record.stages.map((stage, index) => ({
          generation_id: context.generationId,
          sequence: index + 1,
          stage: stage.name,
          duration_ms: stage.durationMs,
          success: stage.success,
          attributes: stage.attributes ?? {},
          error_category: stage.error?.category ?? null,
          error_code: stage.error?.code ?? null,
        })),
      ));
    }
    if (record.attempts.length > 0) {
      writes.push(this.supabase.from('ai_provider_attempts').insert(
        record.attempts.map((attempt) => ({
          generation_id: context.generationId,
          attempt: attempt.attempt,
          provider: attempt.provider,
          model: attempt.model,
          duration_ms: attempt.durationMs,
          success: attempt.success,
          usage: attempt.usage ?? {},
          finish_reason: attempt.finishReason ?? null,
          error_category: attempt.error?.category ?? null,
          error_code: attempt.error?.code ?? null,
        })),
      ));
    }
    if (record.quality.length > 0) {
      writes.push(this.supabase.from('ai_quality_metrics').insert(
        record.quality.map((metric) => ({
          generation_id: context.generationId,
          metric_name: metric.name,
          ...qualityValue(metric),
          status: metric.status ?? null,
          expected_value: metric.expected == null ? null : String(metric.expected),
          actual_value: metric.actual == null ? null : String(metric.actual),
          unit: metric.unit ?? null,
          evaluator: metric.evaluator,
          evaluator_version: metric.evaluatorVersion,
          source: metric.source,
          threshold_version: metric.thresholdVersion ?? null,
          details: metric.details ?? {},
        })),
      ));
    }
    if (record.payloads.length > 0) {
      writes.push(this.supabase.from('ai_generation_payloads').insert(
        record.payloads.map((payload) => ({
          generation_id: context.generationId,
          payload_type: payload.type,
          content_hash: payload.hash,
          size_bytes: payload.sizeBytes,
          encrypted_content: payload.encryptedContent ?? null,
          redaction_version: payload.redactionVersion,
          expires_at: payload.expiresAt ?? null,
        })),
      ));
    }

    const results = await Promise.all(writes);
    const failed = results.find((result) => result.error);
    if (failed?.error) {
      throw new Error(`Generation detail persistence failed: ${failed.error.message}`);
    }
  }
}

export class ConsoleGenerationRepository implements GenerationRepository {
  async save(record: GenerationRecord): Promise<void> {
    console.log('[nutrikal:observability]', JSON.stringify({
      schemaVersion: record.schemaVersion,
      generationId: record.context.generationId,
      requestId: record.context.requestId,
      operation: record.context.operation,
      provider: record.context.provider,
      model: record.context.recipe.model,
      status: record.status,
      totalDurationMs: record.totalDurationMs,
      stages: record.stages.map((stage) => ({
        name: stage.name,
        durationMs: stage.durationMs,
        success: stage.success,
      })),
      attempts: record.attempts.length,
      inputTokens: record.usage.inputTokens,
      outputTokens: record.usage.outputTokens,
      totalTokens: record.usage.totalTokens,
      totalCostUsd: record.totalCostUsd ?? null,
      quality: record.quality.map((metric) => ({
        name: metric.name,
        value: metric.value,
        status: metric.status,
      })),
      errorCategory: record.error?.category ?? null,
      timestamp: record.completedAt,
    }));
  }
}

export class BestEffortGenerationRepository implements GenerationRepository {
  constructor(
    private readonly primary: GenerationRepository | undefined,
    private readonly fallback: GenerationRepository,
  ) {}

  async save(record: GenerationRecord): Promise<void> {
    if (this.primary) {
      try {
        await this.primary.save(record);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('[nutrikal:observability]', JSON.stringify({
          generationId: record.context.generationId,
          persistenceError: message,
          timestamp: new Date().toISOString(),
        }));
      }
    }
    await this.fallback.save(record);
  }
}
