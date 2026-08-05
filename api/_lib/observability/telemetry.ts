import { performance } from 'node:perf_hooks';
import type { TokenUsage } from '../ai/types.js';
import { classifyError } from './errors.js';
import { capturePayload, readCapturePolicy } from './payloadCapture.js';
import { calculateUsageCost, type PricingCatalog } from './pricing.js';
import type {
  GenerationContext,
  GenerationRecord,
  GenerationRepository,
  GenerationStage,
  GenerationTelemetry,
  GenerationTrace,
  GenerationTraceFactory,
  GenerationTracker,
  Primitive,
  ProviderAttempt,
  QualityMetric,
  PayloadType,
} from './types.js';

const EMPTY_USAGE: TokenUsage = {
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
  estimated: false,
};

export class DefaultGenerationTelemetry implements GenerationTelemetry {
  constructor(
    private readonly repository: GenerationRepository,
    private readonly pricing?: PricingCatalog,
    private readonly traces?: GenerationTraceFactory,
  ) {}

  start(context: GenerationContext): GenerationTracker {
    return new DefaultGenerationTracker(
      context,
      this.repository,
      this.pricing,
      this.traces?.start(context),
    );
  }
}

class DefaultGenerationTracker implements GenerationTracker {
  private readonly stages = new Array<GenerationRecord['stages'][number]>();
  private readonly attempts = new Array<ProviderAttempt>();
  private readonly quality = new Array<QualityMetric>();
  private readonly payloads = new Array<GenerationRecord['payloads'][number]>();
  private readonly policy = readCapturePolicy();
  private finalized = false;

  constructor(
    private readonly context: GenerationContext,
    private readonly repository: GenerationRepository,
    private readonly pricing?: PricingCatalog,
    private readonly trace?: GenerationTrace,
  ) {}

  async stage<T>(
    name: GenerationStage,
    operation: () => Promise<T> | T,
    attributes?: Record<string, Primitive>,
  ): Promise<T> {
    const started = performance.now();
    try {
      const value = await (this.trace
        ? this.trace.runStage(name, attributes, operation)
        : operation());
      this.stages.push({
        name,
        durationMs: Math.round((performance.now() - started) * 100) / 100,
        success: true,
        attributes,
      });
      return value;
    } catch (error) {
      this.stages.push({
        name,
        durationMs: Math.round((performance.now() - started) * 100) / 100,
        success: false,
        attributes,
        error: classifyError(error),
      });
      throw error;
    }
  }

  recordAttempt(attempt: Omit<ProviderAttempt, 'attempt'>): void {
    this.attempts.push({ ...attempt, attempt: this.attempts.length + 1 });
  }

  recordQuality(metrics: QualityMetric[]): void {
    this.quality.push(...metrics);
  }

  recordPayload(type: PayloadType, value: unknown): void {
    const payload = capturePayload(type, value, this.policy);
    if (payload) this.payloads.push(payload);
  }

  updateRecipe(recipe: Partial<GenerationContext['recipe']>): void {
    Object.assign(this.context.recipe, recipe);
  }

  async complete(): Promise<void> {
    await this.finalize('completed');
  }

  async fail(error: unknown): Promise<void> {
    await this.finalize('failed', classifyError(error));
  }

  private async finalize(
    status: GenerationRecord['status'],
    error?: GenerationRecord['error'],
  ): Promise<void> {
    if (this.finalized) return;
    this.finalized = true;

    const completedAt = new Date();
    let price = null;
    if (this.pricing && this.attempts.length > 0) {
      try {
        price = await this.pricing.find(
          this.context.provider,
          this.context.recipe.model,
          completedAt,
        );
      } catch (pricingError) {
        const message = pricingError instanceof Error ? pricingError.message : String(pricingError);
        console.warn('[nutrikal:observability]', JSON.stringify({
          generationId: this.context.generationId,
          pricingError: message,
          timestamp: completedAt.toISOString(),
        }));
      }
    }

    const cost = calculateUsageCost(this.attempts, price);
    const usage = this.attempts.reduce<TokenUsage>((total, attempt) => {
      if (!attempt.usage) return total;
      return {
        inputTokens: total.inputTokens + attempt.usage.inputTokens,
        outputTokens: total.outputTokens + attempt.usage.outputTokens,
        totalTokens: total.totalTokens + attempt.usage.totalTokens,
        cachedInputTokens: (total.cachedInputTokens ?? 0) + (attempt.usage.cachedInputTokens ?? 0),
        reasoningTokens: (total.reasoningTokens ?? 0) + (attempt.usage.reasoningTokens ?? 0),
        estimated: total.estimated || attempt.usage.estimated,
      };
    }, { ...EMPTY_USAGE });

    try {
      await this.repository.save({
        schemaVersion: 1,
        context: this.context,
        status,
        startedAt: new Date(this.context.requestStartedAtMs).toISOString(),
        completedAt: completedAt.toISOString(),
        totalDurationMs: completedAt.getTime() - this.context.requestStartedAtMs,
        stages: this.stages,
        attempts: this.attempts,
        quality: this.quality,
        payloads: this.payloads,
        usage,
        usageLines: cost.lines,
        totalCostUsd: cost.totalCostUsd,
        error,
      });
    } finally {
      this.trace?.finish(status, error);
    }
  }
}
